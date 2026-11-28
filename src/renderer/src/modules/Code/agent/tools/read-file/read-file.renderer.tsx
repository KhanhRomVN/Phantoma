// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import React from 'react';

// ── Utils ──
import { cn } from '@renderer/utils/cn';

// ── Constants ──
import { getToolLabel } from '@renderer/modules/Code/shared/zen/zen-bridge';

// Services
import { electronWidgetBridge } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ── Types ──
import { BaseRendererProps } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ── Utils ──
import { getNextUserMessage } from '@renderer/modules/Code/shared/zen/zen-bridge';

import { getFileIconPath } from '@renderer/utils/file-icon';

// ── Components ──
import { TagHeader } from '@renderer/modules/Code/shared/zen/zen-bridge';
import { ErrorBlock } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ─── Component ───────────────────────────────────────────────────────────────
export const ReadFileRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
  allMessages,
  moduleId,
}) => {
  // ── Derived ──
  const [, setIsCollapsed] = React.useState(true);

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

  // ── Render ──
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
                  electronWidgetBridge.postMessage({
                    command: 'openFile',
                    path: rawPath,
                  });
                }
              }}
            >
              {getToolLabel('read_file', moduleId)}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  electronWidgetBridge.postMessage({
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
                  electronWidgetBridge.postMessage({
                    command: 'openFile',
                    path: rawPath,
                  });
                }
              }}
            >
              {displayName}
            </span>
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

        onClick={() => {
          setIsCollapsed((v) => !v);
          if (rawPath) {
            electronWidgetBridge.postMessage({
              command: 'openFile',
              path: rawPath,
            });
          }
        }}
        path={rawPath}
        compactPath
        onPathClick={(clickedPath) => {
          electronWidgetBridge.postMessage({
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
