import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ACTION_LABELS = {
  retry_payment: 'Retry Payment',
  send_reminder: 'Send Reminder',
  offer_incentive: 'Offer Incentive',
  escalate_human: 'Escalate Human',
  no_action: 'No Action',
};

export default function ActionBreakdownChart({ actionTypeBreakdown }) {
  const [hoveredData, setHoveredData] = useState(null);

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

  const viewBoxWidth = 480;
  const viewBoxHeight = 180;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 32;

  const chartWidth = viewBoxWidth - paddingLeft - paddingRight;
  const chartHeight = viewBoxHeight - paddingTop - paddingBottom;
  const groupWidth = chartWidth / items.length;
  const barWidth = 14;
  const barGap = 4;

  const gridTicks = [0, 0.5, 1];

  return (
    <div className="dash-card p-5 flex flex-col justify-between h-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-white font-display">
            Intervention Breakdown
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Attempted actions vs confirmed recovered wins.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span className="text-slate-300">Attempted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-slate-300">Recovered</span>
          </div>
        </div>
      </div>
      <div className="w-full relative h-[180px] select-none">
        <svg
          className="w-full h-full block"
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {gridTicks.map((tick, i) => {
            const y = paddingTop + chartHeight * (1 - tick);
            const val = Math.round(maxVal * tick);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={viewBoxWidth - paddingRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray={tick === 0 ? 'none' : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                >
                  {val}
                </text>
              </g>
            );
          })}
          {items.map((item, idx) => {
            const groupX = paddingLeft + idx * groupWidth + (groupWidth - (barWidth * 2 + barGap)) / 2;
            const baseY = paddingTop + chartHeight;

            const attemptedH = Math.max((item.total / maxVal) * chartHeight, 2);
            const recoveredH = Math.max((item.success / maxVal) * chartHeight, 2);

            const attemptedY = baseY - attemptedH;
            const recoveredY = baseY - recoveredH;

            const attemptedX = groupX;
            const recoveredX = groupX + barWidth + barGap;

            const isThisGroupHovered = hoveredData?.key === item.key;

            return (
              <g key={item.key}>
                <rect
                  x={attemptedX}
                  y={attemptedY}
                  width={barWidth}
                  height={attemptedH}
                  rx={3}
                  fill={isThisGroupHovered && hoveredData?.type === 'attempted' ? '#3B82F6' : '#2563EB'}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredData({ ...item, type: 'attempted', x: attemptedX, y: attemptedY })}
                  onMouseLeave={() => setHoveredData(null)}
                />
                <rect
                  x={recoveredX}
                  y={recoveredY}
                  width={barWidth}
                  height={recoveredH}
                  rx={3}
                  fill={isThisGroupHovered && hoveredData?.type === 'recovered' ? '#10B981' : '#059669'}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredData({ ...item, type: 'recovered', x: recoveredX, y: recoveredY })}
                  onMouseLeave={() => setHoveredData(null)}
                />
                <text
                  x={groupX + barWidth + barGap / 2}
                  y={baseY + 16}
                  textAnchor="middle"
                  fill={isThisGroupHovered ? '#FFFFFF' : '#94A3B8'}
                  fontSize="9"
                  fontFamily="Plus Jakarta Sans"
                  fontWeight="600"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
        <AnimatePresence>
          {hoveredData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.1 }}
              className="absolute z-20 pointer-events-none bg-[#111116] border border-white/20 rounded-lg px-2.5 py-1.5 shadow-xl"
              style={{
                left: Math.min(Math.max((hoveredData.x / viewBoxWidth) * 100 - 15, 5), 75) + '%',
                top: Math.max((hoveredData.y / viewBoxHeight) * 100 - 30, 0) + '%',
              }}
            >
              <p className="font-semibold text-xs text-white">{hoveredData.label}</p>
              <div className="flex items-center gap-1.5 font-mono text-[10px] mt-0.5">
                <span className={hoveredData.type === 'attempted' ? 'text-blue-400' : 'text-emerald-400'}>
                  {hoveredData.type === 'attempted' ? `Attempted: ${hoveredData.total}` : `Recovered: ${hoveredData.success}`}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-emerald-300">
                  {hoveredData.total > 0 ? `${Math.round((hoveredData.success / hoveredData.total) * 100)}% Win` : '0%'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
        <span>Distribution</span>
        <span className="text-blue-400 font-semibold">
          {items.reduce((sum, i) => sum + i.total, 0)} Actions Tested
        </span>
      </div>
    </div>
  );
}