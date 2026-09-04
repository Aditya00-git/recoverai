import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

function generateFunnelSegmentPath(startNorm, endNorm, width, height, scale = 1) {
  const centerY = height / 2;
  const h0 = Math.max(startNorm * height * 0.40 * scale, 6);
  const h1 = Math.max(endNorm * height * 0.40 * scale, 6);

  const cx = width * 0.55;
  const topPath = `M 0 ${centerY - h0} C ${cx} ${centerY - h0}, ${width - cx} ${centerY - h1}, ${width} ${centerY - h1}`;
  const bottomPath = `L ${width} ${centerY + h1} C ${width - cx} ${centerY + h1}, ${cx} ${centerY + h0}, 0 ${centerY + h0}`;
  return `${topPath} ${bottomPath} Z`;
}

function FunnelSegment({ stage, index, normStart, normEnd, width, height, hovered, onHover, onLeave }) {
  const path = generateFunnelSegmentPath(normStart, normEnd, width, height, 1);

  return (
    <div
      className="relative flex-1 h-full cursor-pointer"
      onMouseEnter={() => onHover(index)}
      onMouseLeave={onLeave}
      style={{ width }}
    >
      <svg
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={`stream-grad-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={stage.gradient[0]} />
            <stop offset="100%" stopColor={stage.gradient[1]} />
          </linearGradient>
        </defs>

        <motion.path
          d={path}
          fill={`url(#stream-grad-${index})`}
          opacity={hovered ? 0.95 : 0.75}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: hovered ? 1.05 : 1 }}
          transition={{
            duration: 0.4,
            delay: index * 0.1,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ transformOrigin: 'center center' }}
        />
      </svg>

      {/* Stage Metric Card Overlay */}
      <div className="absolute inset-0 flex flex-col justify-between items-center py-3.5 px-2 pointer-events-none z-10">
        <div className="text-center">
          <span className="font-display font-bold text-base sm:text-lg text-white tracking-tight block">
            {stage.value}
          </span>
          <span className="font-mono text-[10px] text-slate-400 font-medium">
            {stage.label}
          </span>
        </div>

        <div className={`target-pill ${stage.badgeStyle} font-mono text-[11px] font-bold shadow-sm`}>
          {stage.pct}%
        </div>

        <div className="text-center">
          <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest font-semibold">
            {stage.stageName}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function FunnelChart({ funnel }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 440, height: 210 });
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0) {
        setDimensions({
          width: entry.contentRect.width,
          height: 210,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!funnel) return null;

  const detected = Math.max(funnel.detected || 0, 1);
  const actionTaken = funnel.actionTaken || 0;
  const recovered = funnel.recovered || 0;

  const stages = [
    {
      label: 'At-Risk Detected',
      stageName: 'Stage 1',
      value: funnel.detected,
      pct: 100,
      norm: 1.0,
      badgeStyle: 'target-pill-blue',
      gradient: ['#1E3A8A', '#2563EB'],
    },
    {
      label: 'Interventions Taken',
      stageName: 'Stage 2',
      value: actionTaken,
      pct: Math.round((actionTaken / detected) * 100),
      norm: Math.max(0.35, actionTaken / detected),
      badgeStyle: 'target-pill-blue',
      gradient: ['#2563EB', '#3B82F6'],
    },
    {
      label: 'Revenue Recovered',
      stageName: 'Stage 3',
      value: recovered,
      pct: Math.round((recovered / detected) * 100),
      norm: Math.max(0.20, recovered / detected),
      badgeStyle: 'target-pill-green',
      gradient: ['#059669', '#10B981'],
    },
  ];

  const segWidth = dimensions.width / stages.length;

  return (
    <div className="dash-card p-5 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-white font-display">
            Recovery Pipeline Funnel
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Conversion stream from at-risk detection to won-back.
          </p>
        </div>
        <span className="target-pill target-pill-green">
          {stages[2].pct}% End-to-End
        </span>
      </div>

      {/* Funnel Stream Graphic */}
      <div
        ref={containerRef}
        className="w-full relative my-1 overflow-visible select-none"
        style={{ height: dimensions.height }}
      >
        <div className="flex w-full h-full items-center justify-between gap-1">
          {stages.map((stage, idx) => {
            const nextNorm = idx < stages.length - 1 ? stages[idx + 1].norm : stage.norm * 0.85;
            return (
              <FunnelSegment
                key={idx}
                stage={stage}
                index={idx}
                normStart={stage.norm}
                normEnd={nextNorm}
                width={segWidth}
                height={dimensions.height}
                hovered={hoveredIndex === idx}
                onHover={setHoveredIndex}
                onLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </div>
      </div>
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
        <span>Pipeline Velocity</span>
        <span className="text-emerald-400 font-semibold">
          {recovered} converted / {detected} total
        </span>
      </div>
    </div>
  );
}