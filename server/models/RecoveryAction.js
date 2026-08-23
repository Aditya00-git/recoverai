const mongoose = require('mongoose');

const recoveryActionSchema = new mongoose.Schema({
    targetType: {
    type: String, // what this recovery action is for
    enum: ['transaction', 'checkout', 'invoice'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId, // refers to a Transaction or Checkout _id
    required: true,
  },
  actionType: {
    type: String, // the bounded menu of actions the agent can choose from
    enum: ['retry_payment', 'send_reminder', 'offer_incentive', 'escalate_human', 'no_action'],
    required: true,
  },
  reasoning: {
    type: String, // the LLM's explanation for why it chose this action (explainability)
    required: true,
  },
  attemptNumber: {
    type: Number, // tracks retry count, enforced against stopping rules
    default: 1,
  },
  outcome: {
    type: String,
    enum: ['success', 'failed', 'pending', 'stopped_by_rule'],
    default: 'pending',
  },
  amountRecovered: {
    type: Number, // paise, filled in if outcome = success
    default: 0,
  },
  executedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('RecoveryAction', recoveryActionSchema);