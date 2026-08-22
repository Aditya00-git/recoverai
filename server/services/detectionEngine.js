const Transaction = require('../models/Transaction');
const Checkout = require('../models/Checkout');

// ---- RECOVERY BUCKET MAPPING ----
// Maps a failure reason to a recovery strategy category.
// This is domain knowledge encoded as rules — the agent (Day 4) picks the SPECIFIC
// action, but this bucket narrows down what KIND of action makes sense.
const RECOVERY_BUCKET_MAP = {
  insufficient_funds: 'retry_later',      // wait, funds may be available later
  card_declined: 'retry_different_method', // suggest UPI/netbanking instead
  bank_timeout: 'retry_now',               // transient issue, safe to retry immediately
  payment_cancelled: 'retry_now',          // user backed out, worth a nudge
  invalid_otp: 'needs_user_reentry',       // can't silently retry, needs fresh OTP
};

// ---- PRIORITY SCORING ----
// Higher score = more worth recovering. Combines amount (bigger loss = more urgent)
// and recency (older failures are less likely to convert, so score decays over time).
function calculatePriorityScore(amount, createdAt) {
  const amountInRupees = amount / 100;
  const hoursSinceFailure = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

  // Amount score: normalize against a typical ₹15,000 max transaction (from our seed range)
  const amountScore = Math.min(amountInRupees / 15000, 1) * 10; // 0-10 scale

  // Recency decay: full score within first 24h, decays after that
  const recencyMultiplier = hoursSinceFailure <= 24
    ? 1
    : Math.max(0.3, 1 - (hoursSinceFailure - 24) / (24 * 7)); // decays over a week, floors at 0.3

  return parseFloat((amountScore * recencyMultiplier).toFixed(2));
}

// ---- FAILED PAYMENT DETECTOR ----
async function detectFailedPayments() {
  const failedTransactions = await Transaction.find({ status: 'failed' }).lean();

  return failedTransactions.map((tx) => ({
    type: 'failed_payment',
    targetId: tx._id,
    customerId: tx.customerId,
    amount: tx.amount,
    method: tx.method,
    errorReason: tx.errorReason || 'unknown',
    errorCode: tx.errorCode || 'unknown',
    recoveryBucket: RECOVERY_BUCKET_MAP[tx.errorReason] || 'needs_manual_review',
    priorityScore: calculatePriorityScore(tx.amount, tx.createdAt),
    isSubscription: tx.isSubscription,
    createdAt: tx.createdAt,
    source: tx.source,
  }));
}

// ---- ABANDONED CHECKOUT DETECTOR ----
const ABANDONMENT_THRESHOLD_MINUTES = 30; // must be inactive this long to count as "confirmed abandoned"

async function detectAbandonedCheckouts() {
  const now = Date.now();

  const abandonedCheckouts = await Checkout.find({ status: 'abandoned' }).lean();

  // Only count ones where enough time has passed since last activity —
  // avoids flagging sessions that might still be in progress
  const confirmed = abandonedCheckouts.filter((ck) => {
    const minutesSinceActivity = (now - new Date(ck.lastActivityAt).getTime()) / (1000 * 60);
    return minutesSinceActivity >= ABANDONMENT_THRESHOLD_MINUTES;
  });

  return confirmed.map((ck) => ({
    type: 'abandoned_checkout',
    targetId: ck._id,
    customerId: ck.customerId,
    amount: ck.cartValue,
    recoveryBucket: 'checkout_nudge', // one clear bucket for all abandoned carts
    priorityScore: calculatePriorityScore(ck.cartValue, ck.createdAt),
    createdAt: ck.createdAt,
    lastActivityAt: ck.lastActivityAt,
  }));
}

// ---- MAIN ENTRY POINT ----
async function runDetection() {
  const [failedPayments, abandonedCheckouts] = await Promise.all([
    detectFailedPayments(),
    detectAbandonedCheckouts(),
  ]);

  const allItems = [...failedPayments, ...abandonedCheckouts]
    .sort((a, b) => b.priorityScore - a.priorityScore); // highest priority first

  const totalAtRisk = allItems.reduce((sum, item) => sum + item.amount, 0);

  // Quick breakdown by recovery bucket — useful for dashboard summary cards
  const bucketBreakdown = {};
  for (const item of allItems) {
    bucketBreakdown[item.recoveryBucket] = (bucketBreakdown[item.recoveryBucket] || 0) + 1;
  }

  return {
    totalAtRisk,               // paise
    totalItemsFlagged: allItems.length,
    failedPaymentsCount: failedPayments.length,
    abandonedCheckoutsCount: abandonedCheckouts.length,
    bucketBreakdown,
    items: allItems,
  };
}

module.exports = { runDetection, detectFailedPayments, detectAbandonedCheckouts };