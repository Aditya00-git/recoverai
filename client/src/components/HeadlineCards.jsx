import { useEffect, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { formatRupees } from '../api/dashboardApi';
import InfoPopover from './InfoPopover';

function CountUp({ value, formatter }) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(formatter(0));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.0,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(formatter(Math.round(v))),
    });
    return () => controls.stop();
  }, [value]);

  return <span>{display}</span>;
}

export default function HeadlineCards({ headline }) {
  if (!headline) return null;

  const stoppingRulesDetails = [
    {  label: 'Max 3 Attempts', text: 'Hard limit per target item to prevent customer fatigue and gateway penalty.' },
    {  label: '6-Hour Cooldown', text: 'Mandatory quiet period between automated retry and reminder cycles.' },
    {  label: '₹100 Minimum Floor', text: 'Suppresses automated outreach on micro-values with negative ROI.' },
    {  label: 'Irreversible Error Gate', text: 'Never attempts retry on invalid OTP, expired card, or closed accounts.' },
  ];

  const cards = [
    {
      title: 'TOTAL REVENUE AT RISK',
      value: <CountUp value={headline.totalAtRisk} formatter={formatRupees} />,
      target: '₹35,00,000 baseline',
      badge: `${headline.itemsFlagged} items`,
      badgeStyle: 'target-pill-blue',
    },
    {
      title: 'TOTAL RECOVERED',
      value: <CountUp value={headline.totalRecovered} formatter={formatRupees} />,
      target: 'Automated won-back',
      badge: `↗ +${headline.recoveryRate}%`,
      badgeStyle: 'target-pill-green',
    },
    {
      title: 'RECOVERY EFFICIENCY',
      value: <CountUp value={headline.recoveryRate} formatter={(v) => `${v}%`} />,
      target: '40.0% benchmark',
      badge: headline.recoveryRate >= 40 ? '↗ Target Achieved' : 'Active Run',
      badgeStyle: 'target-pill-green',
    },
    {
      title: 'PENDING ESCALATIONS',
      value: headline.pendingEscalated,
      target: 'Requires human approval',
      badge: headline.pendingEscalated > 0 ? `${headline.pendingEscalated} Review` : '✓ Resolved',
      badgeStyle: headline.pendingEscalated > 0 ? 'target-pill-rose' : 'target-pill-green',
    },
    {
      title: 'GUARDRAILS ACTIVE',
      value: '100%',
      target: '3 retries · 6h cooldown',
      badge: 'Protected',
      badgeStyle: 'target-pill-blue',
      popover: {
        title: 'Safety Limitations & Stopping Rules',
        description: 'Autonomous financial guardrails enforced prior to any Gemini AI action execution.',
        items: stoppingRulesDetails,
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
      {cards.map((card, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
          className="dash-card p-4 flex flex-col justify-between relative"
        >
          {/* Card Header with Icon & Optional Popover */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {card.title}
            </span>
            <div className="flex items-center gap-1.5">
              {card.popover ? (
                <InfoPopover
                  title={card.popover.title}
                  description={card.popover.description}
                  items={card.popover.items}
                />
              ) : (
                <span className="text-sm opacity-60">{card.icon}</span>
              )}
            </div>
          </div>

          {/* Big High-Contrast Number */}
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display mb-2.5">
            {card.value}
          </div>

          {/* Target & Comparison Pill */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
            <span className="text-slate-400 text-[11px] font-medium truncate mr-2">
              {card.target}
            </span>
            <span className={`target-pill ${card.badgeStyle} shrink-0`}>
              {card.badge}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}