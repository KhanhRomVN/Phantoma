import React from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { getToolLabel } from '../../../../../constants/constants';
import { TagHeader } from '../../TagHeader';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import ErrorBlock from '../../blocks/other/ErrorBlock';

/**
 * ------------------------------------------------------------------
 * ExecuteCommandRenderer
 * ------------------------------------------------------------------
 * Renderer cho tool execute_command trong Emulate module.
 * Hiển thị output text của lệnh shell trong một pre block đơn giản.
 * ------------------------------------------------------------------
 */

export const ExecuteCommandRenderer: React.FC<BaseRendererProps> = ({
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

  const commandText = action?.params?.command || '';
  const isCompleted = Boolean(isActionClicked || isError || (output && output.trim().length > 0));

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80">
              {getToolLabel('execute_command')}
            </span>
            {commandText && (
              <span className="opacity-60 font-mono text-[11px] truncate max-w-[300px]">
                {commandText}
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
        toolType="execute_command"
        isPartial={!isCompleted}
        onClick={() => setIsCollapsed((v) => !v)}
        path=""
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}

      {output && !isError && !isCollapsed && (
        <div className="mt-1 bg-background border border-border rounded-[4px] overflow-hidden">
          <pre className="p-3 text-[12px] font-mono text-text-primary whitespace-pre-wrap overflow-auto leading-[1.5]">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
};