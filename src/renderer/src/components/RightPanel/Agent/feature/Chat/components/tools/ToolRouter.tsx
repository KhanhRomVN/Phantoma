import React, { useState, useEffect } from 'react';
import { cn } from '@renderer/shared/lib/utils';
import { getToolColor } from '../../utils/toolUtils';
import { extensionService } from '../../../../services/ExtensionService';
import { Message } from '../../types/message';
import { useProject } from '../../../../context/ProjectContext';
import FileToolRenderer from './FileToolRenderer';
import TerminalToolRenderer from './TerminalToolRenderer';
import GitToolRenderer from './GitToolRenderer';
import { ToolHeader } from './ToolHeader';
import { $ } from '@renderer/utils/color';
import { formatActionForDisplay, ToolAction } from '../../services/ResponseParser';
import { CLICKABLE_TOOLS } from '../../constants/constants';

interface ToolRouterProps {
  group: { action: ToolAction; index: number }[];
  messageId: string;
  clickedActions: Set<string>;
  rejectedActions?: Set<string>;
  onToolClick: (
    action: ToolAction,
    messageId: string,
    actionIndex: number,
    type: 'accept_all' | 'accept_once' | 'reject',
  ) => void;
  executionState?: {
    total: number;
    completed: number;
    status: 'idle' | 'running' | 'error' | 'done';
  };
  isActiveGroup?: boolean;
  failedActions?: Set<string>;
  isLastMessage?: boolean;
  isLastItemInList?: boolean;
  toolOutputs?: Record<string, { output: string; isError: boolean; terminalId?: string }>;
  terminalStatus?: Record<string, 'busy' | 'free'>;
  nextUserMessage?: Message;
  allMessages?: Message[];
  allActions?: ToolAction[];
  activeTerminalIds?: Set<string>;
  attachedTerminalIds?: Set<string>;
  conversationId?: string;
  singleLineReviewActions?: Record<string, { action: any; actionId: string; messageId: string }>;
  onConfirmSingleLineAction?: (actionId: string) => void;
  onRejectSingleLineAction?: (actionId: string) => void;
  onGitConfirm?: (statusItems: any[]) => void;
  onGitCancel?: () => void;
  gitStatusItems?: any[];
  gitStatusBranch?: string;
  isGitProcessing?: boolean;
  isGitStatusVisible?: boolean;
}

const ToolRouter: React.FC<ToolRouterProps> = ({
  group,
  messageId,
  clickedActions,
  rejectedActions,
  onToolClick,
  executionState,
  isActiveGroup,
  isLastMessage,
  isLastItemInList = true,
  toolOutputs,
  terminalStatus,
  nextUserMessage,
  allMessages,
  conversationId,
  singleLineReviewActions,
  onConfirmSingleLineAction,
  onRejectSingleLineAction,
  onGitConfirm,
  onGitCancel,
  gitStatusItems,
  gitStatusBranch,
  isGitProcessing,
  isGitStatusVisible = true,
}) => {
  const { rootPath } = useProject();

  const [fuzzyStatus, setFuzzyStatus] = React.useState<{
    status: string;
    score?: number;
    startLine?: number;
  } | null>(null);
  const [fileStatsMap, setFileStatsMap] = React.useState<
    Record<string, { lines: number; loading: boolean }>
  >({});
  const [isPreviewing, setIsPreviewing] = React.useState<string | null>(null);
  const [storedOutput, setStoredOutput] = useState<string | null>(null);
  const [collapsedActions, setCollapsedActions] = useState<Set<string>>(new Set());
  const processedActions = React.useRef<Set<string>>(new Set());

  const toggleCollapse = (actionId: string) => {
    setCollapsedActions((prev) => {
      const next = new Set(prev);
      next.has(actionId) ? next.delete(actionId) : next.add(actionId);
      return next;
    });
  };

  useEffect(() => {
    const initialCollapsed = new Set<string>();
    group.forEach((item, index) => {
      const actionId = `${messageId}-action-${index}`;
      if (item.action.type !== 'run_command' && !item.action.isPartial) {
        initialCollapsed.add(actionId);
      }
    });
    setCollapsedActions(initialCollapsed);
  }, [group, messageId]);

  const runCommandAction = group.find((g) => g.action.type === 'run_command');
  useEffect(() => {
    if (!nextUserMessage?.content || !runCommandAction) return;
    const commandText = runCommandAction.action.params.command;
    if (!commandText) return;

    const escaped = commandText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(
      `Output: \\[run_command for '${escaped}'.*?\\] .*?with "terminal_output-([a-f0-9-]+)"`,
    ).exec(nextUserMessage.content);

    if (match?.[1]) {
      const outputUuid = match[1];
      const requestId = `read-terminal-${outputUuid}`;
      if (processedActions.current.has(requestId) || storedOutput) return;

      const handleMessage = (event: MessageEvent) => {
        const msg = event.data;
        if (msg.command === 'readTerminalOutputResult' && msg.outputUuid === outputUuid) {
          if (msg.content) setStoredOutput(msg.content);
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
      processedActions.current.add(requestId);
      extensionService.postMessage({
        command: 'readTerminalOutput',
        chatUuid: conversationId || nextUserMessage.conversationId || '',
        outputUuid,
        requestId,
      });
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [nextUserMessage?.id, runCommandAction?.action.params.command, messageId, storedOutput]);

  React.useEffect(() => {
    const cleanups: (() => void)[] = [];

    group.forEach((item) => {
      const { action, index } = item;

      if (action.type === 'replace_in_file' && action.params.diff) {
        const validationId = `${messageId}-${index}-validate`;
        if (processedActions.current.has(validationId)) return;

        const handleMessage = (event: MessageEvent) => {
          const msg = event.data;
          if (msg.command === 'validateFuzzyMatchResult' && msg.id === validationId) {
            setFuzzyStatus({
              status: msg.status,
              score: msg.score,
              startLine: msg.startLine,
            });
            window.removeEventListener('message', handleMessage);
          }
        };
        window.addEventListener('message', handleMessage);
        cleanups.push(() => window.removeEventListener('message', handleMessage));
        processedActions.current.add(validationId);
        (window as any).vscodeApi?.postMessage({
          command: 'validateFuzzyMatch',
          path: action.params.path,
          diff: action.params.diff,
          id: validationId,
        });
      }

      if (
        (action.type === 'read_file' || action.type === 'write_to_file') &&
        (action.params.path || action.params.file_path)
      ) {
        const path = action.params.path || action.params.file_path;
        if (fileStatsMap[path]) return;
        const statId = `${messageId}-${index}-stats`;
        if (processedActions.current.has(statId)) return;
        processedActions.current.add(statId);

        const handleStats = (event: MessageEvent) => {
          const msg = event.data;
          if (msg.command === 'fileStatsResult' && msg.id === statId && msg.path === path) {
            setFileStatsMap((prev) => ({
              ...prev,
              [path]: { lines: msg.lines, loading: false },
            }));
            window.removeEventListener('message', handleStats);
          }
        };
        window.addEventListener('message', handleStats);
        cleanups.push(() => window.removeEventListener('message', handleStats));
        (window as any).vscodeApi?.postMessage({
          command: 'getFileStats',
          path,
          id: statId,
        });
      }
    });

    return () => cleanups.forEach((c) => c());
  }, [group, messageId, isActiveGroup, clickedActions, onToolClick, fileStatsMap]);

  if (!group || group.length === 0) return null;

  const firstAction = group[0].action;
  const toolType = firstAction.type;
  const toolColor = getToolColor(toolType);
  const clickableTools = CLICKABLE_TOOLS;
  const isFileTool =
    toolType === 'replace_in_file' ||
    toolType === 'write_to_file' ||
    toolType === 'read_file' ||
    toolType === 'list_files' ||
    toolType === 'grep' ||
    toolType === 'delete_file' ||
    toolType === 'delete_folder' ||
    toolType === 'move_file';

  if (isFileTool) {
    const MERGE_TYPES = new Set(['write_to_file', 'replace_in_file']);
    const getPath = (a: ToolAction) => a.params.file_path || a.params.path || '';
    const isMergedGroup =
      group.length > 1 &&
      group.every((item) => MERGE_TYPES.has(item.action.type)) &&
      group.every((item) => getPath(item.action) === getPath(group[0].action));

    if (isMergedGroup) {
      return (
        <FileToolRenderer
          key={group[0].index}
          action={group[0].action}
          actionIndex={group[0].index}
          messageId={messageId}
          isActionClicked={group.every((item) =>
            clickedActions.has(`${messageId}-action-${item.index}`),
          )}
          isActiveGroup={isActiveGroup}
          isLastMessage={isLastMessage}
          isLastItemInList={isLastItemInList}
          toolOutputs={toolOutputs}
          allMessages={allMessages}
          fileStatsMap={fileStatsMap}
          onToolClick={onToolClick}
          mergedItems={group}
          conversationId={conversationId}
          singleLineReviewActions={singleLineReviewActions}
          onConfirmSingleLineAction={onConfirmSingleLineAction}
          onRejectSingleLineAction={onRejectSingleLineAction}
        />
      );
    }

    return (
      <>
        {group.map((item, idx) => (
          <FileToolRenderer
            key={item.index}
            action={item.action}
            actionIndex={item.index}
            messageId={messageId}
            isActionClicked={clickedActions.has(`${messageId}-action-${item.index}`)}
            isActiveGroup={isActiveGroup}
            isLastMessage={isLastMessage}
            isLastItemInList={idx === group.length - 1 && isLastItemInList}
            toolOutputs={toolOutputs}
            allMessages={allMessages}
            fileStatsMap={fileStatsMap}
            onToolClick={onToolClick}
            conversationId={conversationId}
            singleLineReviewActions={singleLineReviewActions}
            onConfirmSingleLineAction={onConfirmSingleLineAction}
            onRejectSingleLineAction={onRejectSingleLineAction}
          />
        ))}
      </>
    );
  }

  if (toolType === 'run_command') {
    return (
      <TerminalToolRenderer
        action={firstAction}
        actionIndex={group[0].index}
        messageId={messageId}
        isActionClicked={clickedActions.has(`${messageId}-action-${group[0].index}`)}
        isRejected={rejectedActions?.has(`${messageId}-action-${group[0].index}`)}
        isActiveGroup={isActiveGroup}
        isLastMessage={isLastMessage}
        toolOutputs={toolOutputs}
        terminalStatus={terminalStatus}
        nextUserMessage={nextUserMessage}
        rootPath={rootPath}
        onToolClick={onToolClick}
        storedOutput={storedOutput}
      />
    );
  }

  if (toolType === 'git_status') {
    let finalGitStatusItems = gitStatusItems;
    if (!finalGitStatusItems || finalGitStatusItems.length === 0) {
      let itemsFromParams = firstAction.params?.items || [];
      if (typeof itemsFromParams === 'string') {
        try {
          itemsFromParams = JSON.parse(itemsFromParams);
        } catch (e) {
          itemsFromParams = [];
        }
      }
      finalGitStatusItems = itemsFromParams;
    }
    return (
      <GitToolRenderer
        action={firstAction}
        actionIndex={group[0].index}
        messageId={messageId}
        isActionClicked={clickedActions.has(`${messageId}-action-${group[0].index}`)}
        isActiveGroup={isActiveGroup}
        isLastMessage={isLastMessage}
        isLastItemInList={isLastItemInList}
        toolOutputs={toolOutputs}
        onToolClick={onToolClick}
        gitStatusItems={finalGitStatusItems}
        branch={gitStatusBranch}
        isProcessing={isGitProcessing || executionState?.status === 'running'}
        onConfirm={onGitConfirm}
        onCancel={onGitCancel}
        isVisible={isGitStatusVisible}
      />
    );
  }

  if (toolType === 'commit_message') {
    const messageContent = firstAction.params?.message || firstAction.params?.content || '';
    const actionIndex = group[0].index;
    const actionId = `${messageId}-action-${actionIndex}`;
    const commitColor = getToolColor('commit_message');
    const isRejected = rejectedActions?.has(actionId) || false;
    const [isCommitted, setIsCommitted] = React.useState(false);
    const statusColor = isRejected ? $('--error') : isCommitted ? $('--success') : commitColor;

    return (
      <div className="relative flex flex-col gap-1.5">
        <div
          className={cn(
            'terminal-block commit-message-tool',
            isLastItemInList ? 'mb-0' : 'mb-2',
          )}
        >
          <ToolHeader
            title={
              <div className="flex items-center gap-2 text-xs text-text-primary">
                <span className="font-semibold opacity-80">
                  COMMIT MESSAGE{gitStatusBranch ? `(${gitStatusBranch})` : ''}
                </span>
                <span className="codicon codicon-git-commit text-sm" />
                {isRejected && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded ml-1"
                    style={{
                      color: $('--error'),
                      background: `color-mix(in srgb, ${$('--error')} 15%, transparent)`,
                    }}
                  >
                    REJECTED
                  </span>
                )}
                {isCommitted && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded ml-1"
                    style={{
                      color: $('--success'),
                      background: `color-mix(in srgb, ${$('--success')} 15%, transparent)`,
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
          <div className="px-3 pb-3 pl-[29px]">
            <div
              className="p-3 rounded-md text-[13px] whitespace-pre-wrap break-word max-h-auto overflow-y-visible"
              style={{
                background: $('--background'),
                border: `1px solid ${$('--border')}`,
                color: $('--text-primary'),
              }}
            >
              {messageContent}
              {isCommitted && (
                <div
                  className="mt-3 p-2.5 rounded-md text-xs"
                  style={{
                    background: `color-mix(in srgb, ${$('--success')} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${$('--success')} 30%, transparent)`,
                    color: $('--text-primary'),
                  }}
                >
                  <div className="font-semibold text-success mb-1">Commit thành công!</div>
                  <div className="opacity-80 text-[11px]">
                    Hãy chạy{' '}
                    <code
                      className="px-1.5 py-0.5 rounded text-[11px]"
                      style={{
                        background: $('--background'),
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
              <div className="flex gap-1.5 py-2 pb-1 justify-end">
                <button
                  onClick={() => {
                    const vscodeApi = (window as any).vscodeApi;
                    if (vscodeApi) {
                      setIsCommitted(true);
                      vscodeApi.postMessage({
                        command: 'acceptCommitMessage',
                        message: messageContent,
                      });
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded flex items-center gap-1.5 h-6 cursor-pointer"
                  style={{
                    background: `color-mix(in srgb, ${$('--teal')} 15%, transparent)`,
                    color: $('--teal'),
                    border: `1px solid color-mix(in srgb, ${$('--teal')} 30%, transparent)`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `color-mix(in srgb, ${$('--teal')} 25%, transparent)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `color-mix(in srgb, ${$('--teal')} 15%, transparent)`;
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
                    onToolClick(firstAction, messageId, actionIndex, 'reject');
                    const vscodeApi = (window as any).vscodeApi;
                    if (vscodeApi) {
                      vscodeApi.postMessage({
                        command: 'rejectCommitMessage',
                      });
                    }
                  }}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-semibold rounded flex items-center gap-1.5 h-6',
                    isRejected ? 'cursor-default' : 'cursor-pointer',
                  )}
                  style={{
                    background: `color-mix(in srgb, ${$('--error')} 15%, transparent)`,
                    color: $('--error'),
                    border: `1px solid color-mix(in srgb, ${$('--error')} 30%, transparent)`,
                    opacity: isRejected ? 0.5 : 1,
                  }}
                  disabled={isRejected}
                  onMouseEnter={(e) => {
                    if (!isRejected) {
                      e.currentTarget.style.background = `color-mix(in srgb, ${$('--error')} 25%, transparent)`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isRejected) {
                      e.currentTarget.style.background = `color-mix(in srgb, ${$('--error')} 15%, transparent)`;
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
                  {isRejected ? 'Rejected' : 'Reject'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {group.map(({ action, index }) => (
        <div key={index} className="mb-2">
          <div
            className={cn(
              'flex items-center gap-[var(--spacing-sm)] w-fit',
              'py-[var(--spacing-sm)] px-[var(--spacing-md)]',
              'border-2 rounded-[var(--border-radius-lg)]',
              'transition-all duration-200',
              clickableTools.includes(action.type) ? 'cursor-pointer' : 'cursor-default',
            )}
            style={{
              backgroundColor: $('--secondary-bg'),
              borderColor: toolColor,
            }}
            onClick={() => {
              if (clickableTools.includes(action.type))
                onToolClick(action, messageId, index, 'accept_once');
            }}
          >
            <span
              className="text-[var(--font-size-sm)] font-semibold flex-1"
              style={{ color: $('--text-primary') }}
            >
              {formatActionForDisplay(action)}
            </span>
            {clickableTools.includes(action.type) && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={toolColor}
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </div>
        </div>
      ))}
    </>
  );
};

export default ToolRouter;
