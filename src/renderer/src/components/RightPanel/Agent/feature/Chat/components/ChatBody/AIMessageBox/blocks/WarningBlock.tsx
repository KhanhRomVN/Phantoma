import React from 'react';

interface WarningBlockProps {
  /** Main title/label for the warning (e.g., "CONTINUING RESPONSE") */
  label: string;
  /** Warning message to display */
  message: string;
  /** Optional custom warning color (defaults to vscode warning color) */
  warningColor?: string;
  /** Whether to show pulsing animation on the dot */
  isPulsing?: boolean;
}

/**
 * WarningBlock component with ToolHeader-style layout.
 * Used for displaying warning messages like response continuation, partial tool assembly, etc.
 */
export const WarningBlock: React.FC<WarningBlockProps> = ({
  label,
  message,
  warningColor = '#cca700',
  isPulsing = true,
}) => {
  return (
    <div className="warning-block-container">
      {/* Header matching ToolHeader style */}
      <div className="warning-block-header flex items-center gap-1.5 mb-1.5">
        {/* Left panel: CircleDot with optional pulsing animation */}
        <div className="warning-block-left">
          <div
            className="warning-circle-dot-container flex items-center justify-center w-6 h-6"
            title={label}
          >
            <div
              className={`warning-circle-dot w-2 h-2 rounded-full${isPulsing ? ' pulsing' : ''}`}
              style={{
                backgroundColor: warningColor,
                ...(isPulsing && {
                  animation: 'warning-pulse 1.5s ease-in-out infinite',
                }),
              }}
            />
          </div>
        </div>

        {/* Right panel: Label */}
        <div className="warning-block-right">
          <span
            className="warning-label text-[10px] font-bold tracking-[0.08em] uppercase opacity-85"
            style={{ color: warningColor }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Warning Message Block */}
      {message && (
        <div
          className="warning-message-block ml-[30px] p-2 rounded-sm"
          style={{
            border: `1px solid color-mix(in srgb, ${warningColor} 30%, transparent)`,
            background: `color-mix(in srgb, ${warningColor} 5%, transparent)`,
          }}
        >
          <span className="text-xs text-text-secondary opacity-85 leading-relaxed">{message}</span>
        </div>
      )}

      <style>{`
        @keyframes warning-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};
