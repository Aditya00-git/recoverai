const mongoose = require('mongoose');

const checkoutSchema = new mongoose.Schema({
  merchantId: {
    type: String,
    required: true,
    default: 'merchant_demo_1',
  },
  customerId: {
    type: String,
    required: true,
  },
  cartValue: {
    type: Number, // paise
    required: true,
  },
  status: {
    type: String,
    enum: ['created', 'abandoned', 'completed'],
    default: 'created',
  },
  linkedTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null, // filled in if it eventually converts to a transaction
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActivityAt: {
    type: Date,
    default: Date.now, // used to detect "abandoned" (no activity for X mins)
  },
});

module.exports = mongoose.model('Checkout', checkoutSchema);