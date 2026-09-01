import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchDashboardSummary, runAgent, resetDemoData, formatRupees } from './api/dashboardApi';
import HeadlineCards from './components/HeadlineCards';
import ActionBreakdownChart from './components/ActionBreakdownChart';
import FunnelChart from './components/FunnelChart';
import AuditTrailTable from './components/AuditTrailTable';
import ScenarioSimulator from './components/ScenarioSimulator';
import EscalationCenter from './components/EscalationCenter';
import DotBorderButton from './components/DotBorderButton';

const TABS = [
  { id: 'analytics', label: 'Visual Analytics', icon: '📊' },
  { id: 'escalations', label: 'Escalation Queue', icon: '🛡️' },
  { id: 'simulator', label: 'Scenario Sandbox', icon: '🧪' },
  { id: 'audit', label: 'Audit Trail Ledger', icon: '📋' },
];

function App() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [resetMessage, setResetMessage] = useState(null);

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
    setResetMessage(null);
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

  const handleResetDemo = async () => {
    if (resetting || running) return;
    setResetting(true);
    setRunResult(null);
    try {
      const res = await resetDemoData();
      setSummary(res.summary);
      setResetMessage('Demo ledger reset to fresh at-risk dataset. Click "Run Agent" to start autonomous recovery.');
      setTimeout(() => setResetMessage(null), 5000);
    } catch (err) {
      setError('Failed to reset demo dataset.');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const pendingEscalations = summary?.headline?.pendingEscalated || 0;

  return (
    <div className="min-h-screen bg-[#08090C] text-slate-100 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">
                Autonomous Revenue Operations
              </p>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display">
              Recover<span className="text-amber-400">AI</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {/* 1-Click Reset Demo Button with DotBorder */}
            <DotBorderButton
              variant="cyan"
              onClick={handleResetDemo}
              disabled={resetting || running}
              title="Resets database to fresh at-risk data so you can test Run Agent from scratch"
            >
              {resetting ? (
                <span className="inline-block w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              ) : (
                <span className="text-cyan-400">↺</span>
              )}
              <span>{resetting ? 'Resetting...' : 'Reset Demo'}</span>
            </DotBorderButton>

            {/* Refresh Button with DotBorder */}
            <DotBorderButton
              variant="slate"
              onClick={loadSummary}
              disabled={loading || running}
            >
              <span>Refresh</span>
            </DotBorderButton>

            {/* Run Agent Primary Action with DotBorder */}
            <DotBorderButton
              variant="gold"
              onClick={handleRunAgent}
              disabled={running || resetting}
            >
              {running && (
                <span className="inline-block w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              )}
              <span>{running ? 'Processing...' : 'Run Agent →'}</span>
            </DotBorderButton>
          </div>
        </header>

        {loading && (
          <div className="glass-panel p-6 rounded-lg text-center mb-8">
            <p className="font-mono text-xs text-slate-500 uppercase tracking-wider animate-pulse">Syncing ledger records...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs mb-8">
            {error}
          </div>
        )}

        {resetMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-cyan-500/30 bg-cyan-500/10 rounded-lg px-4 py-3 mb-8 text-cyan-300 text-xs font-mono"
          >
            {resetMessage}
          </motion.div>
        )}

        {runResult && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-5 py-4 mb-8 shadow-sm"
          >
            <p className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold mb-1">
              ✨ Autonomous Recovery Completed
            </p>
            <p className="text-xs text-slate-300">
              Processed <strong className="text-white">{runResult.processedCount}</strong> at-risk items ·{' '}
              <strong className="text-emerald-400">{runResult.successCount} recovered</strong> ·{' '}
              {runResult.stoppedCount} protected by stopping rules ·{' '}
              <strong className="text-white">{formatRupees(runResult.totalRecovered)}</strong> won back this run
            </p>
          </motion.div>
        )}

        {summary && (
          <>
            {/* Top Headline Summary Cards */}
            <HeadlineCards headline={summary.headline} />

            {/* TAB NAVIGATION BAR */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 border-b border-white/[0.08] modern-scroll">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const isEscalations = tab.id === 'escalations';

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative font-mono text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#181C26] text-white font-bold border border-white/20 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>

                    {/* Pending Escalations Badge */}
                    {isEscalations && pendingEscalations > 0 && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                        {pendingEscalations}
                      </span>
                    )}

                    {/* Active Tab Glow Pill */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 rounded-lg border border-amber-400/30 pointer-events-none"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT PANELS */}
            <AnimatePresence mode="wait">
              {activeTab === 'analytics' && (
                <motion.div
                  key="analytics-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <ActionBreakdownChart actionTypeBreakdown={summary.actionTypeBreakdown} />
                    <FunnelChart funnel={summary.funnel} />
                  </div>
                </motion.div>
              )}

              {activeTab === 'escalations' && (
                <motion.div
                  key="escalations-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <EscalationCenter
                    pendingCount={summary.headline?.pendingEscalated}
                    onResolved={loadSummary}
                  />
                  {pendingEscalations === 0 && (
                    <div className="glass-panel p-10 rounded-xl text-center">
                      <p className="font-mono text-sm text-emerald-400 font-semibold mb-1">
                        ✓ All Escalations Resolved
                      </p>
                      <p className="text-xs text-slate-400">
                        There are no high-risk items currently requiring human authorization. Run the agent to analyze new transactions.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'simulator' && (
                <motion.div
                  key="simulator-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <ScenarioSimulator />
                </motion.div>
              )}

              {activeTab === 'audit' && (
                <motion.div
                  key="audit-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <AuditTrailTable recentActions={summary.recentActions} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        <footer className="font-mono text-xs text-slate-600 text-center mt-16 pt-6 border-t border-white/[0.08] uppercase tracking-widest">
          RecoverAI · Razorpay AI Builder Challenge · Autonomous Revenue Operations
        </footer>
      </div>
    </div>
  );
}

export default App;