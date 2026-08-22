import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

function App() {
  const [status, setStatus] = useState('Checking backend...');
  const [log, setLog] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/api/health`)
      .then((res) => setStatus(res.data.message))
      .catch(() => setStatus('Could not reach backend ❌'));
  }, []);

  const addLog = (msg) => setLog((prev) => [msg, ...prev]);

  const handleTestPayment = async () => {
    try {
      const amount = 50000; // ₹500 in paise — change this each time for variety
      const customerId = `cust_manual_${Math.floor(Math.random() * 1000)}`;

      // 1. Create order on backend
      const { data: order } = await axios.post(`${API_URL}/api/payments/create-order`, {
        amount,
        customerId,
      });

      // 2. Open Razorpay Checkout
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: 'RecoverAI Test Merchant',
        description: 'Manual test transaction for seed data',
        handler: async function (response) {
          // Fires on SUCCESS
          addLog(`✅ Success: ${response.razorpay_payment_id}`);
          await axios.post(`${API_URL}/api/payments/save-success`, {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            amount,
            customerId,
          });
          addLog('Saved to database ✅');
        },
        modal: {
          ondismiss: function () {
            addLog('Checkout closed without completing payment');
          },
        },
      };

      const rzp = new window.Razorpay(options);

      // Fires on FAILURE (e.g. you click "Failure" on the mock bank page)
      rzp.on('payment.failed', async function (response) {
        addLog(`❌ Failed: ${response.error.description}`);
        await axios.post(`${API_URL}/api/payments/save-failure`, {
          error: response.error,
          amount,
          customerId,
        });
        addLog('Saved failure to database ✅');
      });

      rzp.open();
    } catch (err) {
      addLog(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">RecoverAI</h1>
      <p className="text-lg mb-6">{status}</p>

      <button
        onClick={handleTestPayment}
        className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold"
      >
        Run Test Payment
      </button>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Log</h2>
        <ul className="space-y-1 text-sm font-mono">
          {log.map((entry, i) => (
            <li key={i} className="text-gray-300">{entry}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;