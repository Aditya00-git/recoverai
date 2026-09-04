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
  success: { label: 'Recovered', pill: 'target-pill-green', dot: 'bg-emerald-400' },
  failed: { label: 'Failed', pill: 'target-pill-rose', dot: 'bg-rose-400' },
  pending: { label: 'Pending Review', pill: 'target-pill-blue', dot: 'bg-blue-400' },
  stopped_by_rule: { label: 'Stopped by Rule', pill: 'target-pill', dot: 'bg-slate-400' },
};

function OutcomeMark({ outcome }) {
  const meta = OUTCOME_META[outcome] || OUTCOME_META.pending;
  return (
    <span className={`target-pill ${meta.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      <span>{meta.label}</span>
    </span>
  );
}

function AuditTrailTable({ recentActions }) {
  const [previewAction, setPreviewAction] = useState(null);
  const [search, setSearch] = useState('');

  if (!recentActions || recentActions.length === 0) {
    return (
      <div className="dash-card p-10 text-center text-slate-500 font-mono text-sm">
        No recovery actions logged yet. Click "Run Agent" to process at-risk revenue.
      </div>
    );
  }

  const filtered = recentActions.filter((action) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const type = (action.targetType || '').toLowerCase();
    const reason = (action.reasoning || '').toLowerCase();
    const id = (action.targetId || '').toLowerCase();
    return type.includes(q) || reason.includes(q) || id.includes(q);
  });

  return (
    <div className="dash-card overflow-hidden mb-8">
      <div className="p-5 border-b border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white font-display">
            Audit Trail & Reasoning Ledger
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of intervention decisions, mandate sequences, and AI explainability.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full bg-[#161922] border border-white/10 rounded-lg px-3.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-all font-sans"
            />
          </div>
          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-[#161922] border border-white/10 text-slate-300 shrink-0">
            {recentActions.length} Entries
          </span>
        </div>
      </div>

      <div className="max-h-[560px] overflow-y-auto dash-scroll">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#14171F] text-slate-400 sticky top-0 z-10 border-b border-white/[0.06] font-mono text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5 font-semibold">Target / Channel</th>
              <th className="px-4 py-3.5 font-semibold">Action & Mandate Schedule</th>
              <th className="px-4 py-3.5 font-semibold">AI Explainability Reasoning</th>
              <th className="px-4 py-3.5 font-semibold text-right">Amount Won</th>
              <th className="px-6 py-3.5 font-semibold">Outcome Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map((action) => {
              const hasMessage = action.messageDraft && action.messageDraft.length > 0;
              const hasSchedule = action.retrySchedule && action.retrySchedule.length > 0;
              const hasPtp = action.ptpDate;

              return (
                <tr key={action._id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#181B24] border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-slate-300 shrink-0">
                        {action.targetType ? action.targetType.charAt(0).toUpperCase() : 'T'}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs uppercase tracking-wider capitalize font-mono">
                          {action.targetType}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {action.channel === 'whatsapp' ? ' WhatsApp' : action.channel === 'email' ? ' Email' : ' Direct'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-sm text-white">
                      {ACTION_LABELS[action.actionType] || action.actionType}
                    </div>

                    {hasSchedule && (
                      <div className="target-pill target-pill-blue mt-1">
                        <span>🔄</span> {action.retrySchedule}
                      </div>
                    )}

                    {hasPtp && (
                      <div className="target-pill target-pill-green mt-1">
                        <span></span> PTP: {new Date(action.ptpDate).toLocaleDateString('en-IN')}
                      </div>
                    )}

                    {hasMessage && (
                      <button
                        onClick={() => setPreviewAction(action)}
                        className="font-mono text-xs uppercase tracking-wider text-blue-400 hover:text-blue-300 font-semibold mt-1.5 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        View Message →
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-300 text-xs leading-relaxed max-w-sm">
                    {action.reasoning}
                  </td>

                  <td className="px-4 py-4 text-right font-mono text-sm font-bold">
                    {action.outcome === 'success' ? (
                      <span className="text-emerald-400">
                        {formatRupees(action.amountRecovered)}
                      </span>
                    ) : (
                      <span className="text-slate-600 font-normal">—</span>
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