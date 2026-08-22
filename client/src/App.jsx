import { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [status, setStatus] = useState('Checking backend...');

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/health`)
      .then((res) => setStatus(res.data.message))
      .catch(() => setStatus('Could not reach backend ❌'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">RecoverAI</h1>
        <p className="text-lg">{status}</p>
      </div>
    </div>
  );
}

export default App;