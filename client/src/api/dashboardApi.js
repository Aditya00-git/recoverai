import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export async function fetchDashboardSummary() {
  const res = await axios.get(`${API_URL}/api/dashboard/summary`);
  return res.data;
}

export async function runAgent(limit = null) {
  const body = limit ? { limit } : {};
  const res = await axios.post(`${API_URL}/api/agent/run`, body);
  return res.data;
}

// Formats paise into a readable rupee string, e.g. 4770600 -> "₹47,706.00"
export function formatRupees(paise) {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}