import React from 'react';

import { cn } from '@renderer/utils/cn';

import { getToolLabel } from '@renderer/components/Widgets/Zen/feature/Chat/constants/tag-registry';
import { getNextUserMessage } from '@renderer/components/Widgets/Zen/feature/Chat/utils/message-navigator';
import { TagHeader } from '@renderer/components/Widgets/Zen/feature/Chat/components/ChatBody/AIMessageBox/TagHeader';
import ErrorBlock from '@renderer/components/Widgets/Zen/feature/Chat/components/ChatBody/AIMessageBox/ErrorBlock';
import type { BaseRendererProps } from '@renderer/components/Widgets/Zen/feature/Chat/types/renderer-types';

const parseTaskCount = (output: string): number | null => {
  try {
    const parsed = JSON.parse(output.slice(output.indexOf('\n') + 1));
    return Array.isArray(parsed?.tasks) ? parsed.tasks.length : null;
  } catch {
    return null;
  }
};

const TaskToolRendererBase: React.FC<BaseRendererProps> = ({
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
  const params = action.params || {};
  const validationError = params._validationError;

  const actionId = `${messageId}-action-${actionIndex}`;
  const outputEntry = toolOutputs?.[actionId];
  const output = outputEntry?.output || '';
  const isError =
    !!outputEntry?.isError ||
    !!validationError ||
    output.split('\n')[0].includes('Result: Error - ');
  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);
  const isCompleted = !!outputEntry || isActionClicked || isError || !!nextUserMessage;
  const isRunning = isActionClicked && !outputEntry;

  const target = params.title || params.task_id || params.status || '';
  const taskCount =
    action.type === 'list_tasks' && isCompleted && !isError ? parseTaskCount(output) : null;

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-1.5 text-xs text-text-primary cursor-default">
            <span className="font-semibold opacity-80 shrink-0">
              {getToolLabel(action.type, moduleId)}
            </span>
            {taskCount !== null && (
              <span className="opacity-50 text-[10px] text-text-secondary shrink-0 ml-auto whitespace-nowrap">
                {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
              </span>
            )}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isPartial={isRunning}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType={action.type}
        compactPath
        path={target}
      />

      {isError && (
        <ErrorBlock
          content={output || validationError || 'Task tool failed'}
          compact={true}
          maxHeight="300px"
        />
      )}
    </div>
  );
};

export default TaskToolRendererBase;
