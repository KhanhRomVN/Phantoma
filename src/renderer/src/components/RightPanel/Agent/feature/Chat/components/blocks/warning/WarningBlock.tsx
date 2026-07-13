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
  warningColor = 'var(--vscode-editorWarning-foreground, #cca700)',
  isPulsing = true,
}) => {
  return (
    <div className="warning-block-container">
      {/* Header matching ToolHeader style */}
      <div className="warning-block-header" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        {/* Left panel: CircleDot with optional pulsing animation */}
        <div className="warning-block-left">
          <div
            className="warning-circle-dot-container"
            title={label}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}
          >
            <div
              className={`warning-circle-dot${isPulsing ? ' pulsing' : ''}`}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
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
            className="warning-label"
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: warningColor,
              opacity: 0.85,
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Warning Message Block */}
      {message && (
        <div
          className="warning-message-block"
          style={{
            marginLeft: '30px',
            padding: '8px 12px',
            borderRadius: '4px',
            border: `1px solid color-mix(in srgb, ${warningColor} 30%, transparent)`,
            background: `color-mix(in srgb, ${warningColor} 5%, transparent)`,
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: 'var(--vscode-editor-foreground)',
              opacity: 0.85,
              lineHeight: 1.5,
            }}
          >
            {message}
          </span>
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