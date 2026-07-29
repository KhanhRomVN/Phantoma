import React from 'react';
import { $ } from '@renderer/utils/color';

// HOOKS
import { useSettings } from '../../../../../../context/SettingsContext';

// SERVICES
import { extensionService } from '../../../../../../services/ExtensionService';

// CONSTANTS
import {
  TOOL_ACTION_TYPES,
  TERMINAL_STATUS,
  type TerminalStatus,
  getToolLabel,
} from '../../../../constants/constants';

// TYPES
import { ToolAction } from '../../../../services/ResponseParser';
import { Message } from '../../../../types/message';

// UTILS
import { getPermissionDecision } from '../../../../utils/permissionUtils';

// ICONS
import FileIcon from '@renderer/components/common/FileIcon';

// COMPONENTS
import { TagHeader } from '../TagHeader';
import ActionBar from '../ActionBar';
import ErrorBlock from '../blocks/ErrorBlock';
import { TerminalBlock } from '../blocks/TerminalBlock';

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
  isLastMessage,
  toolOutputs,
  terminalStatus,
  nextUserMessage,
  rootPath,
  onToolClick,
  storedOutput,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isRejectedLocal, setIsRejectedLocal] = React.useState(false);
  const { permissionMode } = useSettings();
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

  const needsPrompt = getPermissionDecision(permissionMode, 'run_command') === 'confirm';
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        paddingBottom: '4px',
        marginBottom: '2px',
      }}
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
              flex: 1,
            }}
          >
            <span style={{ fontWeight: 600, opacity: 0.8, flexShrink: 0 }}>
              {getToolLabel('run_command')}
            </span>
            {folderName && (
              <>
                <FileIcon
                  path={folderPath}
                  isFolder={true}
                  style={{ width: '14px', height: '14px', flexShrink: 0 }}
                />
                <span
                  style={{
                    fontWeight: 500,
                    opacity: 0.8,
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    fontSize: '11px',
                    flexShrink: 0,
                  }}
                >
                  {folderName}
                </span>
              </>
            )}
            {isCompleted && executionTime && (
              <span
                style={{
                  opacity: 0.5,
                  fontSize: '10px',
                  color: $('--text-secondary'),
                  flexShrink: 0,
                }}
              >
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
                style={{
                  background:
                    `color-mix(in srgb, ${$('--error')} 10%, transparent)`,
                  border:
                    `1px solid color-mix(in srgb, ${$('--error')} 30%, transparent)`,
                  cursor: 'pointer',
                  color: $('--error'),
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  gap: '6px',
                  height: '24px',
                  textTransform: 'uppercase',
                  marginLeft: 'auto',
                  flexShrink: 0,
                }}
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
            ? $('--error')
            : isCompleted
              ? $('--success')
              : isTerminalBusy || (isActionClicked && !outputData)
                ? $('--warn')
                : isActiveGroup
                  ? $('--text-secondary')
                  : $('--text-secondary')
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
          style={{
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: '12px',
            color: $('--text-primary'),
            padding: '6px 10px',
            backgroundColor: $('--background'),
            border: `1px solid ${$('--border')}`,
            borderRadius: '6px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            cursor: 'pointer',
            lineHeight: '1.5',
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