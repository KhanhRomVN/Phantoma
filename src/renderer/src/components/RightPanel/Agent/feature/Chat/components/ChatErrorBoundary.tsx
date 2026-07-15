import React from 'react';

interface ChatErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ChatErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback UI. Defaults to a minimal error card. */
  fallback?: React.ReactNode;
}

/**
 * Error boundary for the chat panel.
 * Catches render errors from child components (e.g. MarkdownBlock, ToolRouter)
 * and shows a recoverable error UI instead of crashing the entire webview.
 */
export class ChatErrorBoundary extends React.Component<
  ChatErrorBoundaryProps,
  ChatErrorBoundaryState
> {
  constructor(props: ChatErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ChatErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ChatErrorBoundary] Render error caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const errorColor = 'var(--vscode-errorForeground, #f44336)';

      return (
        <div className="p-3 flex flex-col gap-2">
          {/* Header matching ToolHeader style */}
          <div className="flex items-start justify-between w-full">
            {/* Left panel: CircleDot */}
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div
                className="relative w-4 h-4 shrink-0 flex items-center justify-center mt-0.5"
                title="Error - Render failed"
              >
                {/* CircleDot */}
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: errorColor }}
                />
              </div>
            </div>

            {/* Right panel: ERROR label */}
            <div className="shrink-0 ml-2">
              <span className="text-[11px] font-semibold text-error uppercase tracking-wider">
                ERROR
              </span>
            </div>
          </div>

          {/* Error Block */}
          {this.state.error && (
            <div
              className="p-3 rounded-md"
              style={{
                border: `1px solid color-mix(in srgb, ${errorColor} 30%, transparent)`,
                background: `color-mix(in srgb, ${errorColor} 5%, transparent)`,
              }}
            >
              <pre className="text-[11px] text-text-secondary m-0 whitespace-pre-wrap break-words max-h-[120px] overflow-y-auto font-mono">
                {this.state.error.message}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}