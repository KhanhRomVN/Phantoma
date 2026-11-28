// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import React from 'react';

// ── Stores ──
import { useWorkflowStore } from '../../stores/workflow.store';

// ── Utils ──
import { cn } from '@renderer/utils/cn';
import { getToolLabel } from '@renderer/modules/Code/shared/zen/zen-bridge';
import { getNextUserMessage } from '@renderer/modules/Code/shared/zen/zen-bridge';
import { TagHeader } from '@renderer/modules/Code/shared/zen/zen-bridge';
import { ErrorBlock } from '@renderer/modules/Code/shared/zen/zen-bridge';
import { BaseRendererProps } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ─── Functions ───────────────────────────────────────────────────────────────
const humanizeAgentId = (id: string): string =>
  id
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

// ─── Component ───────────────────────────────────────────────────────────────
const DeleteAgentRenderer: React.FC<BaseRendererProps> = ({
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
  const { agent_id: agentId = '', _validationError: validationError } = action.params || {};

  const actionId = `${messageId}-action-${actionIndex}`;
  const outputEntry = toolOutputs?.[actionId];
  const output = outputEntry?.output || '';
  const isError = !!outputEntry?.isError || !!validationError || output.includes('Error -');
  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);
  const isCompleted = !!outputEntry || isActionClicked || isError || !!nextUserMessage;
  const isDeleting = isActionClicked && !outputEntry;

  // ── Store ──
  const target = useWorkflowStore((s) => s.agents.find((a) => a.id === agentId));

  // ── Derived ──
  const targetName = target?.name ?? (humanizeAgentId(agentId) || 'unknown');

  // ── Render ──
  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-1.5 text-xs text-text-primary cursor-default">
            <span className="font-semibold opacity-80 shrink-0">
              {getToolLabel('delete_agent', moduleId)}
            </span>
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
