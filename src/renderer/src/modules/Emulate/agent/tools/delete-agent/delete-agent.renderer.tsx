import React from 'react';
import { cn } from '@renderer/utils/cn';
import { getToolLabel } from '@renderer/components/Widgets/Zen/feature/Chat/constants/tag-registry';
import { TagHeader } from '@renderer/components/Widgets/Zen/feature/Chat/components/ChatBody/AIMessageBox/TagHeader';
import { BaseRendererProps } from '@renderer/components/Widgets/Zen/feature/Chat/types/renderer-types';
import ErrorBlock from '@renderer/components/Widgets/Zen/feature/Chat/components/ChatBody/AIMessageBox/ErrorBlock';
import { useEmulateWorkflowStore } from '../../stores/emulate-workflow.store';

export const DeleteAgentRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
  moduleId,
}) => {
  const { agent_id: agentId = '', _validationError: validationError } = action.params || {};

  const actionId = `${messageId}-action-${actionIndex}`;
  const output = toolOutputs?.[actionId]?.output || '';
  const isError =
    !!toolOutputs?.[actionId]?.isError || !!validationError || output.includes('Error -');
  const isCompleted = Boolean(isActionClicked || isError || output.trim().length > 0);
  const target = useEmulateWorkflowStore((s) => s.agents.find((a) => a.id === agentId));

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-1.5 text-xs text-text-primary">
            <span className="font-semibold opacity-80 shrink-0">
              {getToolLabel('delete_agent', moduleId)}
            </span>
            <span className="opacity-40 shrink-0">·</span>
            <span className="font-semibold truncate" style={{ color: target?.color }}>
              {target?.name ?? agentId}
            </span>
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="delete_agent"
        isPartial={!isCompleted}
        compactPath
        path={agentId}
      />

      {isError && (
        <ErrorBlock
          content={output || validationError || 'Delete agent failed'}
          compact={true}
          maxHeight="300px"
        />
      )}
    </div>
  );
};