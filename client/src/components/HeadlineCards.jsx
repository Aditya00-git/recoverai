import { useEffect, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { formatRupees } from '../api/dashboardApi';

function CountUp({ value, formatter }) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(formatter(0));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(formatter(Math.round(v))),
    });
    return () => controls.stop();
  }, [value]);

  return <span>{display}</span>;
}

export default function HeadlineCards({ headline }) {
  if (!headline) return null;

  const cards = [
    {
      title: 'Revenue At Risk',
      value: <CountUp value={headline.totalAtRisk} formatter={formatRupees} />,
      sub: `${headline.itemsFlagged} items flagged across pipeline`,
      badge: 'Active Leakage',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      valueColor: 'text-white',
    },
    {
      title: 'Total Recovered',
      value: <CountUp value={headline.totalRecovered} formatter={formatRupees} />,
      sub: `${headline.itemsProcessed} automated actions executed`,
      badge: 'Won Back',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      valueColor: 'text-emerald-400',
    },
    {
      title: 'Recovery Efficiency',
      value: <CountUp value={headline.recoveryRate} formatter={(v) => `${v}%`} />,
      sub: 'Conversion over intervened items',
      badge: 'Conversion Rate',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      valueColor: 'text-cyan-300',
    },
    {
      title: 'Escalations Queue',
      value: headline.pendingEscalated,
      sub: 'High-value / formal items requiring review',
      badge: 'Human-in-Loop',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      valueColor: headline.pendingEscalated > 0 ? 'text-rose-400' : 'text-slate-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: idx * 0.08 }}
          className="glass-panel rounded-xl p-5 relative overflow-hidden group hover:border-white/20 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
              {card.title}
            </span>
            <span className={`font-mono text-[11px] px-2 py-0.5 rounded-full border ${card.badgeColor} font-medium`}>
              {card.badge}
            </span>
          </div>

          <div className={`font-display text-2xl sm:text-3xl font-bold tracking-tight tabular mb-2 ${card.valueColor}`}>
            {card.value}
          </div>

          <p className="text-xs text-slate-400 font-medium">
            {card.sub}
          </p>

          <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.015] rounded-full blur-2xl group-hover:bg-amber-500/5 transition-all duration-500" />
        </motion.div>
      ))}
    </div>
  );
}