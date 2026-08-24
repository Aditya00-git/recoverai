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
      setError('Could not connect to backend service. Is server running on port 5000?');
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
      setError('Agent execution failed. Check backend console for details.');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="min-h-screen bg-[#07080B] text-slate-100 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-400 font-bold">
                Autonomous Revenue Ops Engine
              </p>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Recover<span className="text-amber-400">AI</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadSummary}
              className="font-mono text-xs uppercase tracking-wider px-4 py-2.5 border border-white/15 rounded-xl text-slate-300 hover:text-white hover:border-white/30 hover:bg-white/[0.04] transition-all font-semibold"
            >
              Refresh
            </button>
            <button
              onClick={handleRunAgent}
              disabled={running}
              className="font-mono text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
            >
              {running && (
                <span className="inline-block w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              )}
              {running ? 'Recovering Revenue...' : 'Run Agent'}
            </button>
          </div>
        </header>

        {loading && (
          <div className="glass-panel p-6 rounded-xl text-center mb-8">
            <p className="font-mono text-sm text-slate-400 animate-pulse">Syncing ledger records & live detection radar...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs mb-8">
            {error}
          </div>
        )}

        {runResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-emerald-500/30 bg-emerald-500/10 rounded-xl px-6 py-4 mb-8 shadow-lg shadow-emerald-500/5"
          >
            <p className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold mb-1">
              ✨ Autonomous Recovery Run Completed
            </p>
            <p className="text-sm text-slate-300 font-medium">
              Processed <strong className="text-white">{runResult.processedCount}</strong> at-risk items ·{' '}
              <strong className="text-emerald-400">{runResult.successCount} recovered</strong> ·{' '}
              {runResult.stoppedCount} protected by stopping rules ·{' '}
              <strong className="text-amber-300">{formatRupees(runResult.totalRecovered)}</strong> won back this run
            </p>
          </motion.div>
        )}

        {summary && (
          <>
            <HeadlineCards headline={summary.headline} />

            {/* HUMAN ESCALATION COMMAND CENTER */}
            <EscalationCenter
              pendingCount={summary.headline?.pendingEscalated}
              onResolved={loadSummary}
            />

            {/* LIVE SCENARIO SANDBOX */}
            <ScenarioSimulator />

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ActionBreakdownChart actionTypeBreakdown={summary.actionTypeBreakdown} />
              <FunnelChart funnel={summary.funnel} />
            </div>

            {/* AUDIT TRAIL */}
            <AuditTrailTable recentActions={summary.recentActions} />
          </>
        )}

        <footer className="font-mono text-xs text-slate-500 text-center mt-12 pt-6 border-t border-white/[0.06] uppercase tracking-widest">
          RecoverAI · Built for Razorpay AI Builder Challenge · Autonomous Revenue Operations
        </footer>
      </div>
    </div>
  );
}

export default App;