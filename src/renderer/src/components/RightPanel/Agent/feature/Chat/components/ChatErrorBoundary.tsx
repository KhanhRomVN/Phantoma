import React from "react";

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
    console.error("[ChatErrorBoundary] Render error caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div
          className="flex flex-col gap-2 px-5 py-4 m-3 rounded-lg"
          style={{
            border:
              "1px solid color-mix(in srgb, var(--vscode-errorForeground, #f44336) 30%, transparent)",
            background:
              "color-mix(in srgb, var(--vscode-errorForeground, #f44336) 5%, transparent)",
          }}
        >
          <div
            className="flex items-center gap-2 font-semibold text-[13px]"
            style={{ color: "var(--vscode-errorForeground, #f44336)" }}
          >
            <span className="codicon codicon-error text-sm" />
            Something went wrong rendering this message
          </div>
          {this.state.error && (
            <pre
              className="text-[11px] m-0 whitespace-pre-wrap break-words max-h-[120px] overflow-y-auto"
              style={{ color: "var(--vscode-descriptionForeground)" }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="self-start px-3 py-1 text-[11px] font-semibold rounded cursor-pointer bg-transparent"
            style={{
              border:
                "1px solid color-mix(in srgb, var(--vscode-foreground) 25%, transparent)",
              color: "var(--vscode-foreground)",
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}