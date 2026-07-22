import React, { useState } from 'react';
import { $ } from '@renderer/utils/color';
import { ToolHeader } from '../../../tools/ToolHeader';

export interface ErrorBlockProps {
  content: string;
  errorCode?: string;
  isPartial?: boolean;
  isLast?: boolean;
  isLastMessage?: boolean;
  /** Whether to show the ToolHeader (default: true) */
  showHeader?: boolean;
  /** Padding left for content when header is hidden */
  contentPaddingLeft?: string;
  /** Use compact inline style (like GrepBlock error) instead of full header style */
  compact?: boolean;
  /** Maximum height for error content */
  maxHeight?: string;
}

// Parse error message to extract meaningful information
const parseErrorMessage = (msg: string): string => {
  // ENOENT: no such file or directory, open '/path/to/file'
  const enoentMatch = msg.match(/ENOENT: no such file or directory, open '([^']+)'/);
  if (enoentMatch) {
    const filePath = enoentMatch[1];
    const fileName = filePath.split('/').pop() || filePath;
    return `Error: ${fileName} does not exist`;
  }

  // EACCES: permission denied, open '/path/to/file'
  const eaccesMatch = msg.match(/EACCES: permission denied, open '([^']+)'/);
  if (eaccesMatch) {
    const filePath = eaccesMatch[1];
    const fileName = filePath.split('/').pop() || filePath;
    return `Error: Permission denied to access ${fileName}`;
  }

  // EISDIR: illegal operation on a directory, read '/path/to/dir'
  const eisdirMatch = msg.match(
    /EISDIR: illegal operation on a directory, (?:open|read) '([^']+)'/,
  );
  if (eisdirMatch) {
    const dirPath = eisdirMatch[1];
    const dirName = dirPath.split('/').pop() || dirPath;
    return `Error: ${dirName} is a directory, not a file`;
  }

  // ENOTDIR: not a directory, open '/path/to/file'
  const enotdirMatch = msg.match(/ENOTDIR: not a directory, open '([^']+)'/);
  if (enotdirMatch) {
    const filePath = enotdirMatch[1];
    const fileName = filePath.split('/').pop() || filePath;
    return `Error: ${fileName} is not a directory`;
  }

  // Generic: remove "Error - " prefix if present
  let cleaned = msg.replace(/^Error - /, '');
  // Remove full path if present (keep only filename)
  cleaned = cleaned.replace(/\/[^\s]+/g, (match) => {
    const parts = match.split('/');
    return parts.length > 1 ? parts[parts.length - 1] : match;
  });
  return cleaned;
};

const ErrorBlock: React.FC<ErrorBlockProps> = ({
  content,
  errorCode,
  isPartial = false,
  // isLast and isLastMessage are unused but kept for compatibility
  showHeader = true,
  contentPaddingLeft = '36px',
  compact = false,
  maxHeight,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const errorColor = $('--error') || '#f44336';

  // Extract the actual error message (remove "Error:" prefix if present)
  const cleanContent = content.replace(/^Error:\s*/i, '');

  // Parse error code from "[CODE] message" format
  const codeMatch = cleanContent.match(/^\[([^\]]+)\]\s*(.*)/s);
  const displayErrorCode = errorCode || (codeMatch ? codeMatch[1] : null);
  let displayMessage = codeMatch ? codeMatch[2] : cleanContent;

  // Parse and simplify error message
  displayMessage = parseErrorMessage(displayMessage);

  // Compact inline style (like GrepBlock error)
  if (compact) {
    return (
      <div
        className="flex items-start gap-1.5 px-2 py-[5px] bg-error/4 border border-error/20 rounded-[4px]"
        style={{
          maxHeight: maxHeight || undefined,
          overflowY: maxHeight ? 'auto' : 'visible',
        }}
      >
        <span className="codicon codicon-error text-[11px] text-error opacity-70 mt-px shrink-0" />
        <span className="text-[11px] text-error opacity-85 font-mono break-words">
          {displayMessage}
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-1.5 pb-0">
      <div className="terminal-block border-none bg-transparent overflow-visible rounded-none [&_.terminal-block-header]:border-b-0">
        {showHeader && (
          <ToolHeader
            title={
              <div className="flex items-center gap-2 text-xs text-primary">
                <span style={{ fontWeight: 600, opacity: 0.8, color: errorColor }}>ERROR</span>
                {displayErrorCode && (
                  <span
                    style={{ fontWeight: 500, opacity: 0.7, fontSize: '11px', color: errorColor }}
                  >
                    {displayErrorCode}
                  </span>
                )}
              </div>
            }
            statusColor={errorColor}
            isPartial={isPartial}
            isCollapsed={isCollapsed}
            onClick={() => {
              if (content) setIsCollapsed(!isCollapsed);
            }}
          />
        )}

        {!isCollapsed && (
          <div
            className="error-block-content pt-2 px-3 pb-3 font-mono text-xs leading-[1.6] text-primary whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto border border-error/40 rounded-md bg-error/6 mt-1 mx-3 mb-2"
            style={{
              marginLeft: showHeader ? '36px' : contentPaddingLeft,
              marginTop: '0',
              marginBottom: '0',
              marginRight: '0',
              display: 'flex',
              alignItems: 'center',
              minHeight: '32px',
              maxHeight: maxHeight || undefined,
              overflowY: maxHeight ? 'auto' : 'visible',
            }}
          >
            <div className="whitespace-pre-wrap break-words text-error">{displayMessage}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorBlock;
