require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const Checkout = require('./models/Checkout');
const Invoice = require('./models/Invoice');
const RecoveryAction = require('./models/RecoveryAction');
const AuditLog = require('./models/AuditLog');

// ---- CONFIG ----
const NUM_TRANSACTIONS = 120;
const NUM_SUBSCRIPTIONS = 35;
const NUM_CHECKOUTS = 50;
const NUM_INVOICES = 30;
const DAYS_SPREAD = 30;

const METHODS = ['card', 'upi', 'netbanking', 'wallet'];
const METHOD_WEIGHTS = [0.35, 0.45, 0.15, 0.05];

const FAILURE_REASONS = [
  { errorCode: 'BAD_REQUEST_ERROR', errorReason: 'insufficient_funds', weight: 0.35 },
  { errorCode: 'GATEWAY_ERROR', errorReason: 'bank_timeout', weight: 0.20 },
  { errorCode: 'BAD_REQUEST_ERROR', errorReason: 'card_declined', weight: 0.25 },
  { errorCode: 'BAD_REQUEST_ERROR', errorReason: 'invalid_otp', weight: 0.10 },
  { errorCode: 'GATEWAY_ERROR', errorReason: 'payment_cancelled', weight: 0.10 },
];

const OVERALL_SUCCESS_RATE = 0.70;

const B2B_CLIENTS = [
  { name: 'Nimbus Retail Pvt Ltd', tier: 'enterprise' },
  { name: 'Vertex Logistics', tier: 'mid_market' },
  { name: 'Solaris Manufacturing', tier: 'enterprise' },
  { name: 'BluePeak Consulting', tier: 'startup' },
  { name: 'Ganges Textiles', tier: 'mid_market' },
  { name: 'Orbit Digital Media', tier: 'startup' },
  { name: 'Prakash Industrial Supplies', tier: 'mid_market' },
  { name: 'Everest Freight Co', tier: 'enterprise' },
  { name: 'Zenith Software Labs', tier: 'enterprise' },
  { name: 'Nova Print & Packaging', tier: 'startup' },
];

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
  return `cust_${String(Math.floor(Math.random() * pool) + 1).padStart(3, '0')}`;
}

function randomAmount(minRupees, maxRupees) {
  const rupees = Math.floor(Math.random() * (maxRupees - minRupees)) + minRupees;
  return rupees * 100;
}

function generateTransaction(isSubscription = false) {
  const isSuccess = Math.random() < OVERALL_SUCCESS_RATE;
  const method = weightedRandom(METHODS, METHOD_WEIGHTS);

  const base = {
    merchantId: 'merchant_demo_1',
    customerId: randomCustomerId(),
    amount: randomAmount(200, isSubscription ? 2999 : 15000),
    currency: 'INR',
    method,
    source: 'synthetic',
    isSubscription,
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
  const r = Math.random();
  let status;
  if (r < 0.50) status = 'completed';
  else if (r < 0.85) status = 'abandoned';
  else status = 'created';

  const createdAt = randomPastDate(DAYS_SPREAD);
  const activityGapMinutes = status === 'abandoned'
    ? Math.random() * 10 + 1
    : Math.random() * 60 + 5;

  return {
    merchantId: 'merchant_demo_1',
    customerId: randomCustomerId(),
    cartValue: randomAmount(300, 12000),
    status,
    createdAt,
    lastActivityAt: new Date(createdAt.getTime() + activityGapMinutes * 60 * 1000),
  };
}

function generateInvoice(index) {
  const client = B2B_CLIENTS[index % B2B_CLIENTS.length];
  const issuedDaysAgo = Math.floor(Math.random() * 60) + 15;
  const issuedDate = new Date(Date.now() - issuedDaysAgo * 24 * 60 * 60 * 1000);
  const dueDate = new Date(issuedDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Net 30

  const isOverdue = dueDate < new Date();
  const r = Math.random();

  let status = 'pending';
  if (isOverdue) {
    if (r < 0.10) status = 'disputed';
    else if (r < 0.30) status = 'paid';
    else status = 'overdue';
  }

  // Guarantee every 2nd overdue invoice has an active future Promise-to-Pay (PTP) date
  let promiseToPayDate = null;
  if (status === 'overdue' && index % 2 === 0) {
    const daysAhead = (index % 5) + 3; // 3 to 7 days from now
    promiseToPayDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  }

  return {
    merchantId: 'merchant_demo_1',
    invoiceNumber: `INV-2026-${String(index + 101).padStart(4, '0')}`,
    clientName: client.name,
    clientTier: client.tier,
    amount: randomAmount(25000, 450000),
    currency: 'INR',
    issuedDate,
    dueDate,
    status,
    promiseToPayDate,
    source: 'synthetic',
    createdAt: issuedDate,
  };
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for unified seeding...');

    // Clear existing collections
    await Transaction.deleteMany({ source: 'synthetic' });
    await Checkout.deleteMany({});
    await Invoice.deleteMany({ source: 'synthetic' });
    await RecoveryAction.deleteMany({});
    await AuditLog.deleteMany({});

    const transactions = Array.from({ length: NUM_TRANSACTIONS }, () => generateTransaction(false));
    const subscriptions = Array.from({ length: NUM_SUBSCRIPTIONS }, () => generateTransaction(true));
    const checkouts = Array.from({ length: NUM_CHECKOUTS }, generateCheckout);
    const invoices = Array.from({ length: NUM_INVOICES }, (_, i) => generateInvoice(i));

    await Transaction.insertMany([...transactions, ...subscriptions]);
    await Checkout.insertMany(checkouts);
    await Invoice.insertMany(invoices);

    const overdueInvoices = invoices.filter((i) => i.status === 'overdue').length;
    const ptpInvoices = invoices.filter((i) => i.promiseToPayDate !== null).length;

    console.log('\n✅ Unified Seed Complete!');
    console.log(`• Standard Transactions: ${transactions.length}`);
    console.log(`• Recurring Subscriptions: ${subscriptions.length}`);
    console.log(`• Checkout Sessions: ${checkouts.length}`);
    console.log(`• B2B Invoices: ${invoices.length} (${overdueInvoices} overdue, ${ptpInvoices} with Promise-to-Pay commitments)`);

    process.exit(0);
  } catch (err) {
    console.error('Unified seeding failed:', err);
    process.exit(1);
  }
}

seed();