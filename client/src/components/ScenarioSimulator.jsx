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
    <div className="bg-panel border border-hairline rounded-lg p-6 mb-10 overflow-hidden">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
            <h3 className="font-display text-xl">Live Scenario Sandbox</h3>
          </div>
          <p className="text-paper-dim text-xs mt-1">
            Type any custom payment failure or receivables scenario to watch RecoverAI diagnose and intervene live. (Ephemeral sandbox · Does not alter DB metrics)
          </p>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="font-mono text-[10px] uppercase tracking-wider text-paper-dim/80 self-center mr-1">
          Presets:
        </span>
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handlePresetClick(p.text)}
            className="font-mono text-[11px] px-3 py-1.5 rounded border border-hairline/80 bg-panel-raised hover:border-gold-dim hover:text-gold transition-colors text-paper-dim text-left"
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
          className="flex-1 bg-ink border border-hairline rounded p-3 text-sm text-paper placeholder:text-paper-dim/40 focus:outline-none focus:border-gold-dim resize-none font-sans"
        />
        <button
          onClick={() => handleSimulate()}
          disabled={loading || !input.trim()}
          className="sm:self-stretch px-6 py-2.5 rounded bg-gold text-ink font-semibold hover:bg-amber disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shrink-0"
        >
          {loading && (
            <span className="inline-block w-3.5 h-3.5 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
          )}
          {loading ? 'Diagnosing...' : 'Test Scenario'}
        </button>
      </div>

      {error && <p className="font-mono text-xs text-rust mb-4">{error}</p>}

      {/* Results Display */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border border-gold-dim/40 bg-panel-raised rounded-lg p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-hairline">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-gold font-semibold bg-gold/10 px-2.5 py-1 rounded">
                  Diagnosis Result
                </span>
                <span className="font-mono text-xs text-paper-dim">
                  Type: <strong className="text-paper capitalize">{result.parsed?.type?.replace('_', ' ')}</strong>
                </span>
                <span className="font-mono text-xs text-paper-dim">
                  Amount: <strong className="text-mint">₹{result.parsed?.amountRupees?.toLocaleString('en-IN')}</strong>
                </span>
              </div>
              <div className="font-mono text-xs text-paper-dim">
                Est. Recovery: <span className="text-mint font-medium">{result.recoveryChance || '50%'}</span>
              </div>
            </div>

            {/* Grid of decision details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-ink/60 border border-hairline/60 rounded p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim mb-1">
                  Root Cause
                </p>
                <p className="text-xs text-paper font-medium">{result.parsed?.detectedIssue || 'N/A'}</p>
                <p className="font-mono text-[11px] text-paper-dim mt-1.5">
                  Via {result.parsed?.method || 'Standard Gateway'}
                </p>
              </div>

              <div className="bg-ink/60 border border-hairline/60 rounded p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim mb-1">
                  Agent Action
                </p>
                <p className="text-sm font-semibold text-gold">
                  {ACTION_LABELS[result.actionType] || result.actionType}
                </p>
                <p className="font-mono text-[10px] text-mint mt-1">
                  🛡️ {result.guardrailStatus || 'Stopping rules verified'}
                </p>
              </div>

              <div className="bg-ink/60 border border-hairline/60 rounded p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim mb-1">
                  Reasoning
                </p>
                <p className="text-xs text-paper-dim leading-relaxed">{result.reasoning}</p>
              </div>
            </div>

            {/* Generated Message Draft (if any) */}
            {result.messageDraft && (
              <div className="mt-3 pt-3 border-t border-hairline">
                <p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim mb-2 flex items-center gap-1.5">
                  {result.channel === 'whatsapp' ? '💬 WhatsApp Message (Hinglish)' : '✉️ Email Draft (English)'}
                </p>

                {result.channel === 'whatsapp' ? (
                  <div className="bg-[#0a1014] rounded-lg p-3 border border-hairline max-w-lg">
                    <div className="bg-[#1f2c26] rounded-lg rounded-tl-none px-4 py-2.5 text-xs text-paper leading-relaxed">
                      {result.messageDraft}
                    </div>
                  </div>
                ) : (
                  <div className="bg-paper text-ink rounded p-3 max-w-lg text-xs leading-relaxed">
                    <p className="font-mono text-[10px] text-ink/60 mb-1 border-b border-ink/10 pb-1">
                      Subject: Urgent: Payment Settlement Follow-up
                    </p>
                    <p className="whitespace-pre-line">{result.messageDraft}</p>
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