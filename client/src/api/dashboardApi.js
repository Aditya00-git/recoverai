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
export async function simulateScenario(scenario) {
  const res = await axios.post(`${API_URL}/api/agent/simulate`, { scenario });
  return res.data;
}
export async function fetchEscalations() {
  const res = await axios.get(`${API_URL}/api/agent/escalations`);
  return res.data;
}

export async function resolveEscalation(actionId, resolution, customNotes = '') {
  const res = await axios.post(`${API_URL}/api/agent/escalations/${actionId}/resolve`, {
    resolution,
    customNotes,
  });
  return res.data;
}
export function formatRupees(paise) {
  const rupees = (paise || 0) / 100;
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export async function resetDemoData() {
  const res = await axios.post(`${API_URL}/api/dashboard/reset`);
  return res.data;
}