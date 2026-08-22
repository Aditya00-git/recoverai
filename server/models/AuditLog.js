const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  recoveryActionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecoveryAction',
    default: null,
  },
  event: {
    type: String, // short label, e.g. "detected_failure", "agent_decided", "action_executed", "stopping_rule_triggered"
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // flexible field for any extra context (JSON blob)
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);