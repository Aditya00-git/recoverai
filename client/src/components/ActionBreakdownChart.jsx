import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ACTION_LABELS = {
  retry_payment: 'Retry Payment',
  send_reminder: 'Send Reminder',
  offer_incentive: 'Offer Incentive',
  escalate_human: 'Escalate Human',
  no_action: 'No Action',
};

// 3D Isometric Bar Column Component
function Isometric3DBar({
  x,
  y,
  width,
  height,
  depthX = 8,
  depthY = -6,
  frontColor,
  topColor,
  sideColor,
  glowColor,
  label,
  value,
  isHovered,
  onHover,
  onLeave,
  delay = 0,
}) {
  const frontPath = `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
  const topPath = `M ${x} ${y} L ${x + depthX} ${y + depthY} L ${x + width + depthX} ${y + depthY} L ${x + width} ${y} Z`;
  const sidePath = `M ${x + width} ${y} L ${x + width + depthX} ${y + depthY} L ${x + width + depthX} ${y + height + depthY} L ${x + width} ${y + height} Z`;

  return (
    <g
      className="cursor-pointer transition-all duration-200"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* 3D Back Glow Filter */}
      {isHovered && (
        <path
          d={frontPath}
          fill={glowColor}
          filter="blur(8px)"
          opacity={0.4}
        />
      )}

      {/* 1. Side Extrusion Face (Shadow depth) */}
      <motion.path
        d={sidePath}
        fill={sideColor}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0.85 }}
        transition={{ duration: 0.3 }}
      />

      {/* 2. Top Face Cap (Illuminated top perspective) */}
      <motion.path
        d={topPath}
        fill={topColor}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0.9 }}
        transition={{ duration: 0.3 }}
      />

      {/* 3. Front Main Face */}
      <motion.path
        d={frontPath}
        fill={frontColor}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1, opacity: isHovered ? 1 : 0.92 }}
        transition={{
          duration: 0.5,
          delay,
          type: 'spring',
          stiffness: 240,
          damping: 22,
        }}
        style={{ transformOrigin: `${x}px ${y + height}px` }}
      />
    </g>
  );
}

export default function ActionBreakdownChart({ actionTypeBreakdown }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 480, height: 240 });
  const [hoveredData, setHoveredData] = useState(null);

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

  if (!actionTypeBreakdown || Object.keys(actionTypeBreakdown).length === 0) {
    return null;
  }

  const keys = Object.keys(actionTypeBreakdown);
  const items = keys.map((key) => ({
    key,
    label: ACTION_LABELS[key] || key,
    total: actionTypeBreakdown[key].total || 0,
    success: actionTypeBreakdown[key].success || 0,
    recovered: actionTypeBreakdown[key].recovered || 0,
  }));

  const maxVal = Math.max(...items.map((d) => Math.max(d.total, d.success, 1)), 5);

  const paddingLeft = 36;
  const paddingRight = 24;
  const paddingTop = 32;
  const paddingBottom = 44;

  const chartWidth = dimensions.width - paddingLeft - paddingRight;
  const chartHeight = dimensions.height - paddingTop - paddingBottom;
  const groupWidth = chartWidth / items.length;
  const barWidth = Math.min(Math.max(groupWidth * 0.28, 12), 22);
  const barGap = 4;
  const depthX = 6;
  const depthY = -5;

  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="glass-panel rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h3 className="font-display text-lg font-bold text-white tracking-tight">
              Intervention Breakdown
            </h3>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">
            3D perspective volume of attempted actions vs confirmed recovered.
          </p>
        </div>

        {/* 3D Legend Badges */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-tr from-amber-600 to-amber-400 shadow-sm border border-amber-300/40" />
            <span className="text-slate-300">Attempted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-tr from-emerald-600 to-emerald-400 shadow-sm border border-emerald-300/40" />
            <span className="text-slate-300">Recovered</span>
          </div>
        </div>
      </div>

      {/* 3D SVG Chart Canvas */}
      <div ref={containerRef} className="w-full relative my-1 select-none" style={{ height: dimensions.height }}>
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
          <defs>
            {/* Gradients for 3D Faces */}
            <linearGradient id="frontAttempted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="frontRecovered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {gridTicks.map((tick, i) => {
            const y = paddingTop + chartHeight * (1 - tick);
            const val = Math.round(maxVal * tick);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={dimensions.width - paddingRight + depthX}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray={tick === 0 ? 'none' : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Render 3D Isometric Columns per Category */}
          {items.map((item, idx) => {
            const groupX = paddingLeft + idx * groupWidth + (groupWidth - (barWidth * 2 + barGap)) / 2;
            const baseY = paddingTop + chartHeight;

            // Heights
            const attemptedH = Math.max((item.total / maxVal) * chartHeight, 3);
            const recoveredH = Math.max((item.success / maxVal) * chartHeight, 3);

            const attemptedY = baseY - attemptedH;
            const recoveredY = baseY - recoveredH;

            const attemptedX = groupX;
            const recoveredX = groupX + barWidth + barGap;

            const isThisGroupHovered = hoveredData?.key === item.key;

            return (
              <g key={item.key}>
                {/* 3D Attempted Column (Amber) */}
                <Isometric3DBar
                  x={attemptedX}
                  y={attemptedY}
                  width={barWidth}
                  height={attemptedH}
                  depthX={depthX}
                  depthY={depthY}
                  frontColor="url(#frontAttempted)"
                  topColor="#FDE68A"
                  sideColor="#B45309"
                  glowColor="#F59E0B"
                  label="Attempted"
                  value={item.total}
                  isHovered={isThisGroupHovered && hoveredData?.type === 'attempted'}
                  onHover={() => setHoveredData({ ...item, type: 'attempted', x: attemptedX, y: attemptedY })}
                  onLeave={() => setHoveredData(null)}
                  delay={idx * 0.08}
                />

                {/* 3D Recovered Column (Emerald) */}
                <Isometric3DBar
                  x={recoveredX}
                  y={recoveredY}
                  width={barWidth}
                  height={recoveredH}
                  depthX={depthX}
                  depthY={depthY}
                  frontColor="url(#frontRecovered)"
                  topColor="#A7F3D0"
                  sideColor="#047857"
                  glowColor="#10B981"
                  label="Recovered"
                  value={item.success}
                  isHovered={isThisGroupHovered && hoveredData?.type === 'recovered'}
                  onHover={() => setHoveredData({ ...item, type: 'recovered', x: recoveredX, y: recoveredY })}
                  onLeave={() => setHoveredData(null)}
                  delay={idx * 0.08 + 0.04}
                />

                {/* X Axis Label */}
                <text
                  x={groupX + barWidth + barGap / 2}
                  y={baseY + 18}
                  textAnchor="middle"
                  fill={isThisGroupHovered ? '#FFFFFF' : '#94A3B8'}
                  fontSize="10"
                  fontFamily="Plus Jakarta Sans"
                  fontWeight="600"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 3D Tooltip Overlay */}
        <AnimatePresence>
          {hoveredData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 pointer-events-none bg-[#0D1017] border border-white/20 rounded-lg px-3 py-2 shadow-2xl backdrop-blur-md"
              style={{
                left: Math.min(Math.max(hoveredData.x - 40, 10), dimensions.width - 130),
                top: Math.max(hoveredData.y - 45, 10),
              }}
            >
              <p className="font-semibold text-xs text-white">{hoveredData.label}</p>
              <div className="flex items-center gap-2 font-mono text-[11px] mt-0.5">
                <span className={hoveredData.type === 'attempted' ? 'text-amber-400' : 'text-emerald-400'}>
                  {hoveredData.type === 'attempted' ? `Attempted: ${hoveredData.total}` : `Recovered: ${hoveredData.success}`}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-cyan-300">
                  {hoveredData.total > 0 ? `${Math.round((hoveredData.success / hoveredData.total) * 100)}% Win` : '0%'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Insight */}
      <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-slate-400">
        <span>📦 3D Perspective Volume</span>
        <span className="text-amber-400 font-medium">
          {items.reduce((sum, i) => sum + i.total, 0)} Total Actions Tested
        </span>
      </div>
    </div>
  );
}