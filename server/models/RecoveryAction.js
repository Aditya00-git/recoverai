const mongoose = require('mongoose');

const recoveryActionSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: ['transaction', 'checkout', 'invoice', 'subscription'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  actionType: {
    type: String,
    enum: ['retry_payment', 'send_reminder', 'offer_incentive', 'escalate_human', 'no_action'],
    required: true,
  },
  reasoning: {
    type: String,
    required: true,
  },
  messageDraft: {
    type: String,
    default: '',
  },
  channel: {
    type: String,
    enum: ['whatsapp', 'email', 'none'],
    default: 'none',
  },
  retrySchedule: {
    type: String, // e.g. "1st of Month (Salary sync)" or "T+24h (Off-peak window)"
    default: '',
  },
  ptpDate: {
    type: Date, // tracked Promise-to-Pay commitment date if applicable
    default: null,
  },
  attemptNumber: {
    type: Number,
    default: 1,
  },
  outcome: {
    type: String,
    enum: ['success', 'failed', 'pending', 'stopped_by_rule'],
    default: 'pending',
  },
  amountRecovered: {
    type: Number,
    default: 0,
  },
  executedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('RecoveryAction', recoveryActionSchema);