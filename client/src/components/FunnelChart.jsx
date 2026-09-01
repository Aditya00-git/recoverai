import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// SVG Curve generation for smooth funnel segments
function generateFunnelSegmentPath(startNorm, endNorm, width, height, scale = 1) {
  const centerY = height / 2;
  const h0 = Math.max(startNorm * height * 0.42 * scale, 6);
  const h1 = Math.max(endNorm * height * 0.42 * scale, 6);

  const cx = width * 0.55;
  const topPath = `M 0 ${centerY - h0} C ${cx} ${centerY - h0}, ${width - cx} ${centerY - h1}, ${width} ${centerY - h1}`;
  const bottomPath = `L ${width} ${centerY + h1} C ${width - cx} ${centerY + h1}, ${cx} ${centerY + h0}, 0 ${centerY + h0}`;
  return `${topPath} ${bottomPath} Z`;
}

function FunnelSegment({ stage, index, totalStages, normStart, normEnd, width, height, hovered, onHover, onLeave }) {
  const layers = 3; // 3 multi-layer halo rings matching @bklit/funnel-chart specification

  const rings = Array.from({ length: layers }, (_, l) => {
    const scale = 1 - (l / layers) * 0.28;
    const opacity = 0.25 + (l / (layers - 1 || 1)) * 0.70;
    return {
      d: generateFunnelSegmentPath(normStart, normEnd, width, height, scale),
      opacity,
    };
  });

  return (
    <div
      className="relative flex-1 h-full cursor-pointer group"
      onMouseEnter={() => onHover(index)}
      onMouseLeave={onLeave}
      style={{ width }}
    >
      {/* SVG Canvas for Halo Rings */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={`funnel-grad-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={stage.gradient[0]} />
            <stop offset="100%" stopColor={stage.gradient[1]} />
          </linearGradient>
          <filter id={`glow-${index}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {rings.map((ring, rIdx) => {
          const isInnermost = rIdx === layers - 1;
          return (
            <motion.path
              key={rIdx}
              d={ring.d}
              fill={isInnermost ? `url(#funnel-grad-${index})` : stage.color}
              opacity={ring.opacity}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{
                scaleY: hovered ? 1.08 : 1,
                opacity: hovered ? Math.min(1, ring.opacity + 0.15) : ring.opacity,
              }}
              transition={{
                duration: 0.5,
                delay: index * 0.12 + rIdx * 0.05,
                type: 'spring',
                stiffness: 260 - rIdx * 50,
                damping: 20,
              }}
              style={{ transformOrigin: 'center center' }}
              filter={isInnermost && hovered ? `url(#glow-${index})` : undefined}
            />
          );
        })}
      </svg>

      {/* Stage Metric Card Overlay */}
      <div className="absolute inset-0 flex flex-col justify-between items-center py-4 px-2 pointer-events-none z-10">
        {/* Top Value */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.15 + 0.2 }}
          className="text-center"
        >
          <span className="font-display font-bold text-lg sm:text-xl text-white tracking-tight block">
            {stage.value}
          </span>
          <span className="font-mono text-[11px] text-slate-400 font-medium">
            {stage.label}
          </span>
        </motion.div>

        {/* Center Conversion Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.15 + 0.35, type: 'spring', stiffness: 300 }}
          className={`font-mono text-xs font-bold px-3 py-1 rounded-full shadow-lg border backdrop-blur-md transition-transform duration-300 ${
            hovered ? 'scale-110 shadow-amber-500/20' : ''
          }`}
          style={{
            backgroundColor: `${stage.color}22`,
            borderColor: `${stage.color}55`,
            color: stage.textColor || '#FFFFFF',
          }}
        >
          {stage.pct}%
        </motion.div>

        {/* Bottom Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.15 + 0.3 }}
          className="text-center"
        >
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            {stage.stageName}
          </span>
        </motion.div>
      </div>
    </div>
  );
}

export default function FunnelChart({ funnel }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 480, height: 240 });
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0) {
        setDimensions({
          width: entry.contentRect.width,
          height: 240,
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
      color: '#F59E0B',
      textColor: '#FBBF24',
      gradient: ['#F59E0B', '#D97706'],
    },
    {
      label: 'Interventions Taken',
      stageName: 'Stage 2',
      value: actionTaken,
      pct: Math.round((actionTaken / detected) * 100),
      norm: Math.max(0.35, actionTaken / detected),
      color: '#06B6D4',
      textColor: '#67E8F9',
      gradient: ['#06B6D4', '#0284C7'],
    },
    {
      label: 'Revenue Recovered',
      stageName: 'Stage 3',
      value: recovered,
      pct: Math.round((recovered / detected) * 100),
      norm: Math.max(0.20, recovered / detected),
      color: '#10B981',
      textColor: '#34D399',
      gradient: ['#10B981', '#059669'],
    },
  ];

  const segWidth = dimensions.width / stages.length;

  return (
    <div className="glass-panel rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="font-display text-lg font-bold text-white tracking-tight">
              Recovery Pipeline Funnel
            </h3>
          </div>
          <p className="text-slate-400 text-xs mt-0.5 font-sans">
            Multi-stage drop-off from at-risk detection to won-back conversion.
          </p>
        </div>
        <span className="font-mono text-[11px] px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/10 text-slate-300 font-semibold">
          {stages[2].pct}% End-to-End
        </span>
      </div>

      {/* Animated Funnel Graphic */}
      <div
        ref={containerRef}
        className="w-full relative my-2 overflow-visible select-none"
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
                totalStages={stages.length}
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

      {/* Footer Metrics */}
      <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-slate-400">
        <span>⚡ Real-time conversion radar</span>
        <span className="text-emerald-400 font-semibold">
          {recovered} converted / {detected} total
        </span>
      </div>
    </div>
  );
}