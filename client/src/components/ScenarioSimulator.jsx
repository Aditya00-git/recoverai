import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { simulateScenario } from '../api/dashboardApi';

const PRESETS = [
  {
    label: '₹45,000 B2B Bank Timeout',
    text: '₹45,000 corporate purchase for Zenith Software failed due to bank timeout at 2:15 AM on HDFC Netbanking.',
  },
  {
    label: '₹2,499 Abandoned Cart (UPI)',
    text: 'Customer cust_088 abandoned cart worth ₹2,499 on fashion checkout after UPI payment page was opened 45 mins ago.',
  },
  {
    label: '₹1,80,000 Enterprise Invoice (35d Overdue)',
    text: 'Invoice INV-2026-0012 for ₹1,80,000 issued to Nimbus Retail (Enterprise Tier) is 35 days overdue. Payment terms were Net 30.',
  },
  {
    label: '₹499 Failed Subscription (Salary Sync)',
    text: 'Recurring monthly streaming subscription of ₹499 failed on 28th of the month due to insufficient funds on debit card.',
  },
];

const ACTION_LABELS = {
  retry_payment: 'Retry Payment',
  send_reminder: 'Send Reminder',
  offer_incentive: 'Offer Incentive',
  escalate_human: 'Escalate to Human',
  no_action: 'No Action',
};

function ScenarioSimulator() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSimulate = async (textToRun = input) => {
    if (!textToRun.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await simulateScenario(textToRun);
      setResult(data);
    } catch (err) {
      setError('Simulation failed. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (presetText) => {
    setInput(presetText);
    handleSimulate(presetText);
  };

  return (
    <div className="glass-panel rounded-xl p-6 mb-8 relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <h3 className="font-display text-xl font-bold text-white tracking-tight">
              Interactive Scenario Playground
            </h3>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Type any natural language recovery scenario to watch RecoverAI diagnose and intervene live. (Zero database pollution · Ephemeral sandbox)
          </p>
        </div>
        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
          Live Sandbox
        </span>
      </div>

      {/* Preset Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="font-mono text-xs font-semibold text-slate-400 mr-1 uppercase tracking-wider">
          Presets:
        </span>
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handlePresetClick(p.text)}
            className="font-mono text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-[#12151E] hover:border-amber-400/40 hover:text-amber-300 transition-all text-slate-300 text-left font-medium hover:bg-slate-800/60"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. ₹3,200 payment failed due to card decline, customer tried twice in 10 mins..."
          className="flex-1 bg-[#0A0C10] border border-white/15 rounded-xl p-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 resize-none font-sans transition-all"
        />
        <button
          onClick={() => handleSimulate()}
          disabled={loading || !input.trim()}
          className="sm:self-stretch px-6 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-amber-500/20 active:scale-95"
        >
          {loading && (
            <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          )}
          {loading ? 'Analyzing...' : 'Test Scenario'}
        </button>
      </div>

      {error && <p className="font-mono text-xs text-rose-400 mb-4 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{error}</p>}

      {/* Results Display */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border border-amber-500/30 bg-[#10131B] rounded-xl p-5 shadow-2xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3.5 border-b border-white/10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-widest text-amber-300 font-bold bg-amber-500/15 px-3 py-1 rounded-md border border-amber-500/30">
                  Diagnosis Result
                </span>
                <span className="font-mono text-xs text-slate-300">
                  Type: <strong className="text-white capitalize font-semibold">{result.parsed?.type?.replace('_', ' ')}</strong>
                </span>
                <span className="font-mono text-xs text-slate-300">
                  Amount: <strong className="text-emerald-400 font-bold">₹{result.parsed?.amountRupees?.toLocaleString('en-IN')}</strong>
                </span>
              </div>
              <div className="font-mono text-xs text-slate-300 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">
                Est. Recovery Chance: <span className="text-emerald-400 font-bold">{result.recoveryChance || '50%'}</span>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4">
              <div className="bg-[#0A0C10] border border-white/[0.08] rounded-lg p-3.5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Root Cause
                </p>
                <p className="text-sm text-slate-100 font-medium">{result.parsed?.detectedIssue || 'N/A'}</p>
                <p className="font-mono text-xs text-cyan-400 mt-1.5">
                  Rail: {result.parsed?.method || 'Standard Gateway'}
                </p>
              </div>

              <div className="bg-[#0A0C10] border border-white/[0.08] rounded-lg p-3.5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Recommended Action
                </p>
                <p className="text-base font-bold text-amber-400">
                  {ACTION_LABELS[result.actionType] || result.actionType}
                </p>
                <p className="font-mono text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                  🛡️ {result.guardrailStatus || 'Stopping rules verified'}
                </p>
              </div>

              <div className="bg-[#0A0C10] border border-white/[0.08] rounded-lg p-3.5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Explainability Reasoning
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">{result.reasoning}</p>
              </div>
            </div>

            {/* Generated Message Draft */}
            {result.messageDraft && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="font-mono text-xs uppercase tracking-widest text-slate-300 font-semibold mb-2.5 flex items-center gap-2">
                  {result.channel === 'whatsapp' ? '💬 WhatsApp Message Draft (Hinglish)' : '✉️ Formal Email Draft (English)'}
                </p>

                {result.channel === 'whatsapp' ? (
                  <div className="bg-[#0B141A] rounded-xl p-3.5 border border-emerald-500/20 max-w-md shadow-lg">
                    <div className="bg-[#005C4B] rounded-xl rounded-tl-none px-4 py-3 text-sm text-white leading-relaxed font-sans shadow-md">
                      {result.messageDraft}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 text-slate-200 border border-white/15 rounded-xl p-4 max-w-lg text-xs leading-relaxed shadow-lg">
                    <p className="font-mono text-xs text-amber-400 font-semibold mb-2 border-b border-white/10 pb-2">
                      Subject: Urgent: Payment Settlement & Follow-up
                    </p>
                    <p className="whitespace-pre-line text-slate-300 text-sm leading-relaxed">{result.messageDraft}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ScenarioSimulator;