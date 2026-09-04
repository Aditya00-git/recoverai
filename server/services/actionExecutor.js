const RecoveryAction = require('../models/RecoveryAction');
const AuditLog = require('../models/AuditLog');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Checkout = require('../models/Checkout');
const { checkStoppingRules } = require('../config/stoppingRules');
const { decideBatch } = require('./agentDecision');

const BATCH_SIZE = 15; // Larger batch size for fast execution

function getTargetType(item) {
  if (item.type === 'failed_payment') return 'transaction';
  if (item.type === 'abandoned_checkout') return 'checkout';
  if (item.type === 'failed_subscription') return 'subscription';
  if (item.type === 'overdue_invoice') return 'invoice';
  return 'transaction';
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
  if (actionType === 'escalate_human') return 'pending';
  if (actionType === 'no_action') return 'resolved';

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

  // 1. Evaluate stopping rules
  for (const item of items) {
    const ruleCheck = await checkStoppingRules(item);

    if (ruleCheck.blocked) {
      const action = await saveBlockedAction(item, ruleCheck.reason);
      results.push(action);
    } else {
      itemsNeedingDecision.push({ item, attemptNumber: ruleCheck.attemptNumber });
    }
  }

  // 2. Chunk items for parallel AI decisioning
  const chunks = [];
  for (let i = 0; i < itemsNeedingDecision.length; i += BATCH_SIZE) {
    chunks.push(itemsNeedingDecision.slice(i, i + BATCH_SIZE));
  }

  // 3. Process chunks concurrently
  const chunkResults = await Promise.all(
    chunks.map(async (chunk) => {
      const decisions = await decideBatch(chunk.map((c) => c.item));
      const chunkSavedActions = [];

      for (let j = 0; j < chunk.length; j++) {
        const { item, attemptNumber } = chunk[j];
        const decision = decisions[j] || { actionType: 'no_action', reasoning: 'Processed' };
        const action = await saveExecutedAction(item, decision, attemptNumber);
        chunkSavedActions.push(action);
      }

      return chunkSavedActions;
    })
  );

  chunkResults.forEach((chunkActions) => {
    results.push(...chunkActions);
  });

  const processedCount = results.length;
  const successCount = results.filter((r) => r.outcome === 'success').length;
  const stoppedCount = results.filter((r) => r.outcome === 'stopped_by_rule').length;
  const totalRecovered = results.reduce((sum, r) => sum + (r.amountRecovered || 0), 0);

  return {
    processedCount,
    successCount,
    stoppedCount,
    totalRecovered,
  };
}

module.exports = { processBatch };