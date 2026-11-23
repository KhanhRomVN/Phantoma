import React from 'react';
import { cn } from '@renderer/utils/cn';
import { getToolLabel } from '@renderer/components/Widgets/Zen/screens/Chat/constants/tag-registry';
import { TagHeader } from '@renderer/components/Widgets/Zen/screens/Chat/components/ChatBody/AIMessageBox/TagHeader';
import { BaseRendererProps } from '@renderer/components/Widgets/Zen/screens/Chat/types/renderer-types';
import ErrorBlock from '@renderer/components/Widgets/Zen/screens/Chat/components/ChatBody/AIMessageBox/ErrorBlock';
import { EMULATE_AGENT_COLORS, type EmulateAgentKind } from '../../stores/emulate-workflow.store';

export const CreateAgentRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
  moduleId,
}) => {
  const {
    agent_id: agentId = '',
    agent_type: agentType = '',
    agent_name: agentName = '',
    _validationError: validationError,
  } = action.params || {};

  const actionId = `${messageId}-action-${actionIndex}`;
  const output = toolOutputs?.[actionId]?.output || '';
  const isError =
    !!toolOutputs?.[actionId]?.isError || !!validationError || output.includes('Error -');
  const isCompleted = Boolean(isActionClicked || isError || output.trim().length > 0);
  const color = EMULATE_AGENT_COLORS[agentType as EmulateAgentKind];

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-1.5 text-xs text-text-primary">
            <span className="font-semibold opacity-80 shrink-0">
              {getToolLabel('create_agent', moduleId)}
            </span>
            <span className="opacity-40 shrink-0">·</span>
            <span className="font-semibold truncate" style={{ color }}>
              {agentName || agentId}
            </span>
            {agentType && <span className="text-text-secondary shrink-0">{agentType}</span>}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="create_agent"
        isPartial={!isCompleted}
        compactPath
        path={agentId}
      />

      {isError && (
        <ErrorBlock
          content={output || validationError || 'Create agent failed'}
          compact={true}
          maxHeight="300px"
        />
      )}
    </div>
  );
};
