const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  razorpayPaymentId: {
    type: String,
    default: null, // null for synthetic records, filled in for real Razorpay ones
  },
  merchantId: {
    type: String,
    required: true,
    default: 'merchant_demo_1', // single-merchant demo, keep it simple
  },
  customerId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number, // store in paise (Razorpay convention), e.g. 50000 = ₹500
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  method: {
    type: String, // card, upi, netbanking, wallet
    enum: ['card', 'upi', 'netbanking', 'wallet'],
    required: true,
  },
  status: {
    type: String, // captured = success, failed = failure
    enum: ['captured', 'failed', 'pending'],
    required: true,
  },
  errorCode: {
    type: String, // e.g. BAD_REQUEST_ERROR, GATEWAY_ERROR
    default: null,
  },
  errorReason: {
    type: String, // e.g. insufficient_funds, bank_timeout, card_declined
    default: null,
  },
  source: {
    type: String, // 'synthetic' or 'razorpay_real'
    enum: ['synthetic', 'razorpay_real'],
    default: 'synthetic',
  },
  isSubscription: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);