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
  success: { label: 'Recovered', color: '#3FBF8F' },
  failed: { label: 'Failed', color: '#E1654B' },
  pending: { label: 'Pending', color: '#D4A24C' },
  stopped_by_rule: { label: 'Stopped', color: '#8B8A85' },
};

function OutcomeMark({ outcome }) {
  const meta = OUTCOME_META[outcome] || OUTCOME_META.pending;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ backgroundColor: meta.color }}
      />
      <span style={{ color: meta.color }}>{meta.label}</span>
    </span>
  );
}

function AuditTrailTable({ recentActions }) {
  const [previewAction, setPreviewAction] = useState(null);

  if (!recentActions || recentActions.length === 0) {
    return (
      <div className="bg-panel rounded-lg p-6 border border-hairline text-paper-dim">
        No recovery actions logged yet.
      </div>
    );
  }

  return (
    <div className="bg-panel rounded-lg border border-hairline overflow-hidden">
      <div className="px-6 py-5 border-b border-hairline flex items-baseline justify-between">
        <div>
          <h3 className="font-display text-xl">Audit Trail</h3>
          <p className="text-paper-dim text-xs mt-1 max-w-xl">
            Immutable log of recovery actions, mandate retry sequences, and natural language explainability.
          </p>
        </div>
        <span className="font-mono text-[11px] text-paper-dim uppercase tracking-wider shrink-0 ml-4">
          {recentActions.length} entries
        </span>
      </div>

      <div className="max-h-[560px] overflow-y-auto ledger-scroll">
        <table className="w-full text-sm">
          <thead className="bg-panel-raised text-paper-dim sticky top-0">
            <tr>
              <th className="text-left px-6 py-2.5 font-mono text-[10px] uppercase tracking-widest font-medium">Type</th>
              <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest font-medium">Action & Schedule</th>
              <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest font-medium">Reasoning</th>
              <th className="text-right px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest font-medium">Amount</th>
              <th className="text-left px-6 py-2.5 font-mono text-[10px] uppercase tracking-widest font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {recentActions.map((action) => {
              const hasMessage = action.messageDraft && action.messageDraft.length > 0;
              const hasSchedule = action.retrySchedule && action.retrySchedule.length > 0;
              const hasPtp = action.ptpDate;

              return (
                <tr key={action._id} className="border-t border-hairline/60 hover:bg-panel-raised/50 transition-colors">
                  <td className="px-6 py-3.5 text-paper-dim capitalize text-xs">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-panel border border-hairline">
                      {action.targetType}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-sm">
                      {ACTION_LABELS[action.actionType] || action.actionType}
                    </div>

                    {/* Mandate Schedule Badge */}
                    {hasSchedule && (
                      <div className="font-mono text-[10px] text-mint mt-1 flex items-center gap-1">
                        <span>🔄</span> {action.retrySchedule}
                      </div>
                    )}

                    {/* Promise to Pay Badge */}
                    {hasPtp && (
                      <div className="font-mono text-[10px] text-gold mt-1 flex items-center gap-1">
                        <span>📅</span> PTP: {new Date(action.ptpDate).toLocaleDateString('en-IN')}
                      </div>
                    )}

                    {/* View Message Link */}
                    {hasMessage && (
                      <button
                        onClick={() => setPreviewAction(action)}
                        className="font-mono text-[10px] uppercase tracking-wider text-gold hover:text-amber mt-1 block"
                      >
                        View Message →
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-paper-dim text-xs leading-relaxed max-w-md">
                    {action.reasoning}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono tabular">
                    {action.outcome === 'success' ? (
                      <span style={{ color: '#3FBF8F' }}>{formatRupees(action.amountRecovered)}</span>
                    ) : (
                      <span className="text-hairline">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
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