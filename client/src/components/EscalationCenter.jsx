import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchEscalations, resolveEscalation, formatRupees } from '../api/dashboardApi';

function EscalationCenter({ pendingCount, onResolved }) {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const loadEscalations = async () => {
    setLoading(true);
    try {
      const data = await fetchEscalations();
      setEscalations(data);
    } catch (err) {
      console.error('Failed to load escalations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEscalations();
  }, [pendingCount]);

  const handleAction = async (actionId, resolution) => {
    setResolvingId(actionId);
    try {
      await resolveEscalation(actionId, resolution);
      setEscalations((prev) => prev.filter((item) => item._id !== actionId));
      if (onResolved) {
        onResolved();
      }
    } catch (err) {
      console.error('Resolution failed:', err);
      alert('Failed to resolve escalation. Please try again.');
    } finally {
      setResolvingId(null);
    }
  };

  if (escalations.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="glass-panel border-rose-500/30 rounded-xl p-6 mb-8 relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </div>
          <h3 className="font-display text-xl font-bold text-white tracking-tight">
            Human Escalation Command Queue
          </h3>
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
            {escalations.length} Pending Actions
          </span>
        </div>
        <span className="font-mono text-xs text-slate-400 font-medium hidden sm:inline-block">
          🛡️ Compliant Human-in-the-Loop Gateway
        </span>
      </div>

      <p className="text-slate-300 text-sm mb-5 leading-relaxed">
        The AI flagged these high-value, formal notice, or ambiguous cases for authorized human resolution. Choose an intervention to execute:
      </p>

      <div className="space-y-3">
        <AnimatePresence>
          {escalations.map((item) => {
            const amount = item.targetDetails?.amount || item.targetDetails?.cartValue || 0;
            const targetLabel =
              item.targetDetails?.clientName ||
              item.targetDetails?.invoiceNumber ||
              item.targetDetails?.customerId ||
              'Customer Account';
            const isProcessing = resolvingId === item._id;

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-[#12151E] border border-white/[0.08] hover:border-white/[0.16] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2.5 mb-2">
                    <span className="font-mono text-xs uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-white/10 font-medium capitalize">
                      {item.targetType}
                    </span>
                    <span className="font-semibold text-sm text-white">{targetLabel}</span>
                    <span className="font-mono text-sm text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {formatRupees(amount)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <span className="text-amber-400 font-semibold font-mono text-xs mr-1">AI Diagnosis:</span>
                    {item.reasoning}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleAction(item._id, 'approve_incentive')}
                    disabled={isProcessing}
                    className="font-mono text-xs uppercase tracking-wider px-3.5 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition-all font-semibold disabled:opacity-50 shadow-sm"
                  >
                    Approve 5% Settlement
                  </button>

                  <button
                    onClick={() => handleAction(item._id, 'force_retry')}
                    disabled={isProcessing}
                    className="font-mono text-xs uppercase tracking-wider px-3.5 py-2 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-black transition-all font-semibold disabled:opacity-50 shadow-sm"
                  >
                    Authorize Retry
                  </button>

                  <button
                    onClick={() => handleAction(item._id, 'write_off')}
                    disabled={isProcessing}
                    className="font-mono text-xs uppercase tracking-wider px-3.5 py-2 rounded-lg border border-white/15 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all font-medium disabled:opacity-50"
                  >
                    Write Off
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default EscalationCenter;