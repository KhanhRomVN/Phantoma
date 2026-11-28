import React from 'react';
/**
 * ------------------------------------------------------------------
 * ErrorBlock
 * ------------------------------------------------------------------
 * Block hiển thị lỗi trong chat.
 * Parse error messages để hiển thị thân thiện hơn.
 *
 * Main features:
 * - Parse ENOENT và common error patterns
 * - Hiển thị error code nếu có
 * - Collapsible cho long error messages
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { cn } from '@renderer/utils/cn';
import { parseErrorMessage } from '@renderer/components/Widgets/Zen/features/chat/utils/parse_error_message';

// ─── Types ──────────────────────────────────────────────────────────────
export interface ErrorBlockProps {
  content: string;
  errorCode?: string;
  isPartial?: boolean;
  isLast?: boolean;
  isLastMessage?: boolean;
  showHeader?: boolean;
  contentPaddingLeft?: string;
  compact?: boolean;
  maxHeight?: string;
  label?: string;
}

const ErrorBlock: React.FC<ErrorBlockProps> = ({ content, compact = false, maxHeight }) => {
  // Extract the actual error message (remove "Error:" prefix if present)
  const cleanContent = content.replace(/^Error:\s*/i, '');

  // Parse error code from "[CODE] message" format
  const codeMatch = cleanContent.match(/^\[([^\]]+)\]\s*(.*)/s);
  let displayMessage = codeMatch ? codeMatch[2] : cleanContent;

  // Parse and simplify error message
  displayMessage = parseErrorMessage(displayMessage);

  // Compact inline style (like GrepBlock error)
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-start gap-1.5 px-2 py-[5px] bg-error/4 border border-error/20 rounded-[4px]',
          maxHeight ? 'overflow-y-auto' : 'overflow-y-visible',
        )}
        style={{ maxHeight: maxHeight || undefined }}
      >
        <span className="codicon codicon-error text-[12px] text-error opacity-70 mt-px shrink-0" />
        <span className="text-[12px] text-error opacity-85 font-mono break-words">
          {displayMessage}
        </span>
      </div>
    );
  }

  // Full style — header removed, only error content remains (matching Zen)
  return (
    <div className="relative flex flex-col gap-1.5 pb-0">
      <div className="bg-transparent rounded-none overflow-visible">
        <div
          className={cn('mt-1', maxHeight ? 'overflow-y-auto' : 'overflow-y-visible')}
          style={{ maxHeight: maxHeight || undefined }}
        >
          <div className="flex items-start gap-1.5 px-2 py-[5px] bg-error/4 border border-error/20 rounded-[4px]">
            <span className="codicon codicon-error text-[12px] text-error opacity-70 mt-px shrink-0" />
            <span className="text-[12px] text-error opacity-85 font-mono break-words">
              {displayMessage}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorBlock;
