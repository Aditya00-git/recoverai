import { motion, AnimatePresence } from 'framer-motion';

function ChannelPreview({ channel, message }) {
  if (channel === 'whatsapp') {
    return (
      <div className="bg-[#0a1014] rounded-lg p-4 border border-hairline">
        <p className="font-mono text-[10px] uppercase tracking-wider text-mint mb-3">WhatsApp Message</p>
        <div className="bg-[#1f2c26] rounded-lg rounded-tl-none px-4 py-3 max-w-sm">
          <p className="text-paper text-sm leading-relaxed">{message}</p>
        </div>
      </div>
    );
  }

  if (channel === 'email') {
    return (
      <div className="bg-panel-raised rounded-lg p-4 border border-hairline">
        <p className="font-mono text-[10px] uppercase tracking-wider text-gold mb-3">Email Draft</p>
        <div className="bg-paper text-ink rounded p-4">
          <p className="text-xs text-ink/50 mb-2 pb-2 border-b border-ink/10">
            Subject: Payment Reminder — Invoice Follow-up
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-line">{message}</p>
        </div>
      </div>
    );
  }

  return <p className="text-paper-dim text-sm">No message generated for this action type.</p>;
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
            className="fixed inset-0 bg-black/60 z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-panel border border-hairline rounded-lg p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg">Generated Recovery Message</h3>
                <button
                  onClick={onClose}
                  className="text-paper-dim hover:text-paper text-sm"
                >
                  ✕
                </button>
              </div>

              <ChannelPreview channel={channel} message={message} />

              <p className="text-paper-dim text-xs mt-4 leading-relaxed">
                <span className="text-gold">Why this action:</span> {reasoning}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MessagePreviewModal;