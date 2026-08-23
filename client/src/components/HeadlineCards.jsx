import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { formatRupees } from '../api/dashboardApi';

// Animates a number counting up from 0 to its final value
function CountUp({ value, formatter }) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(formatter(0));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(formatter(Math.round(v))),
    });
    return () => controls.stop();
  }, [value]);

  return <span>{display}</span>;
}

function LineItem({ eyebrow, value, sub, accent, isFirst, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`flex-1 px-6 py-5 ${!isFirst ? 'border-l border-hairline' : ''}`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-paper-dim mb-2">
        {eyebrow}
      </p>
      <p
        className="font-mono text-2xl md:text-3xl font-medium tabular"
        style={{ color: accent || 'var(--color-paper)' }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-paper-dim mt-1.5">{sub}</p>}
    </motion.div>
  );
}

function HeadlineCards({ headline }) {
  if (!headline) return null;

  return (
    <div className="ledger-texture rounded-lg border border-hairline bg-panel mb-10 overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <LineItem
          isFirst
          delay={0}
          eyebrow="Revenue At Risk"
          value={<CountUp value={headline.totalAtRisk} formatter={formatRupees} />}
          sub={`${headline.itemsFlagged} items flagged`}
        />
        <LineItem
          delay={0.08}
          eyebrow="Recovered"
          value={<CountUp value={headline.totalRecovered} formatter={formatRupees} />}
          accent="var(--color-mint)"
          sub={`${headline.itemsProcessed} actions taken`}
        />
        <LineItem
          delay={0.16}
          eyebrow="Recovery Rate"
          value={<CountUp value={headline.recoveryRate} formatter={(v) => `${v}%`} />}
          accent="var(--color-gold)"
        />
        <LineItem
          delay={0.24}
          eyebrow="Pending Review"
          value={headline.pendingEscalated}
          accent="var(--color-rust)"
          sub="Awaiting human decision"
        />
      </div>
    </div>
  );
}

export default HeadlineCards;