import React from 'react';
import { cn } from '@renderer/utils/cn';
import { getToolLabel } from '@renderer/components/Widgets/Zen/screens/Chat/constants/tag-registry';
import { TagHeader } from '@renderer/components/Widgets/Zen/screens/Chat/components/ChatBody/AIMessageBox/TagHeader';
import { MarkdownRenderer } from '@renderer/components/Widgets/Zen/screens/Chat/components/ChatBody/AIMessageBox/renderers/MarkdownRenderer';
import { BaseRendererProps } from '@renderer/components/Widgets/Zen/screens/Chat/types/renderer-types';
import ErrorBlock from '@renderer/components/Widgets/Zen/screens/Chat/components/ChatBody/AIMessageBox/ErrorBlock';
import { useEmulateWorkflowStore } from '../../stores/emulate-workflow.store';

export const SendMessageRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
  moduleId,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const {
    agent_id: agentId = '',
    message = '',
    _validationError: validationError,
  } = action.params || {};

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
              {getToolLabel('send_message', moduleId)}
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
        toolType="send_message"
        isPartial={!isCompleted}
        onClick={() => setIsCollapsed((v) => !v)}
        compactPath
        path={agentId}
      />

      {isError && (
        <ErrorBlock
          content={output || validationError || 'Send message failed'}
          compact={true}
          maxHeight="300px"
        />
      )}

      {!isError && !isCollapsed && message && (
        <div className="max-h-[360px] overflow-y-auto pl-3 pr-2.5 py-1.5 bg-card-background rounded-r-[4px] rounded-l-[1px]">
          <MarkdownRenderer content={message} />
        </div>
      )}
    </div>
  );
};
