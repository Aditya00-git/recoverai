const RecoveryAction = require('../models/RecoveryAction');
const AuditLog = require('../models/AuditLog');
const { decideAction } = require('./agentDecision');
const {
  MAX_RETRY_ATTEMPTS,
  COOLDOWN_HOURS_BETWEEN_ATTEMPTS,
  MIN_AMOUNT_FOR_ACTION,
} = require('../config/stoppingRules');

// Checks stopping rules BEFORE calling the agent — saves an API call and enforces hard limits.
// Returns null if allowed to proceed, or a "stopped" decision object if a rule blocks it.
async function checkStoppingRules(item) {
  // Rule 1: amount too small to bother with
  if (item.amount < MIN_AMOUNT_FOR_ACTION) {
    return { blocked: true, reason: `Amount below minimum threshold (₹${MIN_AMOUNT_FOR_ACTION / 100})` };
  }

  // Rule 2: check existing recovery attempts for this exact target
  const previousAttempts = await RecoveryAction.find({ targetId: item.targetId }).sort({ executedAt: -1 });

  if (previousAttempts.length >= MAX_RETRY_ATTEMPTS) {
    return { blocked: true, reason: `Max retry attempts (${MAX_RETRY_ATTEMPTS}) already reached` };
  }

  // Rule 3: cooldown period since last attempt
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

// Simulates executing the chosen action. In a real system this would call
// Razorpay's retry API, send an actual email, etc. Here we simulate a realistic
// outcome so the dashboard has believable success/failure data to show.
function simulateExecution(actionType) {
  const successProbabilities = {
    retry_payment: 0.55,     // retries succeed about half the time, realistic
    send_reminder: 0.35,     // reminders convert less often
    offer_incentive: 0.50,   // incentives boost conversion vs plain reminder
    escalate_human: 0,       // outcome pending, human hasn't acted yet
    no_action: 0,            // no action taken, no outcome
  };

  const successChance = successProbabilities[actionType] ?? 0;
  if (actionType === 'escalate_human' || actionType === 'no_action') return 'pending';

  return Math.random() < successChance ? 'success' : 'failed';
}

// Processes ONE at-risk item end to end: checks rules, calls agent, executes, logs.
async function processItem(item) {
  const ruleCheck = await checkStoppingRules(item);

  if (ruleCheck.blocked) {
    const action = await RecoveryAction.create({
      targetType: item.type === 'failed_payment' ? 'transaction' : 'checkout',
      targetId: item.targetId,
      actionType: 'no_action',
      reasoning: `Stopping rule triggered: ${ruleCheck.reason}`,
      outcome: 'stopped_by_rule',
      amountRecovered: 0,
    });

    await AuditLog.create({
      recoveryActionId: action._id,
      event: 'stopping_rule_triggered',
      details: { reason: ruleCheck.reason, item },
    });

    return action;
  }

  // Rules passed — ask the agent to decide
  const decision = await decideAction(item);

  await AuditLog.create({
    event: 'agent_decided',
    details: { targetId: item.targetId, decision, item },
  });

  const outcome = simulateExecution(decision.actionType);
  const amountRecovered = outcome === 'success' ? item.amount : 0;

  const action = await RecoveryAction.create({
    targetType: item.type === 'failed_payment' ? 'transaction' : 'checkout',
    targetId: item.targetId,
    actionType: decision.actionType,
    reasoning: decision.reasoning,
    attemptNumber: ruleCheck.attemptNumber,
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

// Processes a whole batch of at-risk items (called by the /api/agent/run route)
async function processBatch(items) {
  const results = [];
  for (const item of items) {
    const result = await processItem(item);
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 1500)); // small pause between calls
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

module.exports = { processItem, processBatch, checkStoppingRules };