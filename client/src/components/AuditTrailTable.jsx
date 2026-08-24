import { useState } from 'react';
import { formatRupees } from '../api/dashboardApi';
import MessagePreviewModal from './MessagePreviewModal';

const ACTION_LABELS = {
  retry_payment: 'Retry Payment',
  send_reminder: 'Send Reminder',
  offer_incentive: 'Offer Incentive',
  escalate_human: 'Escalate to Human',
  no_action: 'No Action',
};

const OUTCOME_META = {
  success: { label: 'Recovered', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  failed: { label: 'Failed', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  pending: { label: 'Pending Review', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  stopped_by_rule: { label: 'Stopped by Rule', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
};

function OutcomeMark({ outcome }) {
  const meta = OUTCOME_META[outcome] || OUTCOME_META.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.color} font-semibold`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{meta.label}</span>
    </span>
  );
}

function AuditTrailTable({ recentActions }) {
  const [previewAction, setPreviewAction] = useState(null);

  if (!recentActions || recentActions.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center text-slate-400 font-mono text-sm">
        No recovery actions logged yet. Click "Run Agent" to process at-risk revenue.
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl overflow-hidden mb-8">
      <div className="px-6 py-4.5 border-b border-white/[0.08] flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-bold text-white tracking-tight">Audit Trail & Reasoning Ledger</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Immutable log of intervention decisions, mandate sequences, and AI explainability.
          </p>
        </div>
        <span className="font-mono text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 border border-white/10 text-slate-300">
          {recentActions.length} Entries Logged
        </span>
      </div>

      <div className="max-h-[580px] overflow-y-auto modern-scroll">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0F121A] text-slate-300 sticky top-0 z-10 border-b border-white/[0.08]">
            <tr>
              <th className="px-6 py-3 font-mono text-xs uppercase tracking-wider font-bold text-slate-400">Target</th>
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider font-bold text-slate-400">Action & Schedule</th>
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider font-bold text-slate-400">AI Explainability</th>
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider font-bold text-slate-400 text-right">Amount</th>
              <th className="px-6 py-3 font-mono text-xs uppercase tracking-wider font-bold text-slate-400">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {recentActions.map((action) => {
              const hasMessage = action.messageDraft && action.messageDraft.length > 0;
              const hasSchedule = action.retrySchedule && action.retrySchedule.length > 0;
              const hasPtp = action.ptpDate;

              return (
                <tr key={action._id} className="hover:bg-white/[0.025] transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-200 border border-white/10 capitalize">
                      {action.targetType}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-semibold text-sm text-white">
                      {ACTION_LABELS[action.actionType] || action.actionType}
                    </div>

                    {/* Mandate Schedule Badge */}
                    {hasSchedule && (
                      <div className="font-mono text-xs text-cyan-300 mt-1 flex items-center gap-1.5 font-medium bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 w-fit">
                        <span>🔄</span> {action.retrySchedule}
                      </div>
                    )}

                    {/* Promise to Pay Badge */}
                    {hasPtp && (
                      <div className="font-mono text-xs text-amber-300 mt-1 flex items-center gap-1.5 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                        <span>📅</span> PTP: {new Date(action.ptpDate).toLocaleDateString('en-IN')}
                      </div>
                    )}

                    {/* View Message Link */}
                    {hasMessage && (
                      <button
                        onClick={() => setPreviewAction(action)}
                        className="font-mono text-xs uppercase tracking-wider text-amber-400 hover:text-amber-300 font-semibold mt-1.5 flex items-center gap-1 transition-colors"
                      >
                        View Message →
                      </button>
                    )}
                  </td>

                  <td className="px-4 py-4 text-slate-300 text-xs leading-relaxed max-w-md">
                    {action.reasoning}
                  </td>

                  <td className="px-4 py-4 text-right font-mono text-sm tabular font-semibold">
                    {action.outcome === 'success' ? (
                      <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                        {formatRupees(action.amountRecovered)}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <OutcomeMark outcome={action.outcome} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <MessagePreviewModal
        isOpen={!!previewAction}
        onClose={() => setPreviewAction(null)}
        message={previewAction?.messageDraft}
        channel={previewAction?.channel}
        reasoning={previewAction?.reasoning}
      />
    </div>
  );
}

export default AuditTrailTable;