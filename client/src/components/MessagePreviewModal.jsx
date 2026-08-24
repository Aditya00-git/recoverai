import { motion, AnimatePresence } from 'framer-motion';

function ChannelPreview({ channel, message }) {
  if (channel === 'whatsapp') {
    return (
      <div className="bg-[#0B141A] rounded-xl p-4 border border-emerald-500/30 shadow-2xl">
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
          <p className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
            <span>💬</span> WhatsApp Business Delivery
          </p>
          <span className="font-mono text-[11px] text-slate-400">Delivered · Read</span>
        </div>
        <div className="bg-[#005C4B] rounded-xl rounded-tl-none px-4 py-3 max-w-sm text-white text-sm leading-relaxed shadow-lg font-sans">
          <p>{message}</p>
          <span className="block text-right font-mono text-[10px] text-white/60 mt-1.5">
            10:42 AM ✓✓
          </span>
        </div>
      </div>
    );
  }

  if (channel === 'email') {
    return (
      <div className="bg-[#0E121A] rounded-xl p-4 border border-white/15 shadow-2xl">
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
          <p className="font-mono text-xs uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
            <span>✉️</span> B2B Email Notification
          </p>
          <span className="font-mono text-[11px] text-slate-400">Formal Dunning</span>
        </div>
        <div className="bg-slate-900 border border-white/10 text-slate-100 rounded-lg p-4 text-sm leading-relaxed">
          <p className="font-mono text-xs text-slate-400 mb-2 pb-2 border-b border-white/10">
            <strong className="text-white">Subject:</strong> Urgent: Payment Settlement & Invoice Follow-up
          </p>
          <p className="whitespace-pre-line text-slate-200 text-sm leading-relaxed">{message}</p>
        </div>
      </div>
    );
  }

  return <p className="text-slate-400 text-sm">No message generated for this action type.</p>;
}

function MessagePreviewModal({ isOpen, onClose, message, channel, reasoning }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg px-4"
          >
            <div className="glass-panel bg-[#0D1017] border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <h3 className="font-display text-lg font-bold text-white">Generated Intervention Message</h3>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white text-base w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              <ChannelPreview channel={channel} message={message} />

              <div className="mt-4 p-3 bg-slate-900/60 border border-white/10 rounded-xl">
                <p className="text-slate-300 text-xs leading-relaxed">
                  <span className="text-amber-400 font-mono font-semibold text-xs">Why this intervention:</span> {reasoning}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MessagePreviewModal;