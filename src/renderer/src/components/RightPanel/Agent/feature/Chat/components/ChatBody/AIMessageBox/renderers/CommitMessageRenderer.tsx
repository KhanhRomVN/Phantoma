import React from 'react';
import { $ } from '@renderer/utils/color';

// CONSTANTS
import { TOOL_ACTION_TYPES, getToolLabel } from '../../../../constants/constants';

// TYPES
import { ToolAction } from '../../../../services/ResponseParser';

// COMPONENTS
import { TagHeader } from '../TagHeader';

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
 * Renderer for commit_message tool type
 * Shows commit message with Accept/Reject buttons
 */
export const CommitMessageRenderer: React.FC<CommitMessageRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked = false,
  isRejected = false,
  isLastItemInList = true,
  onToolClick,
  branch,
}) => {
  const messageContent = action.params?.message || action.params?.content || '';

  const [isCommitted, setIsCommitted] = React.useState(false);

  const statusColor = isRejected
    ? $('--error')
    : isCommitted
      ? $('--success')
      : $('--teal');

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div
        className="terminal-block commit-message-tool"
        style={{ marginBottom: isLastItemInList ? '0' : '8px' }}
      >
        <TagHeader
          title={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: $('--text-primary'),
              }}
            >
              <span style={{ fontWeight: 600, opacity: 0.8 }}>
                {getToolLabel("commit_message")}{branch ? ` (${branch})` : ''}
              </span>
              <span className="codicon codicon-git-commit" style={{ fontSize: '14px' }} />
              {isRejected && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: $('--error'),
                    background:
                      `color-mix(in srgb, ${$('--error')} 15%, transparent)`,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    marginLeft: '4px',
                  }}
                >
                  REJECTED
                </span>
              )}
              {isCommitted && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: $('--success'),
                    background:
                      `color-mix(in srgb, ${$('--success')} 15%, transparent)`,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    marginLeft: '4px',
                  }}
                >
                  ✓ COMMITTED
                </span>
              )}
            </div>
          }
          statusColor={statusColor}
          isPartial={false}
        />
        <div style={{ padding: '4px 12px 12px 0' }}>
          <div
            style={{
              padding: '12px 14px',
              background: $('--card-background'),
              borderRadius: '6px',
              border: `1px solid ${$('--border')}`,
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: '13px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: $('--text-primary'),
              maxHeight: 'auto',
              overflowY: 'visible',
            }}
          >
            {messageContent}
            {isCommitted && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  background:
                    `color-mix(in srgb, ${$('--success')} 10%, transparent)`,
                  border:
                    `1px solid color-mix(in srgb, ${$('--success')} 30%, transparent)`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: $('--text-primary'),
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: $('--success'),
                    marginBottom: '4px',
                  }}
                >
                  Commit thành công!
                </div>
                <div style={{ opacity: 0.8, fontSize: '11px' }}>
                  Hãy chạy{' '}
                  <code
                    style={{
                      background: $('--card-background'),
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                      fontSize: '11px',
                    }}
                  >
                    git push
                  </code>{' '}
                  để đẩy commit lên remote.
                </div>
              </div>
            )}
          </div>
          {!isCommitted && !isRejected && (
            <div
              style={{
                display: 'flex',
                gap: '6px',
                padding: '8px 0 4px 0',
                justifyContent: 'flex-end',
              }}
            >
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
                style={{
                  background: `color-mix(in srgb, $('--teal') 15%, transparent)`,
                  color: $('--teal'),
                  border: `1px solid color-mix(in srgb, $('--teal') 30%, transparent)`,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '24px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `color-mix(in srgb, $('--teal') 25%, transparent)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `color-mix(in srgb, $('--teal') 15%, transparent)`;
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
                style={{
                  background: `color-mix(in srgb, $('--error') 15%, transparent)`,
                  color: $('--error'),
                  border: `1px solid color-mix(in srgb, $('--error') 30%, transparent)`,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: isRejected ? 'default' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '24px',
                  opacity: isRejected ? 0.5 : 1,
                }}
                disabled={isRejected}
                onMouseEnter={(e) => {
                  if (!isRejected) {
                    e.currentTarget.style.background = `color-mix(in srgb, $('--error') 25%, transparent)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isRejected) {
                    e.currentTarget.style.background = `color-mix(in srgb, $('--error') 15%, transparent)`;
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
