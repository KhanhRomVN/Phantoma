import React from 'react';
import { cn } from '@renderer/shared/lib/utils';
import { getToolLabel } from '../../../../../constants/constants';
import { TagHeader } from '../../TagHeader';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import GetSourceDetailBlock from '../../blocks/emulate/GetSourceDetailBlock';
import ErrorBlock from '../../blocks/other/ErrorBlock';

export const GetSourceDetailRenderer: React.FC<BaseRendererProps> = ({
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
  const errorMessage = isError ? (output || '') : '';

  const isCompleted = Boolean(isActionClicked || isError || (output && output.trim().length > 0));

  let fileName = '';
  if (output && !isError) {
    const match = output.match(/File:\s*(.+)/);
    if (match) {
      fileName = match[1];
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80">
              {getToolLabel('get_source_detail')}
            </span>
            {isCompleted && !isError && fileName && (
              <span className="opacity-50 text-[10px] text-text-secondary truncate max-w-[200px]">
                {fileName}
              </span>
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
        toolType="get_source_detail"
        isPartial={!isCompleted}
        onClick={() => setIsCollapsed((v) => !v)}
        path=""
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}

      {output && !isError && !isCollapsed && (
        <GetSourceDetailBlock content={output} maxHeight="500px" />
      )}
    </div>
  );
};