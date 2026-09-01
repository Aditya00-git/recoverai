const RecoveryAction = require('../models/RecoveryAction');
const AuditLog = require('../models/AuditLog');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Checkout = require('../models/Checkout');
const { decideBatch } = require('./agentDecision');
const {
  MAX_RETRY_ATTEMPTS,
  COOLDOWN_HOURS_BETWEEN_ATTEMPTS,
  MIN_AMOUNT_FOR_ACTION,
} = require('../config/stoppingRules');

const BATCH_SIZE = 8;
const DELAY_BETWEEN_BATCHES_MS = 4000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTargetType(item) {
  if (item.type === 'failed_subscription') return 'subscription';
  if (item.type === 'failed_payment') return 'transaction';
  if (item.type === 'abandoned_checkout') return 'checkout';
  if (item.type === 'overdue_invoice') return 'invoice';
  return 'transaction';
}

async function checkStoppingRules(item) {
  if (item.recoveryBucket === 'ptp_grace_period') {
    return {
      blocked: true,
      reason: `Promise-to-Pay commitment active (promised by ${new Date(item.ptpDate).toLocaleDateString('en-IN')}) — dunning paused.`,
    };
  }

  if (item.amount < MIN_AMOUNT_FOR_ACTION) {
    return { blocked: true, reason: `Amount below minimum threshold (₹${MIN_AMOUNT_FOR_ACTION / 100})` };
  }

  const previousAttempts = await RecoveryAction.find({ targetId: item.targetId }).sort({ executedAt: -1 });

  if (previousAttempts.length >= MAX_RETRY_ATTEMPTS) {
    return { blocked: true, reason: `Max retry attempts (${MAX_RETRY_ATTEMPTS}) already reached` };
  }

  if (previousAttempts.length > 0) {
    const lastAttempt = previousAttempts[0];
    const hoursSinceLastAttempt = (Date.now() - new Date(lastAttempt.executedAt).getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastAttempt < COOLDOWN_HOURS_BETWEEN_ATTEMPTS) {
      return {
        blocked: true,
        reason: `Cooldown active — last attempt was ${hoursSinceLastAttempt.toFixed(1)}h ago, needs ${COOLDOWN_HOURS_BETWEEN_ATTEMPTS}h`,
      };
    }
  }

  return { blocked: false, attemptNumber: previousAttempts.length + 1 };
}

function simulateExecution(actionType) {
  const successProbabilities = {
    retry_payment: 0.55,
    send_reminder: 0.35,
    offer_incentive: 0.50,
    escalate_human: 0,
    no_action: 0,
  };

  const successChance = successProbabilities[actionType] ?? 0;
  if (actionType === 'escalate_human' || actionType === 'no_action') return 'pending';

  return Math.random() < successChance ? 'success' : 'failed';
}

async function saveBlockedAction(item, reason) {
  const action = await RecoveryAction.create({
    targetType: getTargetType(item),
    targetId: item.targetId,
    actionType: 'no_action',
    reasoning: `Stopping rule triggered: ${reason}`,
    ptpDate: item.ptpDate || null,
    outcome: 'stopped_by_rule',
    amountRecovered: 0,
  });

  await AuditLog.create({
    recoveryActionId: action._id,
    event: 'stopping_rule_triggered',
    details: { reason, item },
  });

  return action;
}

async function saveExecutedAction(item, decision, attemptNumber) {
  await AuditLog.create({
    event: 'agent_decided',
    details: { targetId: item.targetId, decision, item },
  });

  const outcome = simulateExecution(decision.actionType);
  const amountRecovered = outcome === 'success' ? item.amount : 0;

  // Real-world state transition: mark underlying document as converted/paid!
  if (outcome === 'success') {
    if (item.type === 'failed_payment' || item.type === 'failed_subscription') {
      await Transaction.findByIdAndUpdate(item.targetId, { status: 'captured' });
    } else if (item.type === 'overdue_invoice') {
      await Invoice.findByIdAndUpdate(item.targetId, { status: 'paid' });
    } else if (item.type === 'abandoned_checkout') {
      await Checkout.findByIdAndUpdate(item.targetId, { status: 'completed' });
    }
  }

  const action = await RecoveryAction.create({
    targetType: getTargetType(item),
    targetId: item.targetId,
    actionType: decision.actionType,
    reasoning: decision.reasoning,
    messageDraft: decision.messageDraft || '',
    channel: decision.channel || 'none',
    retrySchedule: item.retrySchedule || decision.retrySchedule || '',
    ptpDate: item.ptpDate || null,
    attemptNumber,
    outcome,
    amountRecovered,
  });

  await AuditLog.create({
    recoveryActionId: action._id,
    event: 'action_executed',
    details: { actionType: decision.actionType, outcome, amountRecovered },
  });

  return action;
}

async function processBatch(items) {
  const results = [];
  const itemsNeedingDecision = [];

  for (const item of items) {
    const ruleCheck = await checkStoppingRules(item);

    if (ruleCheck.blocked) {
      const action = await saveBlockedAction(item, ruleCheck.reason);
      results.push(action);
    } else {
      itemsNeedingDecision.push({ item, attemptNumber: ruleCheck.attemptNumber });
    }
  }

  for (let i = 0; i < itemsNeedingDecision.length; i += BATCH_SIZE) {
    const chunk = itemsNeedingDecision.slice(i, i + BATCH_SIZE);
    const decisions = await decideBatch(chunk.map((c) => c.item));

    for (let j = 0; j < chunk.length; j++) {
      const { item, attemptNumber } = chunk[j];
      const decision = decisions[j];
      const action = await saveExecutedAction(item, decision, attemptNumber);
      results.push(action);
    }

    if (i + BATCH_SIZE < itemsNeedingDecision.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  const totalRecovered = results.reduce((sum, r) => sum + (r.amountRecovered || 0), 0);
  const successCount = results.filter((r) => r.outcome === 'success').length;
  const stoppedCount = results.filter((r) => r.outcome === 'stopped_by_rule').length;

  return {
    processedCount: results.length,
    successCount,
    stoppedCount,
    totalRecovered,
    actions: results,
  };
}

module.exports = { processBatch, checkStoppingRules };