import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchDashboardSummary, runAgent, formatRupees } from './api/dashboardApi';
import HeadlineCards from './components/HeadlineCards';
import ActionBreakdownChart from './components/ActionBreakdownChart';
import FunnelChart from './components/FunnelChart';
import AuditTrailTable from './components/AuditTrailTable';
import ScenarioSimulator from './components/ScenarioSimulator';
import EscalationCenter from './components/EscalationCenter';

function App() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError('Could not load dashboard data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAgent = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const result = await runAgent();
      setRunResult(result.batchResult);
      await loadSummary();
    } catch (err) {
      setError('Agent run failed. Check the backend console for details.');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="min-h-screen bg-ink text-paper">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-10 pb-6 border-b border-hairline">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold mb-2">
              Revenue Recovery Ledger
            </p>
            <h1 className="font-display text-4xl md:text-5xl italic font-light">
              RecoverAI
            </h1>
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={loadSummary}
              className="font-mono text-[11px] uppercase tracking-wider px-4 py-2.5 border border-hairline rounded text-paper-dim hover:text-paper hover:border-paper-dim transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={handleRunAgent}
              disabled={running}
              className="font-mono text-[11px] uppercase tracking-wider px-4 py-2.5 rounded bg-gold text-ink font-semibold hover:bg-amber disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {running && (
                <span className="inline-block w-3 h-3 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
              )}
              {running ? 'Running' : 'Run Agent'}
            </button>
          </div>
        </div>

        {loading && (
          <p className="font-mono text-sm text-paper-dim mb-6">Loading ledger...</p>
        )}
        {error && (
          <p className="font-mono text-sm text-rust mb-6">{error}</p>
        )}

        {runResult && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gold-dim bg-gold/5 rounded-lg px-6 py-4 mb-8"
          >
            <p className="font-mono text-[11px] uppercase tracking-wider text-gold mb-1">
              Agent Run Complete
            </p>
            <p className="text-sm text-paper-dim">
              Processed <span className="text-paper font-medium">{runResult.processedCount}</span> items ·{' '}
              <span className="text-mint font-medium">{runResult.successCount} succeeded</span> ·{' '}
              {runResult.stoppedCount} blocked by stopping rules ·{' '}
              <span className="text-gold font-medium">{formatRupees(runResult.totalRecovered)}</span> recovered this run
            </p>
          </motion.div>
        )}

        {summary && (
          <>
            <HeadlineCards headline={summary.headline} />

            {/* HUMAN-IN-THE-LOOP ESCALATION CENTER */}
            <EscalationCenter onResolved={loadSummary} />

            {/* LIVE SCENARIO SANDBOX */}
            <ScenarioSimulator />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ActionBreakdownChart actionTypeBreakdown={summary.actionTypeBreakdown} />
              <FunnelChart funnel={summary.funnel} />
            </div>

            <AuditTrailTable recentActions={summary.recentActions} />
          </>
        )}

        <p className="font-mono text-[10px] text-paper-dim/60 text-center mt-10 uppercase tracking-widest">
          RecoverAI · AI Revenue Recovery · Built for Razorpay AI Builder Internship
        </p>
      </div>
    </div>
  );
}

export default App;