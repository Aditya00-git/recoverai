import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchEscalations, resolveEscalation, formatRupees } from '../api/dashboardApi';

function EscalationCenter({ onResolved }) {
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
  }, []);

  const handleAction = async (actionId, resolution) => {
    setResolvingId(actionId);
    try {
      await resolveEscalation(actionId, resolution);
      // Remove from list optimistically
      setEscalations((prev) => prev.filter((item) => item._id !== actionId));
      if (onResolved) {
        onResolved(); // Refresh parent dashboard ledger totals
      }
    } catch (err) {
      alert('Failed to resolve escalation. Please try again.');
    } finally {
      setResolvingId(null);
    }
  };

  if (escalations.length === 0 && !loading) {
    return null; // Don't show panel if no pending escalations
  }

  return (
    <div className="bg-panel border border-rust-dim/40 rounded-lg p-6 mb-10 overflow-hidden">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-hairline">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-rust animate-ping" />
          <h3 className="font-display text-xl">Human Escalation Queue</h3>
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-rust/20 text-rust font-semibold">
            {escalations.length} Pending Review
          </span>
        </div>
        <p className="font-mono text-[10px] text-paper-dim uppercase tracking-wider hidden sm:block">
          Compliant Human-in-the-Loop Gateway
        </p>
      </div>

      <p className="text-paper-dim text-xs mb-5">
        The AI flagged these high-value, formal, or ambiguous cases for human authorization instead of taking automated action. Select an intervention to execute:
      </p>

      <div className="space-y-4">
        <AnimatePresence>
          {escalations.map((item) => {
            const amount = item.targetDetails?.amount || item.targetDetails?.cartValue || 0;
            const targetLabel =
              item.targetDetails?.clientName ||
              item.targetDetails?.invoiceNumber ||
              item.targetDetails?.customerId ||
              'Customer';
            const isProcessing = resolvingId === item._id;

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-panel-raised border border-hairline/80 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider bg-rust/10 text-rust px-2 py-0.5 rounded capitalize">
                      {item.targetType}
                    </span>
                    <span className="font-medium text-sm text-paper">{targetLabel}</span>
                    <span className="font-mono text-sm text-gold font-semibold ml-auto md:ml-2">
                      {formatRupees(amount)}
                    </span>
                  </div>
                  <p className="text-xs text-paper-dim leading-relaxed">
                    <span className="text-gold font-mono text-[11px]">AI Reason:</span> {item.reasoning}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleAction(item._id, 'approve_incentive')}
                    disabled={isProcessing}
                    className="font-mono text-[10px] uppercase tracking-wider px-3 py-2 rounded bg-mint/15 text-mint border border-mint-dim hover:bg-mint hover:text-ink transition-colors font-medium disabled:opacity-50"
                  >
                    Approve 5% Discount
                  </button>

                  <button
                    onClick={() => handleAction(item._id, 'force_retry')}
                    disabled={isProcessing}
                    className="font-mono text-[10px] uppercase tracking-wider px-3 py-2 rounded bg-gold/15 text-gold border border-gold-dim hover:bg-gold hover:text-ink transition-colors font-medium disabled:opacity-50"
                  >
                    Authorize Retry
                  </button>

                  <button
                    onClick={() => handleAction(item._id, 'write_off')}
                    disabled={isProcessing}
                    className="font-mono text-[10px] uppercase tracking-wider px-3 py-2 rounded border border-hairline text-paper-dim hover:text-rust hover:border-rust transition-colors disabled:opacity-50"
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