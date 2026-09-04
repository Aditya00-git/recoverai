import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InfoPopover({
  title = 'Quick Info',
  description = '',
  items = [],
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-[#16161C] p-1 text-slate-400 hover:text-white hover:border-white/30 hover:bg-[#202028] focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
        title={title}
        aria-label={title}
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-xl border border-white/15 bg-[#0D0D12] p-4 shadow-2xl backdrop-blur-md"
          >
            {/* Top Pointer Arrow */}
            <div className="absolute -top-1.5 right-2.5 w-3 h-3 rotate-45 border-t border-l border-white/15 bg-[#0D0D12]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/[0.08]">
                <h4 className="text-xs font-bold text-white font-display flex items-center gap-1.5">
                  <span className="text-blue-400"></span> {title}
                </h4>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-slate-500 hover:text-slate-300 text-xs font-mono px-1"
                >
                  ✕
                </button>
              </div>

              {description && (
                <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
                  {description}
                </p>
              )}

              {items && items.length > 0 && (
                <ul className="space-y-2">
                  {items.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-[11px] text-slate-300 bg-[#14141A] rounded-lg p-2 border border-white/[0.04] flex items-start gap-2"
                    >
                      <span className="shrink-0 mt-0.5">{item.icon || '•'}</span>
                      <div>
                        <strong className="text-white block font-semibold">{item.label}</strong>
                        <span className="text-slate-400 leading-normal">{item.text}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Deterministic Safety Boundary</span>
                <span className="text-blue-400">Stopping Rules v2</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

