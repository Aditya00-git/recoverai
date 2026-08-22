const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const Transaction = require('../models/Transaction');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. Create a Razorpay order (called when you click "Pay" on frontend)
router.post('/create-order', async (req, res) => {
  try {
    const { amount, customerId } = req.body; // amount in paise, e.g. 50000 = ₹500

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { customerId: customerId || 'cust_test_manual' },
    });

    res.json(order); // contains order.id, which frontend needs to open checkout
  } catch (err) {
    console.error('Order creation failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Save a SUCCESSFUL real payment after checkout completes
router.post('/save-success', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, amount, method, customerId } = req.body;

    // Fetch full payment details from Razorpay to confirm it's genuine (not just trusting frontend)
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    const transaction = await Transaction.create({
      razorpayPaymentId: payment.id,
      customerId: customerId || 'cust_test_manual',
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method || method || 'card',
      status: payment.status === 'captured' ? 'captured' : 'pending',
      source: 'razorpay_real',
    });

    res.json({ saved: true, transaction });
  } catch (err) {
    console.error('Saving success payment failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Save a FAILED real payment (triggered by Checkout.js's payment.failed event)
router.post('/save-failure', async (req, res) => {
  try {
    const { error, amount, customerId } = req.body;
    // error object comes from Razorpay's payment.failed event, contains code/description

    const transaction = await Transaction.create({
      razorpayPaymentId: error.metadata?.payment_id || null,
      customerId: customerId || 'cust_test_manual',
      amount: amount,
      currency: 'INR',
      method: 'card', // Checkout.js failure events are usually card-flow in test mode
      status: 'failed',
      errorCode: error.code || 'GATEWAY_ERROR',
      errorReason: error.description || 'payment_failed',
      source: 'razorpay_real',
    });

    res.json({ saved: true, transaction });
  } catch (err) {
    console.error('Saving failed payment failed:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;