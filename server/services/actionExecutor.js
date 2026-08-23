const RecoveryAction = require('../models/RecoveryAction');
const AuditLog = require('../models/AuditLog');
const { decideBatch } = require('./agentDecision');
const {
  MAX_RETRY_ATTEMPTS,
  COOLDOWN_HOURS_BETWEEN_ATTEMPTS,
  MIN_AMOUNT_FOR_ACTION,
} = require('../config/stoppingRules');

const BATCH_SIZE = 8; // items per Gemini call — keeps total API calls low for tight free-tier quotas
const DELAY_BETWEEN_BATCHES_MS = 4000; // spread batches out to respect per-minute limits too

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Maps a detection item's "type" field to the RecoveryAction schema's targetType enum
function getTargetType(item) {
  if (item.type === 'failed_payment') return 'transaction';
  if (item.type === 'abandoned_checkout') return 'checkout';
  if (item.type === 'overdue_invoice') return 'invoice';
  return 'transaction'; // fallback, should never hit this
}

// Checks stopping rules BEFORE calling the agent — saves an API call and enforces hard limits.
async function checkStoppingRules(item) {
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

// Simulates executing the chosen action — see Day 4 notes on why this is simulated.
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

// Saves a stopping-rule-blocked item (no agent call needed)
async function saveBlockedAction(item, reason) {
  const action = await RecoveryAction.create({
    targetType: getTargetType(item),
    targetId: item.targetId,
    actionType: 'no_action',
    reasoning: `Stopping rule triggered: ${reason}`,
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

// Saves an executed action after the agent has made a decision
async function saveExecutedAction(item, decision, attemptNumber) {
  await AuditLog.create({
    event: 'agent_decided',
    details: { targetId: item.targetId, decision, item },
  });

  const outcome = simulateExecution(decision.actionType);
  const amountRecovered = outcome === 'success' ? item.amount : 0;

  const action = await RecoveryAction.create({
    targetType: getTargetType(item),
    targetId: item.targetId,
    actionType: decision.actionType,
    reasoning: decision.reasoning,
    messageDraft: decision.messageDraft || '',
    channel: decision.channel || 'none',
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

// Processes a whole batch of at-risk items, using BATCHED Gemini calls to conserve quota.
async function processBatch(items) {
  const results = [];
  const itemsNeedingDecision = []; // items that passed stopping-rule checks, need the agent

  // Step 1: run stopping-rule checks for everything first (cheap, no API calls)
  for (const item of items) {
    const ruleCheck = await checkStoppingRules(item);

    if (ruleCheck.blocked) {
      const action = await saveBlockedAction(item, ruleCheck.reason);
      results.push(action);
    } else {
      itemsNeedingDecision.push({ item, attemptNumber: ruleCheck.attemptNumber });
    }
  }

  // Step 2: process the remaining items in small batches, one Gemini call per batch
  for (let i = 0; i < itemsNeedingDecision.length; i += BATCH_SIZE) {
    const chunk = itemsNeedingDecision.slice(i, i + BATCH_SIZE);
    const decisions = await decideBatch(chunk.map((c) => c.item));

    for (let j = 0; j < chunk.length; j++) {
      const { item, attemptNumber } = chunk[j];
      const decision = decisions[j];
      const action = await saveExecutedAction(item, decision, attemptNumber);
      results.push(action);
    }

    // Pause between batches (not needed after the last one)
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