import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

function FunnelChart({ funnel }) {
  if (!funnel) return null;

  const data = {
    labels: ['Detected', 'Action Taken', 'Recovered'],
    datasets: [
      {
        data: [funnel.detected, funnel.actionTaken, funnel.recovered],
        backgroundColor: [
          'rgba(212, 162, 76, 0.35)', // gold, dim
          'rgba(212, 162, 76, 0.65)', // gold, brighter
          '#3FBF8F',                  // mint
        ],
        borderRadius: 3,
        barThickness: 32,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    layout: {
      padding: { left: 8 },
    },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Recovery Funnel',
        color: '#EDE9E0',
        font: { family: 'Fraunces', size: 17, weight: '500' },
        align: 'start',
        padding: { bottom: 16 },
      },
    },
    scales: {
      x: {
        ticks: { color: '#8B8A85', stepSize: 1, font: { family: 'IBM Plex Mono', size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { display: false },
        beginAtZero: true,
      },
      y: {
        ticks: { color: '#EDE9E0', font: { family: 'Inter', size: 12 } },
        grid: { display: false },
        border: { color: '#262A34' },
      },
    },
  };

  return (
    <div className="bg-panel rounded-lg p-6 border border-hairline">
      <Bar data={data} options={options} />
    </div>
  );
}

export default FunnelChart;