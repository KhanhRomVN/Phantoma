import React from 'react';
import { cn } from '@renderer/shared/utils/cn';

// ── Constants ──
import { getToolLabel } from '../../../../../constants/constants';

// ── Types ──
import { BaseRendererProps } from '../../../../../types/renderer-types';

// ── Utils ──
import { getNextUserMessage } from '../../../../../utils/renderer-utils';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';

// ── Components ──
import { TagHeader } from '../../TagHeader';
import ErrorBlock from '../../blocks/other/ErrorBlock';

export const GetResourceContentRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
  allMessages,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const actionId = `${messageId}-action-${actionIndex}`;
  const rawFilename = action.params.filename || '';
  const displayName = rawFilename || '';
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

  const fileIconPath = getFileIconPath(rawFilename);

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80">{getToolLabel('get_resource_content')}</span>
            {displayName && (
              <>
                <img
                  src={fileIconPath}
                  alt=""
                  className="w-4 h-4 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="font-medium opacity-90 font-mono text-[11px]">{displayName}</span>
              </>
            )}
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
        toolType="get_resource_content"
        tooltipMeta={{
          lineRange: lineRangeText || undefined,
        }}
        isPartial={isPartial}
        onClick={() => {
          setIsCollapsed((v) => !v);
        }}
        path={rawFilename}
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}
    </div>
  );
};
