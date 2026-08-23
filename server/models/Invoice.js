const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  merchantId: {
    type: String,
    required: true,
    default: 'merchant_demo_1',
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  clientName: {
    type: String,
    required: true,
  },
  clientTier: {
    type: String, // affects escalation tone/priority — enterprise clients get gentler handling
    enum: ['enterprise', 'mid_market', 'startup'],
    default: 'mid_market',
  },
  amount: {
    type: Number, // paise
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  issuedDate: {
    type: Date,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'overdue', 'paid', 'disputed'],
    default: 'pending',
  },
  source: {
    type: String,
    enum: ['synthetic'], // no real B2B invoicing integration for this prototype — always synthetic
    default: 'synthetic',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Invoice', invoiceSchema);