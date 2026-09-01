const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../services/dashboardService');
const Transaction = require('../models/Transaction');
const Checkout = require('../models/Checkout');
const Invoice = require('../models/Invoice');
const RecoveryAction = require('../models/RecoveryAction');
const AuditLog = require('../models/AuditLog');

// 1. GET Dashboard Summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (err) {
    console.error('Dashboard summary failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. POST Reset Demo Data (Callable by anyone on the live demo)
const NUM_TRANSACTIONS = 120;
const NUM_SUBSCRIPTIONS = 35;
const NUM_CHECKOUTS = 50;
const NUM_INVOICES = 30;

const METHODS = ['card', 'upi', 'netbanking', 'wallet'];
const METHOD_WEIGHTS = [0.35, 0.45, 0.15, 0.05];

const FAILURE_REASONS = [
  { errorCode: 'BAD_REQUEST_ERROR', errorReason: 'insufficient_funds', weight: 0.35 },
  { errorCode: 'GATEWAY_ERROR', errorReason: 'bank_timeout', weight: 0.20 },
  { errorCode: 'BAD_REQUEST_ERROR', errorReason: 'card_declined', weight: 0.25 },
  { errorCode: 'BAD_REQUEST_ERROR', errorReason: 'invalid_otp', weight: 0.10 },
  { errorCode: 'GATEWAY_ERROR', errorReason: 'payment_cancelled', weight: 0.10 },
];

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

function randomAmount(minRupees, maxRupees) {
  return (Math.floor(Math.random() * (maxRupees - minRupees)) + minRupees) * 100;
}

router.post('/reset', async (req, res) => {
  try {
    // Clear previous runs
    await Transaction.deleteMany({ source: 'synthetic' });
    await Checkout.deleteMany({});
    await Invoice.deleteMany({ source: 'synthetic' });
    await RecoveryAction.deleteMany({});
    await AuditLog.deleteMany({});

    // Seed fresh transactions
    const transactions = Array.from({ length: NUM_TRANSACTIONS }, () => {
      const isSuccess = Math.random() < 0.70;
      const method = weightedRandom(METHODS, METHOD_WEIGHTS);
      const failure = isSuccess ? null : pickFailureReason();
      return {
        merchantId: 'merchant_demo_1',
        customerId: `cust_${String(Math.floor(Math.random() * 40) + 1).padStart(3, '0')}`,
        amount: randomAmount(200, 15000),
        currency: 'INR',
        method,
        status: isSuccess ? 'captured' : 'failed',
        errorCode: failure ? failure.errorCode : null,
        errorReason: failure ? failure.errorReason : null,
        isSubscription: false,
        source: 'synthetic',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      };
    });

    // Seed subscriptions
    const subscriptions = Array.from({ length: NUM_SUBSCRIPTIONS }, () => {
      const isSuccess = Math.random() < 0.65;
      const method = weightedRandom(METHODS, METHOD_WEIGHTS);
      const failure = isSuccess ? null : pickFailureReason();
      return {
        merchantId: 'merchant_demo_1',
        customerId: `cust_${String(Math.floor(Math.random() * 40) + 1).padStart(3, '0')}`,
        amount: randomAmount(299, 2999),
        currency: 'INR',
        method,
        status: isSuccess ? 'captured' : 'failed',
        errorCode: failure ? failure.errorCode : null,
        errorReason: failure ? failure.errorReason : null,
        isSubscription: true,
        source: 'synthetic',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      };
    });

    // Seed checkouts
    const checkouts = Array.from({ length: NUM_CHECKOUTS }, () => {
      const r = Math.random();
      const status = r < 0.50 ? 'completed' : r < 0.85 ? 'abandoned' : 'created';
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      return {
        merchantId: 'merchant_demo_1',
        customerId: `cust_${String(Math.floor(Math.random() * 40) + 1).padStart(3, '0')}`,
        cartValue: randomAmount(300, 12000),
        status,
        createdAt,
        lastActivityAt: new Date(createdAt.getTime() + (status === 'abandoned' ? 2 : 45) * 60 * 1000),
      };
    });

    // Seed invoices
    const invoices = Array.from({ length: NUM_INVOICES }, (_, i) => {
      const client = B2B_CLIENTS[i % B2B_CLIENTS.length];
      const issuedDaysAgo = Math.floor(Math.random() * 60) + 15;
      const issuedDate = new Date(Date.now() - issuedDaysAgo * 24 * 60 * 60 * 1000);
      const dueDate = new Date(issuedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const isOverdue = dueDate < new Date();
      const r = Math.random();

      let status = 'pending';
      if (isOverdue) {
        if (r < 0.10) status = 'disputed';
        else if (r < 0.30) status = 'paid';
        else status = 'overdue';
      }

      let promiseToPayDate = null;
      if (status === 'overdue' && i % 2 === 0) {
        promiseToPayDate = new Date(Date.now() + ((i % 5) + 3) * 24 * 60 * 60 * 1000);
      }

      return {
        merchantId: 'merchant_demo_1',
        invoiceNumber: `INV-2026-${String(i + 101).padStart(4, '0')}`,
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
    });

    await Transaction.insertMany([...transactions, ...subscriptions]);
    await Checkout.insertMany(checkouts);
    await Invoice.insertMany(invoices);

    const summary = await getDashboardSummary();
    res.json({ success: true, message: 'Demo environment reset to fresh state', summary });
  } catch (err) {
    console.error('Reset failed:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;