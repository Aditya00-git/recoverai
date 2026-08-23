require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('./models/Invoice');

const NUM_INVOICES = 40;

const CLIENT_NAMES = [
  'Nimbus Retail Pvt Ltd', 'Vertex Logistics', 'Solaris Manufacturing', 'BluePeak Consulting',
  'Ganges Textiles', 'Orbit Digital Media', 'Prakash Industrial Supplies', 'Everest Freight Co',
  'Lotus Healthcare Systems', 'Meridian FoodTech', 'Sundara Apparel Group', 'Ironclad Security Services',
  'Coastal Shipping Agency', 'Zenith Software Labs', 'Ashoka Building Materials', 'Nova Print & Packaging',
];

const CLIENT_TIERS = ['enterprise', 'mid_market', 'startup'];
const TIER_WEIGHTS = [0.25, 0.45, 0.30];

function weightedRandom(items, weights) {
  const r = Math.random();
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += weights[i];
    if (r <= sum) return items[i];
  }
  return items[items.length - 1];
}

function randomInvoiceAmount() {
  // B2B invoices are typically much larger than consumer transactions
  const rupees = Math.floor(Math.random() * 480000) + 20000; // ₹20,000 - ₹5,00,000
  return rupees * 100;
}

function generateInvoice(index) {
  const clientTier = weightedRandom(CLIENT_TIERS, TIER_WEIGHTS);
  const clientName = CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)];

  // Standard B2B payment terms: Net 30
  const issuedDaysAgo = Math.floor(Math.random() * 75) + 15; // issued 15-90 days ago
  const issuedDate = new Date(Date.now() - issuedDaysAgo * 24 * 60 * 60 * 1000);
  const dueDate = new Date(issuedDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Net 30

  // Status distribution: most invoices get paid eventually, but a meaningful chunk are overdue
  const r = Math.random();
  let status;
  if (dueDate > new Date()) {
    status = 'pending'; // not due yet
  } else if (r < 0.12) {
    status = 'disputed'; // 12% disputed
  } else if (r < 0.55) {
    status = 'paid'; // 43% paid (late, but eventually)
  } else {
    status = 'overdue'; // ~45% genuinely overdue and unpaid
  }

  return {
    merchantId: 'merchant_demo_1',
    invoiceNumber: `INV-2026-${String(index + 1).padStart(4, '0')}`,
    clientName,
    clientTier,
    amount: randomInvoiceAmount(),
    currency: 'INR',
    issuedDate,
    dueDate,
    status,
    source: 'synthetic',
    createdAt: issuedDate,
  };
}

async function seedInvoices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for invoice seeding...');

    await Invoice.deleteMany({ source: 'synthetic' });

    const invoices = Array.from({ length: NUM_INVOICES }, (_, i) => generateInvoice(i));
    await Invoice.insertMany(invoices);

    const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;
    const disputedCount = invoices.filter((inv) => inv.status === 'disputed').length;
    const paidCount = invoices.filter((inv) => inv.status === 'paid').length;
    const pendingCount = invoices.filter((inv) => inv.status === 'pending').length;

    console.log('\n✅ Invoice seed complete!');
    console.log(`Total: ${invoices.length}`);
    console.log(`Overdue: ${overdueCount} | Disputed: ${disputedCount} | Paid: ${paidCount} | Pending: ${pendingCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Invoice seeding failed:', err);
    process.exit(1);
  }
}

seedInvoices();