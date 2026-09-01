import React from 'react';

export function DotBorderButton({
  children,
  variant = 'gold', // 'gold' | 'cyan' | 'slate'
  onClick,
  disabled = false,
  className = '',
  title = '',
}) {
  const variantThemes = {
    gold: {
      dotColor: '#FBBF24',
      lineColor: '#F59E0B',
      gridColor: 'rgba(245, 158, 11, 0.25)',
      btnBg: '#120F08',
      hoverBg: '#D97706',
      btnBorder: 'rgba(245, 158, 11, 0.4)',
      textColor: '#FDE68A',
      hoverText: '#000000',
    },
    cyan: {
      dotColor: '#67E8F9',
      lineColor: '#06B6D4',
      gridColor: 'rgba(6, 182, 212, 0.25)',
      btnBg: '#081216',
      hoverBg: '#0284C7',
      btnBorder: 'rgba(6, 182, 212, 0.4)',
      textColor: '#A5F3FC',
      hoverText: '#FFFFFF',
    },
    slate: {
      dotColor: '#E2E8F0',
      lineColor: '#94A3B8',
      gridColor: 'rgba(255, 255, 255, 0.15)',
      btnBg: '#0F1218',
      hoverBg: '#27272A',
      btnBorder: 'rgba(255, 255, 255, 0.2)',
      textColor: '#CBD5E1',
      hoverText: '#FFFFFF',
    },
  };

  const theme = variantThemes[variant] || variantThemes.gold;

  return (
    <div
      className={`dot-btn-wrapper ${disabled ? 'disabled' : ''} ${className}`}
      title={title}
      style={{
        '--dot-size': '6px',
        '--line-weight': '1px',
        '--animation-speed': '0.3s',
        '--dot-color': theme.dotColor,
        '--line-color': theme.lineColor,
        '--grid-color': theme.gridColor,
      }}
    >
      <style>{`
        .dot-btn-wrapper {
          position: relative;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          padding: 6px 8px;
          background-color: transparent;
          user-select: none;
        }

        .dot-btn-wrapper::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          pointer-events: none;
          background-image: repeating-linear-gradient(45deg, var(--grid-color) 0 1px, transparent 2px 5px);
          opacity: 0;
          z-index: 0;
          transition: opacity 0.3s ease;
        }

        .dot-btn-wrapper:hover:not(.disabled)::after {
          opacity: 1;
        }

        .dot-btn-wrapper .btn-core {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          background-color: ${theme.btnBg};
          border: 1px solid ${theme.btnBorder};
          color: ${theme.textColor};
          font-family: "JetBrains Mono", monospace;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 6px;
          cursor: pointer;
          transition: transform .2s ease-in-out, letter-spacing .2s ease-in-out, background-color .2s ease-in-out, color .2s ease-in-out;
        }

        .dot-btn-wrapper:hover:not(.disabled) .btn-core {
          background-color: ${theme.hoverBg};
          color: ${theme.hoverText};
          transform: scale(1.03);
          letter-spacing: 0.08em;
        }

        .dot-btn-wrapper:active:not(.disabled) .btn-core {
          transform: scale(0.97);
        }

        /* 4 Corner Dots */
        .dot-btn-wrapper .dot {
          position: absolute;
          width: var(--dot-size);
          aspect-ratio: 1;
          border-radius: 1px;
          background-color: var(--dot-color);
          opacity: 0;
          pointer-events: none;
          z-index: 2;
        }

        .dot-btn-wrapper:hover:not(.disabled) .dot.top.left {
          animation: dot-move-top-left var(--animation-speed) ease-in-out forwards;
        }
        @keyframes dot-move-top-left {
          100% {
            top: calc(var(--dot-size) * -0.5);
            left: calc(var(--dot-size) * -0.5);
            opacity: 1;
          }
        }

        .dot-btn-wrapper:hover:not(.disabled) .dot.top.right {
          animation: dot-move-top-right var(--animation-speed) ease-in-out forwards;
          animation-delay: calc(var(--animation-speed) * 0.4);
        }
        @keyframes dot-move-top-right {
          100% {
            top: calc(var(--dot-size) * -0.5);
            right: calc(var(--dot-size) * -0.5);
            opacity: 1;
          }
        }

        .dot-btn-wrapper:hover:not(.disabled) .dot.bottom.right {
          animation: dot-move-bottom-right var(--animation-speed) ease-in-out forwards;
          animation-delay: calc(var(--animation-speed) * 0.8);
        }
        @keyframes dot-move-bottom-right {
          100% {
            bottom: calc(var(--dot-size) * -0.5);
            right: calc(var(--dot-size) * -0.5);
            opacity: 1;
          }
        }

        .dot-btn-wrapper:hover:not(.disabled) .dot.bottom.left {
          animation: dot-move-bottom-left var(--animation-speed) ease-in-out forwards;
          animation-delay: calc(var(--animation-speed) * 1.2);
        }
        @keyframes dot-move-bottom-left {
          100% {
            bottom: calc(var(--dot-size) * -0.5);
            left: calc(var(--dot-size) * -0.5);
            opacity: 1;
          }
        }

        /* 4 Animated Boundary Lines */
        .dot-btn-wrapper .line {
          position: absolute;
          pointer-events: none;
          z-index: 2;
        }

        .dot-btn-wrapper .line.horizontal {
          height: var(--line-weight);
          width: 100%;
          background-image: repeating-linear-gradient(90deg, transparent 0 calc(var(--line-weight)*2), var(--line-color) calc(var(--line-weight)*2) calc(var(--line-weight)*4));
        }

        .dot-btn-wrapper .line.top {
          top: calc(var(--line-weight) * -0.5);
          transform-origin: top left;
          transform: scaleX(0);
        }
        .dot-btn-wrapper:hover:not(.disabled) .line.top {
          animation: line-draw-top var(--animation-speed) ease-in-out forwards;
          animation-delay: calc(var(--animation-speed) * 0.5);
        }
        @keyframes line-draw-top {
          100% { transform: scaleX(1); }
        }

        .dot-btn-wrapper .line.bottom {
          bottom: calc(var(--line-weight) * -0.5);
          transform-origin: bottom right;
          transform: scaleX(0);
        }
        .dot-btn-wrapper:hover:not(.disabled) .line.bottom {
          animation: line-draw-bottom var(--animation-speed) ease-in-out forwards;
          animation-delay: calc(var(--animation-speed) * 1.3);
        }
        @keyframes line-draw-bottom {
          100% { transform: scaleX(1); }
        }

        .dot-btn-wrapper .line.vertical {
          width: var(--line-weight);
          height: 100%;
          background-image: repeating-linear-gradient(0deg, transparent 0 calc(var(--line-weight)*2), var(--line-color) calc(var(--line-weight)*2) calc(var(--line-weight)*4));
        }

        .dot-btn-wrapper .line.left {
          left: calc(var(--line-weight) * -0.5);
          transform-origin: bottom left;
          transform: scaleY(0);
        }
        .dot-btn-wrapper:hover:not(.disabled) .line.left {
          animation: line-draw-left var(--animation-speed) ease-in-out forwards;
          animation-delay: calc(var(--animation-speed) * 1.6);
        }
        @keyframes line-draw-left {
          100% { transform: scaleY(1); }
        }

        .dot-btn-wrapper .line.right {
          right: calc(var(--line-weight) * -0.5);
          transform-origin: top right;
          transform: scaleY(0);
        }
        .dot-btn-wrapper:hover:not(.disabled) .line.right {
          animation: line-draw-right var(--animation-speed) ease-in-out forwards;
          animation-delay: calc(var(--animation-speed) * 0.9);
        }
        @keyframes line-draw-right {
          100% { transform: scaleY(1); }
        }

        .dot-btn-wrapper.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .dot-btn-wrapper.disabled .btn-core {
          cursor: not-allowed;
        }
      `}</style>

      {/* 4 Animated Lines */}
      {!disabled && (
        <>
          <div className="line horizontal top" />
          <div className="line vertical right" />
          <div className="line horizontal bottom" />
          <div className="line vertical left" />

          {/* 4 Corner Dots */}
          <div className="dot top left" />
          <div className="dot top right" />
          <div className="dot bottom right" />
          <div className="dot bottom left" />
        </>
      )}

      {/* Core Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="btn-core"
      >
        {children}
      </button>
    </div>
  );
}

export default DotBorderButton;
