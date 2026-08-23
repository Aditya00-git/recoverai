import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ACTION_LABELS = {
  retry_payment: 'Retry Payment',
  send_reminder: 'Send Reminder',
  offer_incentive: 'Offer Incentive',
  escalate_human: 'Escalate to Human',
  no_action: 'No Action',
};

function ActionBreakdownChart({ actionTypeBreakdown }) {
  if (!actionTypeBreakdown || Object.keys(actionTypeBreakdown).length === 0) {
    return null;
  }

  const labels = Object.keys(actionTypeBreakdown).map((key) => ACTION_LABELS[key] || key);
  const totals = Object.values(actionTypeBreakdown).map((v) => v.total);
  const successes = Object.values(actionTypeBreakdown).map((v) => v.success);

  const data = {
    labels,
    datasets: [
      {
        label: 'Attempted',
        data: totals,
        backgroundColor: 'rgba(212, 162, 76, 0.35)', // gold, dim
        borderRadius: 3,
        barPercentage: 0.7,
      },
      {
        label: 'Recovered',
        data: successes,
        backgroundColor: '#3FBF8F', // mint
        borderRadius: 3,
        barPercentage: 0.7,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: {
          color: '#8B8A85',
          font: { family: 'IBM Plex Mono', size: 11 },
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'rectRounded',
        },
      },
      title: {
        display: true,
        text: 'Actions by Type',
        color: '#EDE9E0',
        font: { family: 'Fraunces', size: 17, weight: '500' },
        align: 'start',
        padding: { bottom: 16 },
      },
    },
    scales: {
      x: {
        ticks: { color: '#8B8A85', font: { family: 'Inter', size: 11 } },
        grid: { display: false },
        border: { color: '#262A34' },
      },
      y: {
        ticks: { color: '#8B8A85', stepSize: 1, font: { family: 'IBM Plex Mono', size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-panel rounded-lg p-6 border border-hairline">
      <Bar data={data} options={options} />
    </div>
  );
}

export default ActionBreakdownChart;