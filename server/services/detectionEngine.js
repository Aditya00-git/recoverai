const Transaction = require('../models/Transaction');
const Checkout = require('../models/Checkout');
const Invoice = require('../models/Invoice');

// ---- RECOVERY BUCKET MAPPING ----
const RECOVERY_BUCKET_MAP = {
  insufficient_funds: 'retry_later',
  card_declined: 'retry_different_method',
  bank_timeout: 'retry_now',
  payment_cancelled: 'retry_now',
  invalid_otp: 'needs_user_reentry',
};

// ---- PRIORITY SCORING ----
function calculatePriorityScore(amount, createdAt, isInvoice = false) {
  const amountInRupees = amount / 100;
  const maxBenchmark = isInvoice ? 250000 : 15000;
  const amountScore = Math.min(amountInRupees / maxBenchmark, 1) * 10;

  const hoursSinceFailure = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

  if (isInvoice) {
    const daysOverdue = hoursSinceFailure / 24;
    const agingMultiplier = daysOverdue > 30 ? 1.0 : daysOverdue > 15 ? 0.85 : 0.7;
    return parseFloat((amountScore * agingMultiplier).toFixed(2));
  }

  const recencyMultiplier = hoursSinceFailure <= 24
    ? 1
    : Math.max(0.3, 1 - (hoursSinceFailure - 24) / (24 * 7));

  return parseFloat((amountScore * recencyMultiplier).toFixed(2));
}

// Computes smart mandate retry schedule based on failure reason and Indian salary credit windows
function computeMandateSchedule(errorReason) {
  if (errorReason === 'insufficient_funds') {
    return '1st of Month (Salary credit sync)';
  }
  if (errorReason === 'bank_timeout') {
    return 'T+12h (Off-peak maintenance window)';
  }
  return 'T+24h (Standard Mandate Retry)';
}

// ---- FAILED CONSUMER PAYMENTS & RECURRING MANDATES ----
async function detectFailedPayments() {
  const failedTransactions = await Transaction.find({ status: 'failed' }).lean();

  return failedTransactions.map((tx) => {
    const isSub = tx.isSubscription || false;
    const recoveryBucket = isSub && tx.errorReason === 'insufficient_funds'
      ? 'mandate_salary_sync'
      : RECOVERY_BUCKET_MAP[tx.errorReason] || 'needs_manual_review';

    return {
      type: isSub ? 'failed_subscription' : 'failed_payment',
      targetId: tx._id,
      customerId: tx.customerId,
      amount: tx.amount,
      method: tx.method,
      errorReason: tx.errorReason || 'unknown',
      errorCode: tx.errorCode || 'unknown',
      recoveryBucket,
      retrySchedule: isSub ? computeMandateSchedule(tx.errorReason) : '',
      priorityScore: calculatePriorityScore(tx.amount, tx.createdAt),
      isSubscription: isSub,
      createdAt: tx.createdAt,
      source: tx.source,
    };
  });
}

// ---- ABANDONED CHECKOUT DETECTOR ----
const ABANDONMENT_THRESHOLD_MINUTES = 30;

async function detectAbandonedCheckouts() {
  const now = Date.now();
  const abandonedCheckouts = await Checkout.find({ status: 'abandoned' }).lean();

  const confirmed = abandonedCheckouts.filter((ck) => {
    const minutesSinceActivity = (now - new Date(ck.lastActivityAt).getTime()) / (1000 * 60);
    return minutesSinceActivity >= ABANDONMENT_THRESHOLD_MINUTES;
  });

  return confirmed.map((ck) => ({
    type: 'abandoned_checkout',
    targetId: ck._id,
    customerId: ck.customerId,
    amount: ck.cartValue,
    recoveryBucket: 'checkout_nudge',
    priorityScore: calculatePriorityScore(ck.cartValue, ck.createdAt),
    createdAt: ck.createdAt,
    lastActivityAt: ck.lastActivityAt,
  }));
}

// ---- OVERDUE INVOICE DETECTOR (WITH PROMISE-TO-PAY TRACKER) ----
function getAgingBucketAndBucketName(daysOverdue, clientTier, promiseToPayDate) {
  const now = new Date();

  // If customer promised to pay and date is still in the future, pause dunning!
  if (promiseToPayDate && new Date(promiseToPayDate) > now) {
    return { agingBucket: 'PTP Active', recoveryBucket: 'ptp_grace_period' };
  }

  const leniencyDays = clientTier === 'enterprise' ? 7 : 0;
  const adjustedDays = Math.max(0, daysOverdue - leniencyDays);

  if (adjustedDays <= 15) {
    return { agingBucket: '1-15 days', recoveryBucket: 'gentle_nudge' };
  } else if (adjustedDays <= 30) {
    return { agingBucket: '16-30 days', recoveryBucket: 'finance_head_escalation' };
  } else {
    return { agingBucket: '30+ days', recoveryBucket: 'formal_notice' };
  }
}

async function detectOverdueInvoices() {
  const overdueInvoices = await Invoice.find({ status: 'overdue' }).lean();
  const now = Date.now();

  return overdueInvoices.map((inv) => {
    const daysOverdue = Math.floor((now - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    const { agingBucket, recoveryBucket } = getAgingBucketAndBucketName(
      daysOverdue,
      inv.clientTier,
      inv.promiseToPayDate
    );

    return {
      type: 'overdue_invoice',
      targetId: inv._id,
      customerId: inv.clientName,
      amount: inv.amount,
      clientTier: inv.clientTier,
      invoiceNumber: inv.invoiceNumber,
      daysOverdue,
      agingBucket,
      recoveryBucket,
      ptpDate: inv.promiseToPayDate || null,
      priorityScore: calculatePriorityScore(inv.amount, inv.dueDate, true),
      createdAt: inv.createdAt,
      dueDate: inv.dueDate,
    };
  });
}

// ---- MAIN ENTRY POINT ----
async function runDetection() {
  const [paymentsAndSubs, abandonedCheckouts, overdueInvoices] = await Promise.all([
    detectFailedPayments(),
    detectAbandonedCheckouts(),
    detectOverdueInvoices(),
  ]);

  const allItems = [...paymentsAndSubs, ...abandonedCheckouts, ...overdueInvoices].sort(
    (a, b) => b.priorityScore - a.priorityScore
  );

  const totalAtRisk = allItems.reduce((sum, item) => sum + item.amount, 0);

  const bucketBreakdown = {};
  for (const item of allItems) {
    bucketBreakdown[item.recoveryBucket] = (bucketBreakdown[item.recoveryBucket] || 0) + 1;
  }

  return {
    totalAtRisk,
    totalItemsFlagged: allItems.length,
    paymentsCount: paymentsAndSubs.filter((p) => p.type === 'failed_payment').length,
    subscriptionsCount: paymentsAndSubs.filter((p) => p.type === 'failed_subscription').length,
    abandonedCheckoutsCount: abandonedCheckouts.length,
    overdueInvoicesCount: overdueInvoices.length,
    bucketBreakdown,
    items: allItems,
  };
}

module.exports = {
  runDetection,
  detectFailedPayments,
  detectAbandonedCheckouts,
  detectOverdueInvoices,
};