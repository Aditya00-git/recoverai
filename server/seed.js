require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const Checkout = require('./models/Checkout');

// ---- CONFIG: tune these numbers to control how much data you get ----
const NUM_TRANSACTIONS = 150;
const NUM_CHECKOUTS = 60;
const DAYS_SPREAD = 30; // spread records over the last 30 days, looks realistic

// ---- REALISTIC DISTRIBUTIONS (based on typical Indian payment gateway data) ----
const METHODS = ['card', 'upi', 'netbanking', 'wallet'];
const METHOD_WEIGHTS = [0.35, 0.45, 0.15, 0.05]; // UPI dominates in India, matches real usage

// Failure reasons mapped to Razorpay's actual error taxonomy
const FAILURE_REASONS = [
  { errorCode: 'BAD_REQUEST_ERROR', errorReason: 'insufficient_funds', weight: 0.30 },
  { errorCode: 'GATEWAY_ERROR', errorReason: 'bank_timeout', weight: 0.20 },
  { errorCode: 'BAD_REQUEST_ERROR', errorReason: 'card_declined', weight: 0.25 },
  { errorCode: 'BAD_REQUEST_ERROR', errorReason: 'invalid_otp', weight: 0.10 },
  { errorCode: 'GATEWAY_ERROR', errorReason: 'payment_cancelled', weight: 0.15 },
];

const OVERALL_SUCCESS_RATE = 0.72; // 72% success, 28% failure — realistic for Indian merchants

// ---- HELPERS ----
function weightedRandom(items, weights) {
  const r = Math.random();
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += weights[i];
    if (r <= sum) return items[i];
  }
  return items[items.length - 1];
}

function pickFailureReason() {
  const r = Math.random();
  let sum = 0;
  for (const f of FAILURE_REASONS) {
    sum += f.weight;
    if (r <= sum) return f;
  }
  return FAILURE_REASONS[0];
}

function randomPastDate(daysSpread) {
  const now = Date.now();
  const past = now - Math.random() * daysSpread * 24 * 60 * 60 * 1000;
  return new Date(past);
}

function randomCustomerId(pool = 40) {
  // reuse a pool of ~40 fake customers so some customers have multiple transactions
  // (more realistic than every transaction being a unique stranger)
  return `cust_${String(Math.floor(Math.random() * pool) + 1).padStart(3, '0')}`;
}

function randomAmount() {
  // amounts in paise, ranging ₹100 to ₹15,000 — typical e-commerce/subscription range
  const rupees = Math.floor(Math.random() * 14900) + 100;
  return rupees * 100;
}

// ---- GENERATORS ----
function generateTransaction() {
  const isSuccess = Math.random() < OVERALL_SUCCESS_RATE;
  const method = weightedRandom(METHODS, METHOD_WEIGHTS);

  const base = {
    merchantId: 'merchant_demo_1',
    customerId: randomCustomerId(),
    amount: randomAmount(),
    currency: 'INR',
    method,
    source: 'synthetic',
    isSubscription: Math.random() < 0.15, // 15% of transactions are subscription-related
    createdAt: randomPastDate(DAYS_SPREAD),
  };

  if (isSuccess) {
    return { ...base, status: 'captured', errorCode: null, errorReason: null };
  } else {
    const failure = pickFailureReason();
    return {
      ...base,
      status: 'failed',
      errorCode: failure.errorCode,
      errorReason: failure.errorReason,
    };
  }
}

function generateCheckout() {
  // checkouts: some completed (converted), some abandoned, some still "created" (in progress)
  const r = Math.random();
  let status;
  if (r < 0.55) status = 'completed';
  else if (r < 0.90) status = 'abandoned';
  else status = 'created';

  const createdAt = randomPastDate(DAYS_SPREAD);
  // lastActivityAt is a bit after createdAt, unless abandoned (then activity stopped early)
  const activityGapMinutes = status === 'abandoned'
    ? Math.random() * 10 + 1 // abandoned quickly, 1-10 min of activity
    : Math.random() * 60 + 5; // active longer if completed/in progress

  return {
    merchantId: 'merchant_demo_1',
    customerId: randomCustomerId(),
    cartValue: randomAmount(),
    status,
    createdAt,
    lastActivityAt: new Date(createdAt.getTime() + activityGapMinutes * 60 * 1000),
  };
}

// ---- MAIN SEED FUNCTION ----
async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Safety check: warn before wiping existing data
    const existingTxCount = await Transaction.countDocuments();
    const existingCkCount = await Checkout.countDocuments();
    if (existingTxCount > 0 || existingCkCount > 0) {
      console.log(`Found existing data: ${existingTxCount} transactions, ${existingCkCount} checkouts.`);
      console.log('This script will DELETE them and insert fresh synthetic data.');
      console.log('If you want to keep existing data, stop this now (Ctrl+C) within 5 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    await Transaction.deleteMany({ source: 'synthetic' }); // only wipes synthetic, keeps real razorpay records safe
    await Checkout.deleteMany({});

    const transactions = Array.from({ length: NUM_TRANSACTIONS }, generateTransaction);
    const checkouts = Array.from({ length: NUM_CHECKOUTS }, generateCheckout);

    await Transaction.insertMany(transactions);
    await Checkout.insertMany(checkouts);

    const successCount = transactions.filter((t) => t.status === 'captured').length;
    const failCount = transactions.filter((t) => t.status === 'failed').length;

    console.log('\n✅ Seed complete!');
    console.log(`Transactions: ${transactions.length} (${successCount} success, ${failCount} failed)`);
    console.log(`Checkouts: ${checkouts.length}`);
    console.log(`Success rate: ${((successCount / transactions.length) * 100).toFixed(1)}%`);

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();