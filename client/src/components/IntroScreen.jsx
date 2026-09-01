import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function IntroScreen({ onComplete }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // 1.6s auto-dismiss into dashboard
    const timer = setTimeout(() => {
      handleDismiss();
    }, 1800);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === ' ') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 400);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 bg-[#08090C] flex flex-col justify-between p-8 sm:p-12 overflow-hidden select-none"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 font-medium">
                System Initializing
              </span>
            </div>

            <button
              onClick={handleDismiss}
              className="font-mono text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-200 px-3 py-1 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Skip</span>
              <kbd className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">ESC</kbd>
            </button>
          </div>

          {/* Central Typographic Statement */}
          <div className="w-full max-w-4xl mx-auto my-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500 mb-3 font-semibold">
                Autonomous Revenue Operations
              </p>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-6">
                Recover<span className="text-zinc-400 font-normal">AI</span>
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="h-[1px] bg-zinc-800 w-full mb-6"
            />

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="text-zinc-400 text-sm sm:text-base max-w-xl font-normal leading-relaxed"
            >
              Find revenue that’s slipping away and win it back. Bounded recovery pipelines across payment degradation, cart drop-offs, and B2B receivables.
            </motion.p>
          </div>

          {/* Bottom Telemetry Ticker */}
          <div className="flex items-center justify-between w-full max-w-6xl mx-auto pt-6 border-t border-zinc-900 font-mono text-xs text-zinc-500">
            <span>Razorpay AI Builder Challenge</span>
            <span>Ledger v1.0.0</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
