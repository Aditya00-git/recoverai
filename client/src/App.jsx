import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchDashboardSummary, runAgent, resetDemoData, formatRupees } from './api/dashboardApi';
import HeadlineCards from './components/HeadlineCards';
import ActionBreakdownChart from './components/ActionBreakdownChart';
import FunnelChart from './components/FunnelChart';
import AuditTrailTable from './components/AuditTrailTable';
import ScenarioSimulator from './components/ScenarioSimulator';
import EscalationCenter from './components/EscalationCenter';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'simulator'
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

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 pb-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Top Header Bar matching Reference */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#1C1C22]">
          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => setCurrentView('dashboard')}
            >
              {/* <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" /> */}
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                Recover<span className="text-blue-400">AI</span>
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-2 font-mono text-xs text-slate-500">
              <span>Admin</span>
              <span>›</span>
              <span className="text-slate-300">
                {currentView === 'simulator' ? 'Scenario Simulator Playground' : 'Revenue Recovery Ledger'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Dedicated Scenario Simulator Top Button */}
            <button
              onClick={() => setCurrentView(currentView === 'simulator' ? 'dashboard' : 'simulator')}
              className={`dash-btn ${currentView === 'simulator' ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' : ''}`}
              title="Open Live Scenario Simulator Sandbox"
            >
              <span></span>
              <span>{currentView === 'simulator' ? 'Dashboard View' : 'Scenario Sandbox'}</span>
            </button>

            {/* 1-Click Reset Demo Button */}
            <button
              onClick={handleResetDemo}
              disabled={resetting || running}
              className="dash-btn"
              title="Resets database to fresh at-risk data so you can test Run Agent from scratch"
            >
              {resetting ? (
                <span className="inline-block w-3 h-3 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
              ) : (
                <span className="text-blue-400"></span>
              )}
              <span>{resetting ? 'Resetting...' : 'Reset Demo'}</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={loadSummary}
              disabled={loading || running}
              className="dash-btn"
            >
              Refresh
            </button>

            {/* Run Agent Primary Action */}
            <button
              onClick={handleRunAgent}
              disabled={running || resetting}
              className="dash-btn-primary"
            >
              {running && (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{running ? 'Recovering...' : 'Run Agent →'}</span>
            </button>
          </div>
        </header>

        {loading && (
          <div className="dash-card p-6 text-center mb-6">
            <p className="font-mono text-xs text-slate-500 uppercase tracking-wider animate-pulse">
              Syncing ledger records & recovery radar...
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs mb-6">
            {error}
          </div>
        )}

        {resetMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="dash-card border-blue-500/30 bg-blue-500/10 px-4 py-3 mb-6 text-blue-300 text-xs font-mono"
          >
            {resetMessage}
          </motion.div>
        )}

        {runResult && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="dash-card border-emerald-500/30 bg-emerald-500/10 p-4 mb-6"
          >
            <p className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold mb-1">
               Autonomous Recovery Run Completed
            </p>
            <p className="text-xs text-slate-300">
              Processed <strong className="text-white">{runResult.processedCount}</strong> at-risk items ·{' '}
              <strong className="text-emerald-400">{runResult.successCount} recovered</strong> ·{' '}
              {runResult.stoppedCount} protected by stopping rules ·{' '}
              <strong className="text-emerald-400">{formatRupees(runResult.totalRecovered)}</strong> won back this run
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {currentView === 'simulator' ? (
            /* DEDICATED SCENARIO SIMULATOR VIEW */
            <motion.div
              key="simulator-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <ScenarioSimulator onBack={() => setCurrentView('dashboard')} />
            </motion.div>
          ) : (
            /* MAIN SINGLE-FRAME LEDGER DASHBOARD */
            summary && (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* ROW 1: 5 Headline KPI Cards */}
                <HeadlineCards headline={summary.headline} />

                {/* ROW 2: Analytics & Funnel (2-Column Grid) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ActionBreakdownChart actionTypeBreakdown={summary.actionTypeBreakdown} />
                  <FunnelChart funnel={summary.funnel} />
                </div>

                {/* ROW 3: Human Escalation Command Center */}
                <EscalationCenter
                  pendingCount={summary.headline?.pendingEscalated}
                  onResolved={loadSummary}
                />

                {/* ROW 4: Audit Trail Ledger */}
                <AuditTrailTable recentActions={summary.recentActions} />
              </motion.div>
            )
          )}
        </AnimatePresence>

        <footer className="font-mono text-xs text-slate-600 text-center mt-12 pt-6 border-t border-[#1C1C22] uppercase tracking-widest">
          RecoverAI · Razorpay AI Builder Challenge · Autonomous Revenue Operations
        </footer>
      </div>
    </div>
  );
}

export default App;