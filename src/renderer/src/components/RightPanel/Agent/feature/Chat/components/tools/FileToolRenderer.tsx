import React from 'react';
import { cn } from '@renderer/shared/lib/utils';
import { ToolHeader } from './ToolHeader';
import { getFilename, getToolColor } from '../../utils/toolUtils';
import { getDisplayPath, collectConvFilePaths } from '../../utils/pathUtils';
import { Message } from '../../types/message';
import ExecuteButton from './ExecuteButton';
import { useSettings } from '../../../../context/SettingsContext';
import { parseDiff } from '@renderer/components/RightPanel/Agent/utils/diffUtils';
import {
  extensionService,
  messageDispatcher,
} from '@renderer/components/RightPanel/Agent/services/ExtensionService';
import FileIcon from '@renderer/components/common/FileIcon';
import { $ } from '@renderer/utils/color';
import { ToolAction } from '../../services/ResponseParser';
import { getPermissionDecision } from '../../utils/permissionUtils';
import ErrorBlock from '../blocks/ErrorBlock';
import { RichtextBlock } from '../blocks/RichtextBlock';
import FileStreamingBlock from '../blocks/FileStreamingBlock';
import GrepBlock from '../blocks/GrepBlock';

interface FileToolRendererProps {
  action: ToolAction;
  actionIndex: number;
  messageId: string;
  isActionClicked: boolean;
  isActiveGroup?: boolean;
  isLastMessage?: boolean;
  isLastItemInList?: boolean;
  toolOutputs?: Record<string, { output: string; isError: boolean }>;
  allMessages?: Message[];
  fileStatsMap: Record<string, { lines: number; loading: boolean }>;
  onToolClick: (
    action: ToolAction,
    messageId: string,
    index: number,
    type: 'accept_all' | 'accept_once' | 'reject',
  ) => void;
  mergedItems?: { action: ToolAction; index: number }[];
  conversationId?: string;
  singleLineReviewActions?: Record<string, { action: any; actionId: string; messageId: string }>;
  onConfirmSingleLineAction?: (actionId: string) => void;
  onRejectSingleLineAction?: (actionId: string) => void;
}

const FileToolRenderer: React.FC<FileToolRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastMessage,
  isLastItemInList,
  toolOutputs,
  allMessages,
  fileStatsMap,
  onToolClick,
  mergedItems,
  conversationId,
  singleLineReviewActions,
  onConfirmSingleLineAction,
  onRejectSingleLineAction,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [isGrepCollapsed, setIsGrepCollapsed] = React.useState(true);
  const [isSnapshotLoading, setIsSnapshotLoading] = React.useState(false);
  const [showRawView, setShowRawView] = React.useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = React.useState(false);
  const { permissionMode } = useSettings();
  const toolType = action.type;
  const toolColor = getToolColor(toolType);
  const actionId = `${messageId}-action-${actionIndex}`;

  const rawPath =
    action.params.file_path ||
    action.params.symbol ||
    action.params.folder_path ||
    action.params.path ||
    getFilename(action);
  const allPaths = React.useMemo(() => collectConvFilePaths(allMessages || []), [allMessages]);
  const displayName = rawPath ? rawPath.split('/').pop() || rawPath : '';

  const isCreateNew = toolType === 'write_to_file' && !fileStatsMap[rawPath];
  const isSnapshotTool =
    (toolType === 'write_to_file' || toolType === 'replace_in_file') && !isCreateNew;

  const openSnapshotInEditor = React.useCallback(() => {
    if (!conversationId || !actionId || isSnapshotLoading) return;
    setIsSnapshotLoading(true);
    const requestId = `snapshot-${Date.now()}-${Math.random()}`;
    extensionService.postMessage({
      command: 'getSnapshot',
      conversationId,
      actionId,
      requestId,
    });
    messageDispatcher.register(
      requestId,
      (msg: {
        error: any;
        filePath: any;
        operation: any;
        beforeContent: any;
        afterContent: any;
      }) => {
        setIsSnapshotLoading(false);
        if (!msg.error) {
          extensionService.postMessage({
            command: 'openSnapshotDiff',
            filePath: msg.filePath,
            operation: msg.operation,
            beforeContent: msg.beforeContent,
            afterContent: msg.afterContent,
            actionId,
          });
        } else {
          if (rawPath)
            extensionService.postMessage({
              command: 'openFile',
              path: rawPath,
            });
        }
      },
      10000,
      () => {
        setIsSnapshotLoading(false);
        if (rawPath) extensionService.postMessage({ command: 'openFile', path: rawPath });
      },
    );
  }, [conversationId, actionId, isSnapshotLoading, rawPath]);

  let codeContent = '';
  if (toolType === 'list_files') {
    codeContent = toolOutputs?.[actionId]?.output || '';
  }

  let diffStats: { added: number; removed: number } | null = null;
  if (action.type === 'replace_in_file' && action.params.diff) {
    diffStats = parseDiff(action.params.diff).stats;
  }

  let linesCount =
    action.type === 'write_to_file' ? action.params.content?.split('\n').length || 0 : 0;

  if (mergedItems && mergedItems.length > 1) {
    let totalAdded = 0,
      totalRemoved = 0,
      totalLines = 0;
    mergedItems.forEach(({ action: a }) => {
      if (a.type === 'replace_in_file' && a.params.diff) {
        const s = parseDiff(a.params.diff).stats;
        totalAdded += s.added;
        totalRemoved += s.removed;
      } else if (a.type === 'write_to_file') {
        totalLines += a.params.content?.split('\n').length || 0;
      }
    });
    if (totalAdded > 0 || totalRemoved > 0)
      diffStats = { added: totalAdded, removed: totalRemoved };
    if (totalLines > 0) linesCount = totalLines;
  }

  const isPartial = action.isPartial;
  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? toolOutputs?.[actionId]?.output || '' : '';

  const thinkingContent = React.useMemo(() => {
    if (!isPartial) return null;
    const currentMsg = allMessages?.find((m) => m.id === messageId);
    if (!currentMsg?.content) return null;
    const unclosedMatch = /<thinking>([\s\S]*)$/i.exec(currentMsg.content);
    if (unclosedMatch) return unclosedMatch[1];
    return null;
  }, [isPartial, allMessages, messageId]);

  const debugLoggedRef = React.useRef(false);
  React.useEffect(() => {
    if (!debugLoggedRef.current) {
      debugLoggedRef.current = true;
    }
  }, [toolOutputs, actionId]);

  const diagnosticCount = React.useMemo(() => {
    if (toolType !== 'read_file') return 0;
    const output = toolOutputs?.[actionId]?.output || '';
    const diagIdx = output.indexOf('⚠️ **Diagnostics Found:**');
    if (diagIdx === -1) return 0;
    const diagSection = output.slice(diagIdx + '⚠️ **Diagnostics Found:**'.length).trim();
    if (!diagSection) return 0;
    return diagSection.split('\n').filter((l) => l.trim().length > 0).length;
  }, [toolType, toolOutputs, actionId]);

  const nextUserMessage = allMessages
    ? allMessages
        .slice(allMessages.findIndex((m) => m.id === messageId) + 1)
        .find((m) => m.role === 'user')
    : undefined;

  const isWriteOrEditTool =
    toolType === 'write_to_file' ||
    toolType === 'replace_in_file' ||
    toolType === 'delete_file' ||
    toolType === 'delete_folder' ||
    toolType === 'move_file';
  const isGrepTool = toolType === 'grep';
  const isCompleted: boolean = Boolean(
    !isPartial &&
    (!!isActionClicked ||
      isError ||
      (isWriteOrEditTool
        ? !!toolOutputs?.[actionId] || !!nextUserMessage
        : (codeContent && codeContent.trim().length > 0) || !!nextUserMessage)),
  );

  const isWriteOrEditOnly = toolType === 'write_to_file' || toolType === 'replace_in_file';
  const shouldHideContent =
    isWriteOrEditOnly && isCompleted && isActionClicked && !isPartial && !isError;

  const prefix =
    toolType === 'replace_in_file'
      ? 'Update'
      : toolType === 'write_to_file'
        ? fileStatsMap[rawPath]
          ? 'Rewrite'
          : 'Create'
        : toolType === 'list_files'
          ? 'List'
          : toolType === 'grep'
            ? 'GREP'
            : toolType === 'delete_file'
              ? 'Delete'
              : toolType === 'delete_folder'
                ? 'Delete'
                : toolType === 'move_file'
                  ? 'MOVE'
                  : 'Read';

  const grepCompleted =
    isGrepTool &&
    !isPartial &&
    (isActionClicked || isError || !!toolOutputs?.[actionId] || !!nextUserMessage);
  const grepErrorMsg = isGrepTool && isError ? toolOutputs?.[actionId]?.output || '' : '';
  const grepHasResults =
    isGrepTool && toolOutputs?.[actionId]?.output
      ? toolOutputs[actionId].output.includes('<grep_results')
      : false;

  return (
    <div className="flex flex-col gap-1.5 pb-1 mb-0.5">
      <ToolHeader
        title={
          isGrepTool ? (
            <div
              className={cn(
                'flex items-center gap-2 text-xs w-full',
                isCompleted ? 'cursor-pointer' : 'cursor-default',
                'text-text-primary',
              )}
              onMouseEnter={() => setIsHeaderHovered(true)}
              onMouseLeave={() => setIsHeaderHovered(false)}
              onClick={isCompleted ? () => setIsGrepCollapsed((v) => !v) : undefined}
            >
              <span className="font-semibold opacity-80">GREP</span>
              <span
                className="text-[11px] font-semibold px-1 py-0 rounded"
                style={{
                  backgroundColor: `color-mix(in srgb, ${$('--primary')} 12%, transparent)`,
                  color: $('--primary'),
                }}
              >
                {action.params.search_term || action.params.searchTerm || ''}
              </span>
              {(() => {
                const folderPath = action.params.folder_path || action.params.folderPath || '';
                const filePath = action.params.file_path || action.params.filePath || '';
                const targetPath = folderPath || filePath || '';
                const isFolder = !!folderPath;
                if (!targetPath) return null;
                const segments = targetPath.split('/').filter(Boolean);
                if (segments.length === 0) return null;
                return (
                  <>
                    <span className="opacity-40 text-[11px]">in</span>
                    <FileIcon path={targetPath} isFolder={isFolder} className="w-3.5 h-3.5" />
                    <span className="font-medium opacity-80 text-[11px]">
                      {getDisplayPath(targetPath, allPaths) || '...'}
                    </span>
                  </>
                );
              })()}
              {isPartial && !isCompleted && (
                <span className="text-[10px] opacity-55 flex items-center gap-1">
                  <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
                  Searching...
                </span>
              )}
              {isCompleted &&
                (() => {
                  const output = toolOutputs?.[actionId]?.output || '';
                  let totalMatches = 0;
                  let fileCount = 0;
                  try {
                    const match = output.match(/total_matches="(\d+)"/);
                    if (match) totalMatches = parseInt(match[1], 10);
                    const fileMatch = output.match(/files="(\d+)"/);
                    if (fileMatch) fileCount = parseInt(fileMatch[1], 10);
                  } catch {}
                  if (totalMatches === 0 && fileCount === 0) {
                    return (
                      <span className="opacity-50 text-[10px] italic text-text-secondary">
                        no matches
                      </span>
                    );
                  }
                  return (
                    <span className="opacity-50 text-[10px] text-text-secondary">
                      {totalMatches} {totalMatches === 1 ? 'match' : 'matches'} in {fileCount}{' '}
                      {fileCount === 1 ? 'file' : 'files'}
                    </span>
                  );
                })()}
              {isCompleted && (
                <span
                  className={`codicon codicon-chevron-${isGrepCollapsed ? 'right' : 'down'} text-[10px] opacity-50 ml-0.5`}
                />
              )}
              {isHeaderHovered && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRawView(!showRawView);
                  }}
                  className="ml-2 text-[10px] opacity-60 cursor-pointer transition-all duration-150 font-medium underline underline-offset-2"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.6';
                  }}
                >
                  {showRawView ? 'Hide raw' : 'View raw'}
                </span>
              )}
            </div>
          ) : (
            <div
              className="flex items-center gap-2 text-xs w-full relative text-text-primary"
              onMouseEnter={() => setIsHeaderHovered(true)}
              onMouseLeave={() => setIsHeaderHovered(false)}
            >
              <span className="font-semibold opacity-80 cursor-pointer transition-[text-decoration] duration-150 hover:underline">
                {prefix}
              </span>
              <FileIcon
                path={rawPath}
                isFolder={toolType === 'list_files' || !!action.params.folder_path}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="font-medium opacity-90 text-[11px] cursor-pointer transition-[text-decoration] duration-150 hover:underline">
                {displayName}
                {toolType === 'read_file' &&
                  (() => {
                    const sl = action.params.start_line;
                    const el = action.params.end_line;
                    const totalLines = fileStatsMap[rawPath]?.lines;
                    if (sl !== undefined && sl !== null && sl !== '') {
                      const start = parseInt(String(sl), 10) + 1;
                      const end =
                        el !== undefined && el !== null && el !== ''
                          ? parseInt(String(el), 10) + 1
                          : totalLines;
                      return (
                        <span className="opacity-55 text-[10px] ml-0.5">
                          ({start}-{end ?? '?'})
                        </span>
                      );
                    }
                    if (totalLines) {
                      return (
                        <span className="opacity-55 text-[10px] ml-0.5">(1-{totalLines})</span>
                      );
                    }
                    return null;
                  })()}
                {toolType === 'read_file' && diagnosticCount > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 ml-1 px-1 py-0 rounded text-[10px] font-semibold leading-4"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${$('--error') || '#f14c4c'} 15%, transparent)`,
                      color: $('--error') || '#f14c4c',
                    }}
                  >
                    <span className="codicon codicon-error text-[9px]" />
                    {diagnosticCount}
                  </span>
                )}
              </span>
              {isPartial && (
                <span className="text-[10px] opacity-60 italic ml-1 flex items-center gap-1">
                  <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
                </span>
              )}
              {isSnapshotLoading && !isPartial && (
                <span className="text-[10px] opacity-50 ml-1 flex items-center gap-0.5">
                  <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
                </span>
              )}
              {diffStats && (
                <span className="flex gap-1 opacity-70 text-[11px] ml-1 font-medium">
                  <span className="text-success">+{diffStats.added}</span>
                  <span className="text-error">-{diffStats.removed}</span>
                </span>
              )}
              {linesCount > 0 && (
                <span className="opacity-70 text-[11px] ml-1 font-medium">+{linesCount} lines</span>
              )}
              {isHeaderHovered && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRawView(!showRawView);
                  }}
                  className="ml-2 text-[10px] opacity-60 cursor-pointer transition-all duration-150 font-medium underline underline-offset-2"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.6';
                  }}
                >
                  {showRawView ? 'Hide raw' : 'View raw'}
                </span>
              )}
            </div>
          )
        }
        statusColor={
          isError
            ? $('--error')
            : (isCompleted as boolean)
              ? $('--success')
              : !!isActiveGroup
                ? $('--text-secondary')
                : $('--text-secondary')
        }
        diffStats={undefined}
        isPartial={isPartial}
        onClick={() => {
          if (toolType === 'replace_in_file') {
            if (isCompleted && !isPartial) {
              openSnapshotInEditor();
            } else {
              setIsCollapsed((v) => !v);
              if (rawPath) {
                extensionService.postMessage({
                  command: 'openFile',
                  path: rawPath,
                });
              }
            }
            return;
          }

          if (isSnapshotTool && isCompleted && !isPartial) {
            openSnapshotInEditor();
          } else {
            setIsCollapsed((v) => !v);
            if (rawPath && toolType !== 'list_files') {
              extensionService.postMessage({
                command: 'openFile',
                path: rawPath,
              });
            }
          }
        }}
        path={rawPath}
        onPathClick={(clickedPath) => {
          extensionService.postMessage({
            command: 'openFile',
            path: clickedPath,
          });
        }}
      />

      {!isGrepTool && showRawView && (
        <div
          className="mt-1 ml-[29px] p-2 border border-border font-mono text-[11px] leading-relaxed text-text-primary whitespace-pre-wrap break-all overflow-x-auto"
          style={{
            backgroundColor: $('--background'),
          }}
        >
          {action.rawXml || JSON.stringify(action, null, 2)}
        </div>
      )}

      {!shouldHideContent &&
        toolType === 'write_to_file' &&
        singleLineReviewActions?.[actionId] &&
        (() => {
          const reviewContent = action.params.content || '';
          return (
            <div className="mt-2 flex flex-col gap-1.5">
              <textarea
                readOnly
                value={reviewContent}
                className="w-full min-h-[200px] max-h-[400px] p-2 text-[11px] leading-relaxed resize-y outline-none whitespace-pre-wrap break-all"
                style={{
                  color: $('--text-primary'),
                  backgroundColor: $('--background'),
                  border: '1.5px dashed #e5a100',
                  borderRadius: '4px',
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#e5a100] font-medium flex items-center gap-1">
                  <span className="codicon codicon-warning text-[11px]" />
                  Nội dung file bị dồn vào 1 dòng ({reviewContent.length} ký tự)
                </span>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRejectSingleLineAction?.(actionId);
                    }}
                    className="px-3 py-1 text-[11px] font-semibold rounded flex items-center gap-1 cursor-pointer"
                    style={{
                      border: `1px solid color-mix(in srgb, ${$('--error')} 40%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${$('--error')} 10%, transparent)`,
                      color: $('--error'),
                    }}
                  >
                    <span className="codicon codicon-close text-[11px]" />
                    Từ chối
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmSingleLineAction?.(actionId);
                    }}
                    className="px-3 py-1 text-[11px] font-semibold rounded flex items-center gap-1 cursor-pointer"
                    style={{
                      border: `1px solid color-mix(in srgb, ${$('--success')} 40%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${$('--success')} 10%, transparent)`,
                      color: $('--success'),
                    }}
                  >
                    <span className="codicon codicon-check text-[11px]" />
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {!shouldHideContent &&
        !isCompleted &&
        !isPartial &&
        (isActiveGroup || !isLastMessage) &&
        getPermissionDecision(permissionMode, toolType) === 'prompt' && (
          <div className="mt-2 mb-2 order-1">
            <ExecuteButton
              isActive={!!isActiveGroup}
              isCompleted={!!isCompleted}
              isLastMessage={!!isLastMessage}
              isLoading={false}
              toolColor={toolColor}
              title="Approve action"
              labelText="Approve"
              onExecute={(_e, type) => {
                onToolClick(action, messageId, actionIndex, type);
              }}
            />
          </div>
        )}

      {!shouldHideContent &&
        isError &&
        errorMessage &&
        (toolType === 'replace_in_file' ? (
          <div className="mt-1">
            <ErrorBlock
              content={errorMessage}
              errorCode="REPLACE_IN_FILE"
              isPartial={isPartial}
              isLast={isLastItemInList}
              isLastMessage={isLastMessage}
              showHeader={false}
              contentPaddingLeft="29px"
            />
          </div>
        ) : (
          <div
            className="flex items-start gap-1.5 px-2 py-1 rounded mt-0.5"
            style={{
              backgroundColor: `color-mix(in srgb, ${$('--error')} 4%, transparent)`,
              border: `1px solid color-mix(in srgb, ${$('--error')} 20%, transparent)`,
            }}
          >
            <span
              className="codicon codicon-error text-[11px] opacity-70 mt-0.5 flex-shrink-0"
              style={{ color: $('--error') }}
            />
            <span
              className="text-[11px] opacity-85 break-word"
              style={{
                color: $('--error'),
              }}
            >
              {errorMessage}
            </span>
          </div>
        ))}

      {!shouldHideContent && toolType === 'list_files' && codeContent && (
        <>
          {!isCollapsed && (
            <RichtextBlock
              content={codeContent}
              showHeader={false}
              maxHeight={300}
              defaultCollapsed={false}
              isFilePathList={true}
              basePath={action.params.path || action.params.folder_path || ''}
              onFileClick={(fullPath) =>
                extensionService.postMessage({
                  command: 'openFile',
                  path: fullPath,
                })
              }
            />
          )}
        </>
      )}

      {!shouldHideContent &&
        (isPartial ||
          ((toolType === 'write_to_file' || toolType === 'replace_in_file') &&
            !isCompleted &&
            isActiveGroup)) &&
        (() => {
          const streamContent =
            toolType === 'write_to_file' ? action.params.content || '' : action.params.diff || '';
          if (!streamContent) return null;

          return <FileStreamingBlock content={streamContent} maxHeight={200} />;
        })()}

      {isGrepTool && (
        <>
          <GrepBlock
            action={action}
            actionId={actionId}
            toolOutputs={toolOutputs}
            isPartial={!!isPartial}
            isCompleted={grepCompleted}
            isError={isError}
            errorMessage={grepErrorMsg}
            conversationId={conversationId}
            allMessages={allMessages}
            isCollapsed={isGrepCollapsed}
            onToggleCollapse={() => setIsGrepCollapsed((v) => !v)}
          />
          {showRawView && (
            <div
              className="mt-1 ml-[29px] p-2 border border-border font-mono text-[11px] leading-relaxed text-text-primary whitespace-pre-wrap break-all overflow-x-auto"
              style={{
                backgroundColor: $('--background'),
              }}
            >
              {action.rawXml || JSON.stringify(action, null, 2)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FileToolRenderer;
