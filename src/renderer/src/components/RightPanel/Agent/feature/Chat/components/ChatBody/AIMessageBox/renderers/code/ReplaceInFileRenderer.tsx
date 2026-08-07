import React from 'react';
import { cn } from '@renderer/shared/utils/cn';

// Hooks
import { useSettings } from '../../../../../../../context/SettingsContext';

// Services
import { extensionService } from '@renderer/components/RightPanel/Agent/services/ExtensionService';

// Constants
import { getToolLabel } from '../../../../../constants/constants';

// Types
import { MergedRendererProps, Diagnostic } from '../../../../../types/renderer-types';

// UtilsS
import { collectConvFilePaths, getNextUserMessage } from '../../../../../utils/renderer-utils';
import { getPermissionDecision } from '../../../../../utils/permissionUtils';
import { parseDiff, DiffHighlight } from '@renderer/components/RightPanel/Agent/utils/diffUtils';

// ICONS
import FileIcon from '@renderer/components/common/FileIcon';

// Components
import { TagHeader } from '../../TagHeader';
import ActionBar from '../../ActionBar';
import ErrorBlock from '../../blocks/other/ErrorBlock';
import { CodeBlock } from '@renderer/components/common/CodeBlock';

// Helper: map file extension to language for CodeBlock header
const getLanguageFromPath = (filePath: string): string | undefined => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (!ext) return undefined;
  const extToLang: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    yaml: 'yaml',
    yml: 'yml',
    xml: 'xml',
    md: 'markdown',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    ps1: 'powershell',
    dockerfile: 'dockerfile',
  };
  return extToLang[ext];
};

export const ReplaceInFileRenderer: React.FC<MergedRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastMessage,
  isLastItemInList,
  toolOutputs,
  allMessages,
  onToolClick,
  mergedItems,
  conversationId,
  rejectedActions,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [cachedDiagnostics, setCachedDiagnostics] = React.useState<Diagnostic[] | null>(null);
  const { permissionMode } = useSettings();

  const actionId = `${messageId}-action-${actionIndex}`;
  const rawPath = action.params.file_path || action.params.path || '';
  const displayName = rawPath ? rawPath.split('/').pop() || rawPath : '';

  const allPaths = React.useMemo(() => collectConvFilePaths(allMessages || []), [allMessages]);

  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);

  const isPartial = false;
  const isError = !!toolOutputs?.[actionId]?.isError;

  const errorMessage = isError ? toolOutputs?.[actionId]?.output || '' : '';

  // Calculate diff stats
  let diffStats: { added: number; removed: number } | null = null;

  if (action.params.diff) {
    const stats = parseDiff(action.params.diff).stats;
    diffStats = { added: stats.added, removed: stats.removed };
  } else {
    const oldContent = action.params.old_content || action.params.old_str;
    const newContent = action.params.new_content || action.params.new_str;

    if (oldContent !== undefined && newContent !== undefined) {
      const oldLines = String(oldContent).split('\n');
      const newLines = String(newContent).split('\n');

      diffStats = {
        added: newLines.length,
        removed: oldLines.length,
      };
    }
  }

  // Handle merged items
  if (mergedItems && mergedItems.length > 1) {
    let totalAdded = 0,
      totalRemoved = 0;
    mergedItems.forEach(({ action: a }) => {
      if (a.type === 'replace_in_file' && a.params.diff) {
        const s = parseDiff(a.params.diff).stats;
        totalAdded += s.added;
        totalRemoved += s.removed;
      }
    });
    if (totalAdded > 0 || totalRemoved > 0) {
      diffStats = { added: totalAdded, removed: totalRemoved };
    }
  }

  const isCompleted = Boolean(
    !isPartial && (!!isActionClicked || isError || !!toolOutputs?.[actionId] || !!nextUserMessage),
  );

  // Get diagnostics from toolOutputs
  const mergedDiagnostics = React.useMemo(() => {
    const shouldGetDiagnostics = isCompleted && !isPartial;

    if (!shouldGetDiagnostics) return undefined;

    const toolOutputDiagnostics = toolOutputs?.[actionId]?.diagnostics;

    if (!toolOutputDiagnostics) {
      return undefined;
    }

    const normalized = toolOutputDiagnostics.map((d) => {
      const normalizedSeverity =
        d.severity.toLowerCase() === 'error'
          ? 'Error'
          : d.severity.toLowerCase() === 'warning'
            ? 'Warning'
            : d.severity;

      return {
        ...d,
        severity: normalizedSeverity,
      };
    });

    return normalized;
  }, [toolOutputs, actionId, isCompleted, isPartial]);

  // Fetch diagnostics from extension
  React.useEffect(() => {
    const shouldFetchDiagnostics = rawPath && isCompleted && !isPartial;

    if (!shouldFetchDiagnostics) return;

    const baseRequestId = `diagnostics-${actionId}`;
    let retryCount = 0;
    const maxRetries = 2;
    const retryDelay = 300;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.command === 'getDiagnosticsResult' && msg.requestId?.startsWith(baseRequestId)) {
        if (msg.diagnostics && Array.isArray(msg.diagnostics)) {
          if (msg.diagnostics.length > 0) {
            setCachedDiagnostics(msg.diagnostics);
            window.removeEventListener('message', handleMessage);
            if (timeoutId !== null) clearTimeout(timeoutId);
          } else {
            if (retryCount < maxRetries) {
              retryCount++;
              timeoutId = setTimeout(() => {
                extensionService.postMessage({
                  command: 'getDiagnostics',
                  path: rawPath,
                  requestId: `${baseRequestId}-retry-${retryCount}`,
                });
              }, retryDelay * retryCount);
            } else {
              setCachedDiagnostics([]);
              window.removeEventListener('message', handleMessage);
            }
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    timeoutId = setTimeout(() => {
      extensionService.postMessage({
        command: 'getDiagnostics',
        path: rawPath,
        requestId: baseRequestId,
      });
    }, 200);

    return () => {
      window.removeEventListener('message', handleMessage);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [rawPath, isCompleted, isPartial, actionId]);

  const shouldHideContent = false;

  // Check if action has validation error
  const hasValidationError = !!action.isError;

  // Check if action has been rejected (to hide error UI after rejection)
  const isRejected = rejectedActions?.has(actionId);

  // Debug logs
  const permissionDecision = getPermissionDecision(permissionMode, 'replace_in_file');

  // Fetch full file content for approval mode
  const [fullFileContent, setFullFileContent] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (permissionDecision !== 'confirm' || !rawPath) {
      return;
    }

    const requestId = `file-content-${actionId}`;
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.command === 'getFileContentResult' && msg.requestId === requestId) {
        setFullFileContent(msg.content || null);
      }
    };

    window.addEventListener('message', handleMessage);

    extensionService.postMessage({
      command: 'getFileContent',
      path: rawPath,
      requestId,
    });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [permissionDecision, rawPath, actionId]);

  // Build diff preview data for approval mode
  const approvalDiffData = React.useMemo(() => {
    if (permissionDecision !== 'confirm') return null;

    const oldContent = action.params.old_content || action.params.old_str;
    const newContent = action.params.new_content || action.params.new_str;

    if (!oldContent || !newContent) return null;

    if (fullFileContent) {
      const fileLines = fullFileContent.split('\n');
      const oldLines = String(oldContent).trim().split('\n');
      const newLines = String(newContent).trim().split('\n');

      let startLineIndex = -1;

      for (let i = 0; i <= fileLines.length - oldLines.length; i++) {
        let matches = true;
        for (let j = 0; j < oldLines.length; j++) {
          if (fileLines[i + j].trim() !== oldLines[j].trim()) {
            matches = false;
            break;
          }
        }
        if (matches) {
          startLineIndex = i;
          break;
        }
      }

      if (startLineIndex !== -1) {
        const beforeLines = fileLines.slice(0, startLineIndex);
        const afterLines = fileLines.slice(startLineIndex + oldLines.length);

        const mergedLines = [...beforeLines, ...oldLines, ...newLines, ...afterLines];
        const mergedContent = mergedLines.join('\n');

        const lineHighlights: DiffHighlight[] = [];

        for (let i = 0; i < oldLines.length; i++) {
          lineHighlights.push({
            type: 'removed',
            startLine: beforeLines.length + i + 1,
            endLine: beforeLines.length + i + 1,
          });
        }

        for (let i = 0; i < newLines.length; i++) {
          lineHighlights.push({
            type: 'added',
            startLine: beforeLines.length + oldLines.length + i + 1,
            endLine: beforeLines.length + oldLines.length + i + 1,
          });
        }

        return {
          code: mergedContent,
          lineHighlights,
        };
      }
    }

    const diffText =
      action.params.diff ||
      `<<<<<<< SEARCH\n${oldContent}\n=======\n${newContent}\n>>>>>>> REPLACE`;
    const parsed = parseDiff(diffText);

    return {
      code: parsed.code,
      lineHighlights: parsed.lineHighlights,
    };
  }, [
    permissionDecision,
    fullFileContent,
    action.params.old_content,
    action.params.old_str,
    action.params.new_content,
    action.params.new_str,
    action.params.diff,
  ]);

  return (
    <div className={cn('flex flex-col gap-2 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span
              className="font-semibold opacity-80 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  const oldContent = action.params.old_content || action.params.old_str || '';
                  const newContent = action.params.new_content || action.params.new_str || '';
                  extensionService.postMessage({
                    command: 'openFileDiff',
                    filePath: rawPath,
                    oldContent,
                    newContent,
                  });
                }
              }}
            >
              {getToolLabel('replace_in_file')}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  const oldContent = action.params.old_content || action.params.old_str || '';
                  const newContent = action.params.new_content || action.params.new_str || '';
                  extensionService.postMessage({
                    command: 'openFileDiff',
                    filePath: rawPath,
                    oldContent,
                    newContent,
                  });
                }
              }}
              className="flex items-center"
            >
              <FileIcon
                path={rawPath}
                isFolder={false}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
            </span>
            <span
              className="font-medium opacity-90 font-mono text-[11px] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  const oldContent = action.params.old_content || action.params.old_str || '';
                  const newContent = action.params.new_content || action.params.new_str || '';
                  extensionService.postMessage({
                    command: 'openFileDiff',
                    filePath: rawPath,
                    oldContent,
                    newContent,
                  });
                }
              }}
            >
              {displayName || (isPartial && !rawPath ? '...' : '')}
            </span>
            {diffStats && (diffStats.added > 0 || diffStats.removed > 0) && (
              <span className="flex gap-1.5 items-center text-[11px] font-medium ml-1.5">
                <span className="text-success">+{diffStats.added}</span>
                <span className="text-error">-{diffStats.removed}</span>
              </span>
            )}
            {isPartial && (
              <span className="text-[10px] opacity-60 italic ml-1 flex items-center gap-1">
                <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
              </span>
            )}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="replace_in_file"
        diffStats={undefined}
        isPartial={isPartial}
        diagnostics={mergedDiagnostics}
        onClick={() => {
          setIsCollapsed((v) => !v);
          if (rawPath) {
            extensionService.postMessage({
              command: 'openFile',
              path: rawPath,
            });
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

      {/* Show diff in CodeBlock when approval mode — only when not completed */}
      {!isCompleted && approvalDiffData && (
        <CodeBlock
          code={approvalDiffData.code}
          language={getLanguageFromPath(rawPath)}
          highlightRanges={
            approvalDiffData.lineHighlights.length > 0
              ? approvalDiffData.lineHighlights.map((h) => ({
                  startLine: h.startLine,
                  endLine: h.endLine,
                  color: h.type === 'added' ? 'rgb(48, 209, 88)' : 'rgb(255, 45, 85)',
                  label: h.type === 'added' ? 'Added' : 'Removed',
                }))
              : undefined
          }
        />
      )}

      {/* Show error message when there's an error */}
      {!isPartial && (hasValidationError || isError) && !isRejected && (
        <ErrorBlock
          content={
            hasValidationError && action.errorMessage
              ? `Validation Error: ${action.errorMessage}`
              : isError && errorMessage
                ? errorMessage
                : 'Unknown error occurred'
          }
          compact={true}
          maxHeight="300px"
        />
      )}

      {!shouldHideContent &&
        !isCompleted &&
        !isPartial &&
        getPermissionDecision(permissionMode, 'replace_in_file') === 'confirm' && (
          <ActionBar
            action={action}
            messageId={messageId}
            actionIndex={actionIndex}
            hasError={hasValidationError || isError}
            isCompleted={isCompleted}
            onAction={(e, type) => {
              onToolClick(action, messageId, actionIndex, type);
            }}
          />
        )}
    </div>
  );
};
