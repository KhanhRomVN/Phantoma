import React from 'react';
import { cn } from '@renderer/shared/utils/cn';

// ── Hooks ──
import { useSettings } from '../../../../../../../context/SettingsContext';

// Services
import { extensionService } from '../../../../../../../services/ExtensionService';

// ── Constants ──
import {
  TOOL_ACTION_TYPES,
  TERMINAL_STATUS,
  type TerminalStatus,
  getToolLabel,
} from '../../../../../constants/constants';

// ── Types ──
import { ToolAction } from '../../../../../services/ResponseParser';
import { Message } from '../../../../../types/message';

// ICONS
import FileIcon from '@renderer/components/common/FileIcon';

// ── Components ──
import { TagHeader } from '../../TagHeader';
import ActionBar from '../../ActionBar';
import ErrorBlock from '../../blocks/other/ErrorBlock';
import { TerminalBlock } from '../../blocks/code/TerminalBlock';

interface RunCommandRendererProps {
  action: ToolAction;
  actionIndex: number;
  messageId: string;
  isActionClicked: boolean;
  isRejected?: boolean;
  isActiveGroup?: boolean;
  isLastMessage?: boolean;
  toolOutputs?: Record<string, { output: string; isError: boolean; terminalId?: string }>;
  terminalStatus?: Record<string, TerminalStatus>;
  nextUserMessage?: Message;
  rootPath?: string;
  onToolClick: (
    action: ToolAction,
    messageId: string,
    index: number,
    type: (typeof TOOL_ACTION_TYPES)[keyof typeof TOOL_ACTION_TYPES],
  ) => void;
  storedOutput?: string | null;
}

export const RunCommandRenderer: React.FC<RunCommandRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isRejected: isRejectedProp,
  isActiveGroup,
  toolOutputs,
  terminalStatus,
  nextUserMessage,
  rootPath,
  onToolClick,
  storedOutput,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isRejectedLocal, setIsRejectedLocal] = React.useState(false);
  useSettings();
  const actionId = `${messageId}-action-${actionIndex}`;
  const outputData = toolOutputs?.[actionId];

  // Detect rejection from output message or local state
  const isRejectedFromOutput = outputData?.output?.includes('rejected by user');
  const isRejected = isRejectedProp || isRejectedLocal || isRejectedFromOutput;

  // Listen for markActionRejected window messages (fired by useToolExecution)
  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.command === 'markActionRejected' && event.data?.actionId === actionId) {
        setIsRejectedLocal(true);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [actionId]);

  // Check if action has validation error
  const hasValidationError = !!action.isError;

  const commandText = action.params.command || '';

  const folderPath = action.params.folder_path || action.params.cwd || rootPath || '';

  // Determine if folderPath is within workspace (relative) or outside (system path)
  const isRelativePath = rootPath && folderPath.startsWith(rootPath);
  const displayFolderPath = isRelativePath
    ? folderPath.substring(rootPath.length).replace(/^\//, '') || '.'
    : folderPath;
  const folderName = folderPath ? folderPath.split('/').filter(Boolean).pop() || folderPath : '';

  let extractedOutput: string | undefined;
  if (!outputData?.output && nextUserMessage?.content) {
    if (commandText) {
      const escaped = commandText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = new RegExp(
        `Output: \\[run_command for '${escaped}'.*?\\][^\\n]*\\n\\s*\`\`\`\\n([\\s\\S]*?)\\n\\s*\`\`\``,
      ).exec(nextUserMessage.content);
      if (match?.[1]) extractedOutput = match[1];
    }
  }

  const terminalId = (outputData as any)?.terminalId || action.params.terminal_id;
  const hasOutput = !!outputData || !!extractedOutput || !!storedOutput;
  const isTerminalBusy =
    !isRejected &&
    (hasOutput
      ? terminalStatus?.[terminalId] === TERMINAL_STATUS.BUSY
      : terminalId
        ? terminalStatus?.[terminalId] === TERMINAL_STATUS.BUSY ||
          (isActionClicked && terminalStatus?.[terminalId] === undefined)
        : isActionClicked);
  const isLoading = isActionClicked && (!hasOutput || isTerminalBusy);
  const isCompleted = hasOutput && !isTerminalBusy;

  // Calculate execution time (if completed)
  const [executionTime, setExecutionTime] = React.useState<string>('');
  React.useEffect(() => {
    if (isCompleted && outputData) {
      setExecutionTime('');
    }
  }, [isCompleted, outputData]);

  return (
    <div className="flex flex-col gap-1.5 pb-1 mb-0.5">
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary flex-1">
            <span className="font-semibold opacity-80 shrink-0">{getToolLabel('run_command')}</span>
            {folderName && (
              <>
                <FileIcon
                  path={folderPath}
                  isFolder={true}
                  style={{ width: '14px', height: '14px', flexShrink: 0 }}
                />
                <span className="font-medium opacity-80 font-mono text-[11px] shrink-0">
                  {folderName}
                </span>
              </>
            )}
            {isCompleted && executionTime && (
              <span className="opacity-50 text-[10px] text-text-secondary shrink-0">
                {executionTime}
              </span>
            )}
            {isTerminalBusy && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  extensionService.postMessage({
                    command: 'closeTerminal',
                    actionId,
                    terminalId,
                  });
                }}
                title="Finalize output, kill process and delete terminal"
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold h-6 uppercase ml-auto shrink-0 cursor-pointer',
                  'bg-error/10 border border-error/30 text-error',
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
                Finalize
              </button>
            )}
          </div>
        }
        statusColor={
          isRejected
            ? 'rgb(255, 45, 85)'
            : isCompleted
              ? 'rgb(48, 209, 88)'
              : isTerminalBusy || (isActionClicked && !outputData)
                ? 'rgb(255, 159, 10)'
                : 'rgb(106, 122, 154)'
        }
        isError={isRejected}
        isWaitingApproval={!!isActiveGroup && !isCompleted && !isTerminalBusy}
        toolType="run_command"
        isPartial={isTerminalBusy}
        path={displayFolderPath}
        onPathClick={(clickedPath) => {
          extensionService.postMessage({
            command: 'openFile',
            path: isRelativePath && rootPath ? `${rootPath}/${clickedPath}` : clickedPath,
          });
        }}
        onClick={() => {
          if (isCompleted || hasOutput) setIsCollapsed((v) => !v);
        }}
      />

      {isCollapsed ? (
        <div
          onClick={() => setIsCollapsed(false)}
          className="font-mono text-xs text-text-primary py-1.5 px-2.5 bg-background border border-border rounded-md whitespace-pre-wrap break-all overflow-hidden cursor-pointer leading-[1.5]"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {commandText}
        </div>
      ) : isRejected ? (
        <TerminalBlock
          logs=""
          initialCommand={action.params.command}
          cwd={action.params.cwd || rootPath}
          rejectedOutline
        />
      ) : (
        <>
          <TerminalBlock
            logs={outputData?.output || extractedOutput || storedOutput || ''}
            initialCommand={action.params.command}
            cwd={action.params.cwd || rootPath}
            onInput={
              isTerminalBusy
                ? (data: any) => {
                    if (terminalId)
                      extensionService.postMessage({
                        command: 'terminalInput',
                        terminalId,
                        data,
                      });
                  }
                : undefined
            }
          />
          {!isTerminalBusy && !isCompleted && (
            <ActionBar
              action={action}
              messageId={messageId}
              actionIndex={actionIndex}
              hasError={hasValidationError}
              isCompleted={isCompleted}
              isLoading={isLoading}
              onAction={(e, type) => {
                if (!isCompleted && !isLoading) {
                  onToolClick(
                    {
                      ...action,
                      params: { ...action.params, terminal_id: terminalId },
                    },
                    messageId,
                    actionIndex,
                    type,
                  );
                }
              }}
            />
          )}
        </>
      )}
      {hasValidationError && action.errorMessage && (
        <ErrorBlock
          content={`Validation Error: ${action.errorMessage}`}
          compact={true}
          maxHeight="300px"
        />
      )}
    </div>
  );
};
