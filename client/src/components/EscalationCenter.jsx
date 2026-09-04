import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchEscalations, resolveEscalation, formatRupees } from '../api/dashboardApi';
import InfoPopover from './InfoPopover';

function EscalationCenter({ pendingCount, onResolved }) {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const escalationLimits = [
    {  label: 'B2B Aging Thresholds', text: 'Invoices 30+ days overdue (Formal Notice stage) are routed to humans to prevent automated relationship damage.' },
    {  label: 'High-Value Invoices', text: 'Receivables over ₹1,00,000 require finance supervisor sign-off before applying discounts or legal notices.' },
    {  label: 'Graceful Fallback', text: 'Any ambiguous error or payment dispute is safely escalated rather than risking incorrect automated action.' },
  ];

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

  return (
    <div className="dash-card p-5 mb-6">
      {/* Header with Info Popover */}
      <div className="pb-4 mb-4 border-b border-white/[0.08] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h3 className="text-sm font-bold text-white font-display">
              Human Escalation Command Center
            </h3>
            <InfoPopover
              title="Escalation Boundaries"
              description="Situations where autonomous actions are bounded and routed for supervisor authorization."
              items={escalationLimits}
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            High-value, formal notices, or edge cases flagged by AI for supervisor approval.
          </p>
        </div>
        <span className="target-pill target-pill-rose">
          {escalations.length} Pending
        </span>
      </div>

      {/* Escalation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-[#111116] border border-white/[0.08] rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-white/20 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-mono font-bold">
                        {targetLabel.charAt(0)}
                      </div>
                      <span className="font-semibold text-xs text-white truncate max-w-[150px]">
                        {targetLabel}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {formatRupees(amount)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed bg-[#0A0A0D] p-2.5 rounded border border-white/[0.04]">
                    <span className="text-blue-400 font-mono text-[10px] font-semibold mr-1">AI Reason:</span>
                    {item.reasoning}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => handleAction(item._id, 'approve_incentive')}
                    disabled={isProcessing}
                    className="flex-1 font-mono text-[10px] uppercase tracking-wider py-1.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    5% Discount
                  </button>
                  <button
                    onClick={() => handleAction(item._id, 'force_retry')}
                    disabled={isProcessing}
                    className="flex-1 font-mono text-[10px] uppercase tracking-wider py-1.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500 hover:text-white font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    Authorize
                  </button>
                  <button
                    onClick={() => handleAction(item._id, 'write_off')}
                    disabled={isProcessing}
                    className="font-mono text-[10px] uppercase tracking-wider px-2 py-1.5 rounded-md border border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Write Off
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {escalations.length === 0 && !loading && (
        <div className="p-8 text-center text-slate-500 font-mono text-xs">
          ✓ No high-risk escalations pending. All items resolved!
        </div>
      )}
    </div>
  );
}

export default EscalationCenter;