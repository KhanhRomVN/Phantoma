import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@renderer/shared/utils/cn';

// ── Terminal ──
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

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

// ── Utils ──
import { $ } from '@renderer/utils/color';

// ICONS
import FileIcon from '@renderer/components/common/FileIcon';

// ── Components ──
import { TagHeader } from '../../TagHeader';
import ActionBar from '../../ActionBar';
import ErrorBlock from '../../blocks/other/ErrorBlock';

interface TerminalBlockProps {
  logs: string;
  status?: 'busy' | 'idle' | 'free';
  maxHeight?: number;
  rows?: number;
  initialCommand?: string;
  cwd?: string;
  onInput?: (data: string) => void;
  rejectedOutline?: boolean;
}

const CopyIcon: React.FC = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/** Copy button:
 *  - hidden (opacity 0) by default, shown (opacity 1) via parent CSS class
 *  - no background in resting state, subtle bg on hover
 *  - shows checkmark for 1.5 s after copy
 */
const CopyButton: React.FC<{ getText: () => string; title?: string }> = ({ getText, title }) => {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = getText();
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title || 'Copy'}
      className="terminal-copy-btn flex items-center justify-center w-[22px] h-[22px] p-0 border-none rounded-[4px] cursor-pointer shrink-0 transition-[background,color,opacity] duration-[0.15s]"
      style={{
        background: copied
          ? 'color-mix(in srgb, ' + ($('--success') || '') + ' 15%, transparent)'
          : hovered
            ? 'color-mix(in srgb, ' + ($('--primary-text') || '') + ' 22%, transparent)'
            : 'transparent',
        color: copied ? $('--success') : $('--text-primary'),
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
};

const TerminalInputBar: React.FC<{ onInput: (data: string) => void }> = ({ onInput }) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onInput(value + '\n');
      setValue('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    const lineHeight = 18;
    ta.style.height = Math.min(ta.scrollHeight, lineHeight * 3) + 'px';
  };

  return (
    <div className="flex items-end px-2.5 py-1 border-t border-border bg-input-background">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="type and press Enter…"
        rows={1}
        className="flex-1 bg-transparent border-none outline-none resize-none overflow-hidden text-text-primary font-mono text-xs leading-[1.5]"
      />
    </div>
  );
};

/** Helper: Read a CSS custom property value from the document root.
 *  Returns the resolved value or fallback if unavailable.
 *  This is needed because xterm.js requires actual color values,
 *  not CSS var() strings which it cannot parse. */
const getCSSVar = (name: string, fallback: string): string => {
  if (typeof document === 'undefined' || !document.documentElement) return fallback;
  const styles = getComputedStyle(document.documentElement);
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
};

/** Build xterm.js theme object by reading VS Code CSS variables from the DOM.
 *  This ensures xterm receives actual resolved color values,
 *  so terminal output colors match the current VS Code theme. */
const buildXtermTheme = () => ({
  background: 'transparent',
  foreground: getCSSVar('--terminal-foreground', '#cccccc'),
  cursor: getCSSVar('--terminal-foreground', '#cccccc'),
  black: getCSSVar('--terminal-ansiBlack', '#000000'),
  red: getCSSVar('--terminal-ansiRed', '#cd3131'),
  green: getCSSVar('--terminal-ansiGreen', '#0dbc79'),
  yellow: getCSSVar('--terminal-ansiYellow', '#e5e510'),
  blue: getCSSVar('--terminal-ansiBlue', '#2472c8'),
  magenta: getCSSVar('--terminal-ansiMagenta', '#bc3fbc'),
  cyan: getCSSVar('--terminal-ansiCyan', '#11a8cd'),
  white: getCSSVar('--terminal-ansiWhite', '#e5e5e5'),
  brightBlack: getCSSVar('--terminal-ansiBrightBlack', '#666666'),
  brightRed: getCSSVar('--terminal-ansiBrightRed', '#f14c4c'),
  brightGreen: getCSSVar('--terminal-ansiBrightGreen', '#23d18b'),
  brightYellow: getCSSVar('--terminal-ansiBrightYellow', '#f5f543'),
  brightBlue: getCSSVar('--terminal-ansiBrightBlue', '#3b8eea'),
  brightMagenta: getCSSVar('--terminal-ansiBrightMagenta', '#d670d6'),
  brightCyan: getCSSVar('--terminal-ansiBrightCyan', '#29b8db'),
  brightWhite: getCSSVar('--terminal-ansiBrightWhite', '#e5e5e5'),
});

const TerminalBlock: React.FC<TerminalBlockProps> = ({
  logs,
  status,
  maxHeight = 400,
  initialCommand,
  rows = 22,
  onInput,
  rejectedOutline,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  const formatCommand = (cmd: string) => {
    if (!cmd) return '';
    const lines = cmd.split('\n');
    if (lines.length > 3) {
      return lines.slice(0, 3).join('\n') + '\n...';
    }
    return cmd;
  };

  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isXtermVisible, setIsXtermVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [physicalLineCount, setPhysicalLineCount] = useState(0);
  const canExpand = physicalLineCount > 15;

  const toggleExpand = () => {
    if (canExpand) setIsExpanded((v) => !v);
  };

  const stripAnsi = (str: string) =>
    str.replace(/\x1B\[[0-9;?]*[A-Za-z~]/g, '').replace(/\x1b\].*?(\x07|\x1b\\)/g, '');

  useEffect(() => {
    if (logs || status === 'busy') {
      setIsXtermVisible(true);
    } else {
      setIsXtermVisible(false);
    }
  }, [logs, status]);

  useEffect(() => {
    if (!isXtermVisible || !terminalRef.current) return;

    if (!xtermRef.current) {
      const term = new Terminal({
        cursorBlink: false,
        cursorStyle: 'underline',
        cursorInactiveStyle: 'none',
        disableStdin: true,
        fontSize: 12,
        theme: buildXtermTheme(),
        allowProposedApi: true,
        rows: rows,
        cols: 80,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      term.attachCustomKeyEventHandler(() => false);

      const handleResize = () => {
        fitAddon.fit();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        term.dispose();
        window.removeEventListener('resize', handleResize);
        xtermRef.current = null;
        lastWrittenLogsRef.current = '';
      };
    }

    // Return a cleanup function for the case where xtermRef.current already exists
    return () => {};
  }, [isXtermVisible]);

  const lastWrittenLogsRef = useRef('');

  useEffect(() => {
    if (xtermRef.current && isXtermVisible) {
      const trimmedLogs = logs.replace(/\r?\n$/, '');

      if (!trimmedLogs.startsWith(lastWrittenLogsRef.current)) {
        xtermRef.current.reset();
        xtermRef.current.write(trimmedLogs);
        lastWrittenLogsRef.current = trimmedLogs;
      } else if (trimmedLogs.length > lastWrittenLogsRef.current.length) {
        const newData = trimmedLogs.substring(lastWrittenLogsRef.current.length);
        xtermRef.current.write(newData);
        lastWrittenLogsRef.current = trimmedLogs;
      }

      const logicalLines = logs.split(/\n/);
      const terminalCols = xtermRef.current.cols || 80;
      let count = 0;
      logicalLines.forEach((line) => {
        const cleanLine = stripAnsi(line);
        count += Math.max(1, Math.ceil(cleanLine.length / terminalCols));
      });

      if (physicalLineCount !== count) setPhysicalLineCount(count);

      const effectiveMaxRows = isExpanded ? rows : 15;
      const targetRows = Math.max(1, Math.min(effectiveMaxRows, count));

      if (xtermRef.current.rows !== targetRows) {
        xtermRef.current.resize(terminalCols, targetRows);
        if (fitAddonRef.current) fitAddonRef.current.fit();
      }

      xtermRef.current.options.cursorBlink = status === 'busy';
      xtermRef.current.options.theme = {
        ...xtermRef.current.options.theme,
        cursor: status === 'busy' ? getCSSVar('--terminal-foreground', '#cccccc') : 'transparent',
      };
    }
  }, [logs, status, isXtermVisible, rows]);

  const getCleanLogs = () => stripAnsi(logs || '');
  const getCommand = () => initialCommand || '';

  return (
    <>
      <div
        className={cn(
          'flex flex-col bg-background rounded-md overflow-hidden font-mono border border-border',
          rejectedOutline && 'outline outline-1 outline-error/60',
        )}
      >
        {/* ── COMMAND HEADER ── Copy button hidden by default, shown on hover via CSS */}
        {isXtermVisible && (
          <div
            className={`terminal-cmd-area flex items-center gap-2 px-2.5 py-1.5 bg-background border-b border-border z-[5] sticky top-0 select-none transition-colors duration-200 ${canExpand ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={toggleExpand}
            onMouseEnter={(e) => {
              if (canExpand)
                e.currentTarget.style.backgroundColor =
                  $('--sidebar-item-hover') || $('--background') || '';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = $('--background') || '#1e1e1e';
            }}
          >
            {/* Command text — same style as output */}
            <div className="font-mono text-xs text-text-primary leading-[1.5] whitespace-pre-wrap break-all flex-1 min-w-0">
              {initialCommand ? formatCommand(initialCommand) : 'Terminal'}
            </div>

            {/* Right actions: copy + chevron */}
            <div
              className="flex items-center gap-1 ml-auto shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* CSS class on parent (.terminal-cmd-area) controls opacity */}
              <CopyButton getText={getCommand} title="Copy command" />
              {canExpand && (
                <div
                  className={`codicon codicon-chevron-${isExpanded ? 'up' : 'down'} text-xs opacity-70 cursor-pointer text-text-primary`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand();
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* ── OUTPUT AREA ── Copy button hidden by default, shown on hover via CSS */}
        <div className="terminal-output-area relative">
          {isXtermVisible && logs && (
            <div className="terminal-output-copy-btn absolute top-1.5 right-2 z-10">
              <CopyButton getText={getCleanLogs} title="Copy output" />
            </div>
          )}

          <div
            className="terminal-content-wrapper px-3 py-2 bg-background overflow-y-auto select-none"
            style={{
              maxHeight: `${maxHeight}px`,
              pointerEvents: 'auto',
            }}
          >
            {!isXtermVisible ? (
              <div className="flex flex-wrap gap-2 items-center py-2 px-1 text-[13px] leading-[1.5] text-text-primary">
                <div className="font-mono text-xs text-text-primary leading-[1.5] whitespace-pre-wrap break-all">
                  {initialCommand ? formatCommand(initialCommand) : 'No command executed yet.'}
                </div>
              </div>
            ) : (
              <div
                ref={terminalRef}
                className="w-full h-full"
                onPaste={(e) => e.preventDefault()}
              />
            )}
          </div>
        </div>

        {onInput && <TerminalInputBar onInput={onInput} />}
      </div>

      <style>{`
        /* ── Copy button visibility ──────────────────────────────────────────────── */
        .terminal-cmd-area .terminal-copy-btn,
        .terminal-output-copy-btn {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s;
        }

        .terminal-cmd-area:hover .terminal-copy-btn {
          opacity: 1;
          pointer-events: auto;
        }

        .terminal-output-area:hover .terminal-output-copy-btn {
          opacity: 1;
          pointer-events: auto;
        }

        .terminal-copy-btn:hover {
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        /* Scrollbar */
        .terminal-content-wrapper {
          scrollbar-width: thin;
          scrollbar-color: rgba(128,128,128,0.4) rgba(121, 121, 121, 0.4)) transparent;
        }

        .terminal-content-wrapper:hover {
          scrollbar-color: rgba(128,128,128,0.6) rgba(100, 100, 100, 0.7)) transparent;
        }

        .terminal-content-wrapper::-webkit-scrollbar {
          width: 6px;
        }
        .terminal-content-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }
        .terminal-content-wrapper::-webkit-scrollbar-thumb {
          background: rgba(128,128,128,0.4) rgba(121, 121, 121, 0.4));
          border-radius: 3px;
        }
        .terminal-content-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(128,128,128,0.6) rgba(100, 100, 100, 0.7));
        }

        /* xterm overrides */
        .xterm .xterm-viewport {
          background-color: transparent !important;
        }
        .xterm .xterm-screen {
          padding: 4px;
        }
      `}</style>
    </>
  );
};

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
