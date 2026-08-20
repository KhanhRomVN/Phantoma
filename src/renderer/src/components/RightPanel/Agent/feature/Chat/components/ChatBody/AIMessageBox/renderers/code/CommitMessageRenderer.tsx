import React from 'react';
import { cn } from '@renderer/shared/utils/cn';

// Constants
import { TOOL_ACTION_TYPES, getToolLabel } from '../../../../../constants/constants';

// Types
import { ToolAction } from '../../../../../services/ResponseParser';

// Components
import { TagHeader } from '../../TagHeader';

interface CommitMessageRendererProps {
  action: ToolAction;
  actionIndex: number;
  messageId: string;
  isActionClicked?: boolean;
  isRejected?: boolean;
  isLastItemInList?: boolean;
  onToolClick: (
    action: ToolAction,
    messageId: string,
    actionIndex: number,
    type: (typeof TOOL_ACTION_TYPES)[keyof typeof TOOL_ACTION_TYPES],
  ) => void;
  branch?: string;
}

/**
 * Renderer cho loại tool commit_message
 * Hiển thị commit message với nút Accept/Reject
 */
export const CommitMessageRenderer: React.FC<CommitMessageRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isRejected = false,
  isLastItemInList = true,
  onToolClick,
  branch,
}) => {
  const messageContent = action.params?.message || action.params?.content || '';

  const [isCommitted, setIsCommitted] = React.useState(false);

  const statusColor = isRejected
    ? 'rgb(255, 45, 85)'
    : isCommitted
      ? 'rgb(48, 209, 88)'
      : 'rgb(0, 210, 255)';

  return (
    <div className="relative flex flex-col gap-1.5">
      <div className={cn(isLastItemInList ? 'mb-0' : 'mb-2')}>
        <TagHeader
          title={
            <div className="flex items-center gap-2 text-xs text-text-primary">
              <span className="font-semibold opacity-80">
                {getToolLabel('commit_message')}
                {branch ? ` (${branch})` : ''}
              </span>
              <span className="codicon codicon-git-commit text-sm" />
              {isRejected && (
                <span className="text-[10px] font-semibold text-error bg-error/15 py-0.5 px-2 rounded ml-1">
                  REJECTED
                </span>
              )}
              {isCommitted && (
                <span className="text-[10px] font-semibold text-success bg-success/15 py-0.5 px-2 rounded ml-1">
                  ✓ COMMITTED
                </span>
              )}
            </div>
          }
          statusColor={statusColor}
          isPartial={false}
        />
        <div className="pt-1 pr-3 pb-3">
          <div className="py-3 px-3.5 bg-card-background rounded-md border border-border font-mono text-[13px] whitespace-pre-wrap break-words text-text-primary max-h-auto overflow-y-visible">
            {messageContent}
            {isCommitted && (
              <div className="mt-3 py-2.5 px-3.5 bg-success/10 border border-success/30 rounded-md text-xs text-text-primary">
                <div className="font-semibold text-success mb-1">Commit thành công!</div>
                <div className="opacity-80 text-[11px]">
                  Hãy chạy{' '}
                  <code className="bg-card-background py-0.5 px-1.5 rounded font-mono text-[11px]">
                    git push
                  </code>{' '}
                  để đẩy commit lên remote.
                </div>
              </div>
            )}
          </div>
          {!isCommitted && !isRejected && (
            <div className="flex gap-1.5 py-2 justify-end">
              <button
                onClick={() => {
                  const vscodeApi = (window as any).vscodeApi;
                  if (vscodeApi) {
                    setIsCommitted(true);
                    vscodeApi.postMessage({
                      command: 'gitCommit',
                      message: messageContent,
                    });
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold h-6 cursor-pointer bg-teal/15 text-teal border border-teal/30"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    'color-mix(in srgb, rgb(0, 210, 255) 25%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    'color-mix(in srgb, rgb(0, 210, 255) 15%, transparent)';
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Accept
              </button>
              <button
                onClick={() => {
                  onToolClick(action, messageId, actionIndex, 'reject');
                  const vscodeApi = (window as any).vscodeApi;
                  if (vscodeApi) {
                    vscodeApi.postMessage({
                      command: 'rejectCommitMessage',
                    });
                  }
                }}
                disabled={isRejected}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold h-6 bg-error/15 text-error border border-error/30',
                  isRejected ? 'opacity-50 cursor-default' : 'cursor-pointer',
                )}
                onMouseEnter={(e) => {
                  if (!isRejected) {
                    e.currentTarget.style.background =
                      'color-mix(in srgb, rgb(255, 45, 85) 25%, transparent)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isRejected) {
                    e.currentTarget.style.background =
                      'color-mix(in srgb, rgb(255, 45, 85) 15%, transparent)';
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
