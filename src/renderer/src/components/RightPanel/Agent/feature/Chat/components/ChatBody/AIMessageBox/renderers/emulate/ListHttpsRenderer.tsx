import React from 'react';
import { cn } from '@renderer/shared/utils/cn';

// CONSTANTS
import { getToolLabel } from '../../../../../constants/constants';

// COMPONENTS
import { TagHeader } from '../../TagHeader';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import ListHttpsBlock from '../../blocks/emulate/ListHttpsBlock';
import ErrorBlock from '../../blocks/other/ErrorBlock';

export const ListHttpsRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const actionId = `${messageId}-action-${actionIndex}`;
  const output = toolOutputs?.[actionId]?.output;
  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? output || '' : '';

  const isCompleted = Boolean(isActionClicked || isError || (output && output.trim().length > 0));

  // Parse summary từ output
  let requestCount = 0;
  let summaryText = '';
  if (output && !isError) {
    const match = output.match(/Total:\s*(\d+),\s*Filtered:\s*(\d+),\s*Showing:\s*(\d+)/);
    if (match) {
      requestCount = parseInt(match[3], 10);
      summaryText = `${match[1]} total, ${match[3]} shown`;
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80">{getToolLabel('list_https')}</span>
            {isCompleted && !isError && requestCount > 0 && (
              <span className="opacity-50 text-[10px] text-text-secondary">{summaryText}</span>
            )}
            {!isCompleted && (
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
        toolType="list_https"
        tooltipMeta={{
          fileCount: requestCount || undefined,
        }}
        isPartial={!isCompleted}
        onClick={() => setIsCollapsed((v) => !v)}
        path=""
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}

      {output && !isError && !isCollapsed && <ListHttpsBlock content={output} maxHeight="400px" />}
    </div>
  );
};
