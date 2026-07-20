import React from 'react';
import { Check, X } from 'lucide-react';
import { $ } from '@renderer/utils/color';

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
  const accentColor = $('--teal') || '#4ec9b0';
  const errorColor = $('--error') || '#f44336';

  return (
    <div className="px-3 pb-3">
      <div
        className="bg-background border border-border rounded-md p-3 font-mono text-[13px] text-text-primary whitespace-pre-wrap break-words overflow-y-auto max-h-[400px] leading-relaxed"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(128,128,128,0.4) transparent',
        }}
      >
        <pre className="m-0 font-inherit whitespace-pre-wrap break-words">
          {message}
        </pre>
      </div>

      <div className="flex gap-1.5 py-2 justify-end">
        <button
          onClick={onAccept}
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold h-6 border border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
            color: accentColor,
            borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)`,
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = `color-mix(in srgb, ${accentColor} 25%, transparent)`;
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = `color-mix(in srgb, ${accentColor} 15%, transparent)`;
            }
          }}
        >
          <Check size={14} strokeWidth={2.5} />
          <span>{isProcessing ? 'Processing' : 'Accept'}</span>
        </button>

        <button
          onClick={onReject}
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold h-6 border border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `color-mix(in srgb, ${errorColor} 15%, transparent)`,
            color: errorColor,
            borderColor: `color-mix(in srgb, ${errorColor} 30%, transparent)`,
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = `color-mix(in srgb, ${errorColor} 25%, transparent)`;
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = `color-mix(in srgb, ${errorColor} 15%, transparent)`;
            }
          }}
        >
          <X size={14} strokeWidth={2.5} />
          <span>Reject</span>
        </button>
      </div>

      <style>{`
        .commit-message-block pre::-webkit-scrollbar {
          width: 8px;
        }
        .commit-message-block pre::-webkit-scrollbar-track {
          background: transparent;
        }
        .commit-message-block pre::-webkit-scrollbar-thumb {
          background: rgba(128,128,128,0.4);
          border-radius: 4px;
        }
        .commit-message-block pre::-webkit-scrollbar-thumb:hover {
          background: rgba(128,128,128,0.6);
        }
      `}</style>
    </div>
  );
};

export default CommitMessageBlock;