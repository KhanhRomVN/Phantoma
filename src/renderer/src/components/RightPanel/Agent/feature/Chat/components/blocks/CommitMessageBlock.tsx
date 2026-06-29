import React from 'react';
import { Check, X } from 'lucide-react';

export interface CommitMessageBlockProps {
  message: string;
  onAccept: () => void;
  onReject: () => void;
  isProcessing?: boolean;
}

/**
 * Pure content block for commit message.
 * Header is managed by ToolRouter/ToolHeader (consistent with other tools).
 */
const CommitMessageBlock: React.FC<CommitMessageBlockProps> = ({
  message,
  onAccept,
  onReject,
  isProcessing = false,
}) => {
  return (
    <div className="my-2 font-[var(--vscode-font-family,'Segoe_UI','Helvetica_Neue',Arial,sans-serif)]" style={{ padding: '0px 12px 12px 29px' }}>
      <div className="py-2 border-l-2 border-l-[var(--vscode-editorBracketHighlight-foreground2,#4ec9b0)] pl-3 my-1">
        <pre className="font-mono text-[13px] text-[var(--vscode-foreground,#cccccc)] whitespace-pre-wrap break-words m-0 p-0 leading-[1.6]">{message}</pre>
      </div>
      <div className="flex gap-1.5 py-2 justify-end bg-transparent">
        <button
          className="px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 h-6 border border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-[color-mix(in_srgb,var(--vscode-editorBracketHighlight-foreground2,#4ec9b0)_15%,transparent)] text-[var(--vscode-editorBracketHighlight-foreground2,#4ec9b0)] border-[color-mix(in_srgb,var(--vscode-editorBracketHighlight-foreground2,#4ec9b0)_30%,transparent)]"
          onClick={onAccept}
          disabled={isProcessing}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `color-mix(in srgb, var(--vscode-editorBracketHighlight-foreground2, #4ec9b0) 25%, transparent)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `color-mix(in srgb, var(--vscode-editorBracketHighlight-foreground2, #4ec9b0) 15%, transparent)`;
          }}
        >
          <Check size={14} strokeWidth={2.5} />
          <span>{isProcessing ? 'Processing' : 'Accept'}</span>
        </button>
        <button
          className="px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 h-6 border border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-[color-mix(in_srgb,var(--vscode-errorForeground,#ff4d4d)_15%,transparent)] text-[var(--vscode-errorForeground,#ff4d4d)] border-[color-mix(in_srgb,var(--vscode-errorForeground,#ff4d4d)_30%,transparent)]"
          onClick={onReject}
          disabled={isProcessing}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `color-mix(in srgb, var(--vscode-errorForeground, #ff4d4d) 25%, transparent)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `color-mix(in srgb, var(--vscode-errorForeground, #ff4d4d) 15%, transparent)`;
          }}
        >
          <X size={14} strokeWidth={2.5} />
          <span>Reject</span>
        </button>
      </div>
    </div>
  );
};

export default CommitMessageBlock;