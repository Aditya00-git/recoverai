// These are HARD LIMITS enforced in code, not suggestions to the LLM.
// The agent's decision is checked against these BEFORE and AFTER — it cannot override them.
// This is what makes the system "bounded and gated" as required by the brief.

const RecoveryAction = require('../models/RecoveryAction');

const RULES = {
  MAX_RETRY_ATTEMPTS: 3,              // never retry a failed payment more than 3 times
  COOLDOWN_HOURS_BETWEEN_ATTEMPTS: 6, // wait at least 6h between recovery attempts on same target
  MAX_CONTACT_ATTEMPTS: 3,            // never message the same customer more than 3 times for one issue
  MIN_AMOUNT_FOR_ACTION: 10000,       // paise (₹100) — skip tiny amounts, not worth the friction/cost
};

async function checkStoppingRules(item) {
  // 1. Minimum Amount Rule
  if (item.amount && item.amount < RULES.MIN_AMOUNT_FOR_ACTION) {
    return {
      blocked: true,
      reason: 'Amount below ₹100 minimum threshold',
      attemptNumber: 1,
    };
  }

  // 2. Irreversible Failure Rule (Never auto-retry unrecoverable errors)
  if (item.errorReason === 'invalid_otp' || item.errorReason === 'expired_card') {
    return {
      blocked: true,
      reason: `Unrecoverable failure reason (${item.errorReason})`,
      attemptNumber: 1,
    };
  }

  // 3. Check past action history on this target
  try {
    const pastActions = await RecoveryAction.find({ targetId: item.targetId })
      .sort({ executedAt: -1 })
      .lean();

    const attemptNumber = pastActions.length + 1;

    // 4. Max Attempts Rule
    if (pastActions.length >= RULES.MAX_RETRY_ATTEMPTS) {
      return {
        blocked: true,
        reason: `Maximum attempts (${RULES.MAX_RETRY_ATTEMPTS}) reached for this item`,
        attemptNumber,
      };
    }

    // 5. Cooldown Rule
    if (pastActions.length > 0) {
      const lastAction = pastActions[0];
      const hoursSinceLast = (Date.now() - new Date(lastAction.executedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < RULES.COOLDOWN_HOURS_BETWEEN_ATTEMPTS) {
        return {
          blocked: true,
          reason: `Cooldown active: ${hoursSinceLast.toFixed(1)}h elapsed (minimum ${RULES.COOLDOWN_HOURS_BETWEEN_ATTEMPTS}h required)`,
          attemptNumber,
        };
      }
    }

    return {
      blocked: false,
      attemptNumber,
    };
  } catch (err) {
    return {
      blocked: false,
      attemptNumber: 1,
    };
  }
}

module.exports = {
  ...RULES,
  checkStoppingRules,
};