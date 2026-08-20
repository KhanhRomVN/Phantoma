import React from 'react';
import { Check, X } from 'lucide-react';

export interface CommitMessageBlockProps {
  message: string;
  onAccept: () => void;
  onReject: () => void;
  isProcessing?: boolean;
}

/**
 * Block nội dung thuần cho commit message.
 * Header được quản lý bởi ToolRouter/ToolHeader (nhất quán với các tool khác).
 */
const CommitMessageBlock: React.FC<CommitMessageBlockProps> = ({
  message,
  onAccept,
  onReject,
  isProcessing = false,
}) => {
  return (
    <div className="pr-3 pb-3">
      <div
        className="bg-background border border-border rounded-md p-3 font-mono text-[13px] text-text-primary whitespace-pre-wrap break-words overflow-y-auto max-h-[400px] leading-relaxed"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(128,128,128,0.4) transparent' }}
      >
        <pre className="m-0 font-inherit whitespace-pre-wrap break-words">
          {message}
        </pre>
      </div>

      <div className="flex gap-1.5 py-2 justify-end">
        <button
          onClick={onAccept}
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold h-6 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-teal/15 text-teal border border-teal/30"
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = 'color-mix(in srgb, rgb(0, 210, 255) 25%, transparent)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = 'color-mix(in srgb, rgb(0, 210, 255) 15%, transparent)';
            }
          }}
        >
          <Check size={14} strokeWidth={2.5} />
          <span>{isProcessing ? 'Processing' : 'Accept'}</span>
        </button>

        <button
          onClick={onReject}
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold h-6 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-error/15 text-error border border-error/30"
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = 'color-mix(in srgb, rgb(255, 45, 85) 25%, transparent)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = 'color-mix(in srgb, rgb(255, 45, 85) 15%, transparent)';
            }
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