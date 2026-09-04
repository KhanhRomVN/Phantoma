import React from 'react';
import { cn } from '@renderer/shared/utils/cn';

// ── Constants ──
import { getToolLabel } from '../../../../../constants/constants';

// Services
import { extensionService } from '@renderer/components/RightPanel/Agent/services/ExtensionService';

// ── Types ──
import { BaseRendererProps, Diagnostic } from '../../../../../types/renderer-types';

// ── Utils ──
import { getNextUserMessage } from '../../../../../utils/renderer-utils';

import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';

// ── Components ──
import { TagHeader } from '../../TagHeader';
import ErrorBlock from '../../blocks/other/ErrorBlock';

export const ReadFileRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
  allMessages,
}) => {
  const [, setIsCollapsed] = React.useState(true);
  const [, setCachedDiagnostics] = React.useState<Diagnostic[] | null>(null);

  const actionId = `${messageId}-action-${actionIndex}`;
  const rawPath = action.params.file_path || action.params.path || action.params.symbol || '';
  const displayName = rawPath ? rawPath.split('/').pop() || rawPath : '';
  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);

  const isPartial = false;
  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? toolOutputs?.[actionId]?.output || '' : '';

  const outputContent = toolOutputs?.[actionId]?.output || '';
  const hasOutput = outputContent && outputContent.trim().length > 0;

  const isCompleted = Boolean(
    !isPartial && (!!isActionClicked || isError || hasOutput || !!nextUserMessage),
  );

  // Calculate line range
  let lineRangeText: string | null = null;
  const startLine = action.params.start_line || action.params.startLine;
  const endLine = action.params.end_line || action.params.endLine;

  if (startLine !== undefined && endLine !== undefined && startLine > 0 && endLine > 0) {
    lineRangeText = `${startLine}-${endLine}`;
  } else if (startLine !== undefined && startLine > 0) {
    lineRangeText = `${startLine}+`;
  } else if (endLine !== undefined && endLine > 0) {
    lineRangeText = `1-${endLine}`;
  } else if (isCompleted && outputContent) {
    const outputLineCount = outputContent.split('\n').length;
    lineRangeText = `0-${outputLineCount}`;
  }

  // Get diagnostics from toolOutputs
  const mergedDiagnostics = React.useMemo(() => {
    const shouldGetDiagnostics = isCompleted && !isPartial;

    if (!shouldGetDiagnostics) return undefined;

    const toolOutputDiagnostics = toolOutputs?.[actionId]?.diagnostics;

    if (!toolOutputDiagnostics) {
      return undefined;
    }

    // Normalize severity
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

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span
              className="font-semibold opacity-80 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  extensionService.postMessage({
                    command: 'openFile',
                    path: rawPath,
                  });
                }
              }}
            >
              {getToolLabel('read_file')}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  extensionService.postMessage({
                    command: 'openFile',
                    path: rawPath,
                  });
                }
              }}
              className="flex items-center"
            >
              <img
                src={getFileIconPath(rawPath)}
                alt=""
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
            </span>
            <span
              className="font-medium opacity-90 font-mono text-[11px] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  extensionService.postMessage({
                    command: 'openFile',
                    path: rawPath,
                  });
                }
              }}
            >
              {displayName}
            </span>
            {lineRangeText && (
              <span className="opacity-50 text-[10px] ml-1.5 font-mono text-text-secondary">
                {lineRangeText}
              </span>
            )}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="read_file"
        tooltipMeta={{
          lineRange: lineRangeText || undefined,
        }}
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

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}
    </div>
  );
};
