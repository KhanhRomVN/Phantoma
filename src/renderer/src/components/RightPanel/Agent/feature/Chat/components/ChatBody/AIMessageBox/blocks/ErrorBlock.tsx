import React from 'react';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/lib/utils';

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
  isLast = false,
  isLastMessage = false,
  showHeader = true,
  contentPaddingLeft = '36px',
  compact = false,
  maxHeight,
  label = 'ERROR',
}) => {
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
        className={cn(
          'flex items-start gap-1.5 px-2 py-[5px] bg-error/4 border border-error/20 rounded-[4px]',
          maxHeight ? 'overflow-y-auto' : 'overflow-y-visible'
        )}
        style={{ maxHeight: maxHeight || undefined }}
      >
        <span className="codicon codicon-error text-[11px] text-error opacity-70 mt-px shrink-0" />
        <span className="text-[11px] text-error opacity-85 font-mono break-words">
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
          className={cn(
            'mt-1',
            maxHeight ? 'overflow-y-auto' : 'overflow-y-visible'
          )}
          style={{ maxHeight: maxHeight || undefined }}
        >
          <div className="flex items-start gap-1.5 px-2 py-[5px] bg-error/4 border border-error/20 rounded-[4px]">
            <span className="codicon codicon-error text-[11px] text-error opacity-70 mt-px shrink-0" />
            <span className="text-[11px] text-error opacity-85 font-mono break-words">
              {displayMessage}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorBlock;