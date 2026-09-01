import React, { useState } from 'react';
import { motion } from 'framer-motion';

function SparkleStar({ size = 10, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
    </svg>
  );
}

export const StarButton = React.forwardRef(
  (
    {
      children,
      variant = 'gold', // 'gold' | 'cyan' | 'slate'
      className = '',
      type = 'button',
      disabled = false,
      onClick,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = useState(false);

    const variants = {
      gold: {
        borderColor: 'rgba(245, 158, 11, 0.4)',
        shimmerColor: 'rgba(251, 191, 36, 0.9)',
        starColor: 'text-amber-300',
        bg: 'bg-[#120F08]',
        glow: 'shadow-[0_0_24px_rgba(245,158,11,0.25)]',
        textColor: 'text-amber-300 font-bold',
        accentGradient: 'from-amber-500/20 via-amber-400/10 to-transparent',
      },
      cyan: {
        borderColor: 'rgba(6, 182, 212, 0.4)',
        shimmerColor: 'rgba(103, 232, 249, 0.9)',
        starColor: 'text-cyan-300',
        bg: 'bg-[#081216]',
        glow: 'shadow-[0_0_24px_rgba(6,182,212,0.25)]',
        textColor: 'text-cyan-300 font-semibold',
        accentGradient: 'from-cyan-500/20 via-cyan-400/10 to-transparent',
      },
      slate: {
        borderColor: 'rgba(255, 255, 255, 0.15)',
        shimmerColor: 'rgba(255, 255, 255, 0.8)',
        starColor: 'text-slate-300',
        bg: 'bg-[#0F1218]',
        glow: 'shadow-[0_0_16px_rgba(255,255,255,0.06)]',
        textColor: 'text-slate-200 font-medium',
        accentGradient: 'from-white/10 via-white/5 to-transparent',
      },
    };

    const v = variants[variant] || variants.gold;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative inline-flex items-center justify-center rounded-xl p-[1px] font-mono text-xs uppercase tracking-wider transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${v.glow} ${className}`}
        {...props}
      >
        {/* Orbiting Shimmer Beam */}
        {!disabled && (
          <div
            className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${v.shimmerColor} 10%, transparent 60%)`,
            }}
          >
            <div
              className="absolute -inset-[100%] animate-[spin_4s_linear_infinite]"
              style={{
                background: `conic-gradient(from 0deg, transparent 0 340deg, ${v.shimmerColor} 360deg)`,
              }}
            />
          </div>
        )}

        {/* Inner Button Core */}
        <div
          className={`relative z-10 flex items-center gap-2 rounded-xl px-5 py-2.5 ${v.bg} border transition-all duration-300 group-hover:border-white/20`}
          style={{ borderColor: v.borderColor }}
        >
          {/* Subtle Star Dust */}
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
            <div className={`absolute inset-0 bg-gradient-to-t ${v.accentGradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
          </div>

          {/* Twinkling 4-Pointed Stars */}
          {!disabled && (
            <>
              <motion.div
                animate={{
                  scale: isHovered ? [1, 1.4, 1] : [0.8, 1.1, 0.8],
                  opacity: isHovered ? [0.8, 1, 0.8] : [0.4, 0.8, 0.4],
                  rotate: isHovered ? 90 : 0,
                }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className={`absolute -top-1 -right-1 ${v.starColor} pointer-events-none drop-shadow-[0_0_6px_currentColor]`}
              >
                <SparkleStar size={11} />
              </motion.div>

              <motion.div
                animate={{
                  scale: isHovered ? [1, 1.3, 1] : [0.7, 1, 0.7],
                  opacity: isHovered ? [0.7, 1, 0.7] : [0.3, 0.7, 0.3],
                  rotate: isHovered ? -90 : 0,
                }}
                transition={{ repeat: Infinity, duration: 2.5, delay: 0.4, ease: 'easeInOut' }}
                className={`absolute -bottom-1 -left-1 ${v.starColor} pointer-events-none drop-shadow-[0_0_5px_currentColor]`}
              >
                <SparkleStar size={9} />
              </motion.div>
            </>
          )}

          {/* Content */}
          <div className={`relative z-20 flex items-center gap-2 ${v.textColor}`}>
            {children}
          </div>
        </div>
      </button>
    );
  }
);

StarButton.displayName = 'StarButton';
export default StarButton;

