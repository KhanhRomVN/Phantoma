import React from 'react';

import { cn } from '@renderer/shared/utils/cn';

import { getToolLabel } from '@renderer/components/RightPanel/Zen/feature/Chat/constants/tag-registry';
import { getNextUserMessage } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/renderer-utils';
import { TagHeader } from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/TagHeader';
import ErrorBlock from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/ErrorBlock';
import type { BaseRendererProps } from '@renderer/components/RightPanel/Zen/feature/Chat/types/renderer-types';

import { useWorkflowStore } from '../hooks/useWorkflowStore';

const humanizeAgentId = (id: string): string =>
  id
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const DeleteAgentRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
  allMessages,
}) => {
  const { agent_id: agentId = '', _validationError: validationError } = action.params || {};

  const actionId = `${messageId}-action-${actionIndex}`;
  const outputEntry = toolOutputs?.[actionId];
  const output = outputEntry?.output || '';
  const isError = !!outputEntry?.isError || !!validationError || output.includes('Error -');
  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);
  const isCompleted = !!outputEntry || isActionClicked || isError || !!nextUserMessage;
  const isDeleting = isActionClicked && !outputEntry;

  const target = useWorkflowStore((s) => s.agents.find((a) => a.id === agentId));
  const targetName = target?.name ?? (humanizeAgentId(agentId) || 'unknown');

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-1.5 text-xs text-text-primary cursor-default">
            <span className="font-semibold opacity-80 shrink-0">{getToolLabel('delete_agent')}</span>
            <span className="opacity-40 shrink-0">·</span>
            <span className="font-semibold shrink-0" style={{ color: target?.color }}>
              {targetName}
            </span>
            {isDeleting && (
              <span className="text-[10px] opacity-55 flex items-center gap-1 shrink-0 ml-auto">
                <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
                Deleting...
              </span>
            )}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isPartial={isDeleting}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="delete_agent"
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

export default DeleteAgentRenderer;