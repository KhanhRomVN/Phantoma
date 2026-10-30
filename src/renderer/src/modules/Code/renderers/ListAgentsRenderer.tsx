import React from 'react';

import { cn } from '@renderer/shared/utils/cn';

// ── Constants ──
import { getToolLabel } from '@renderer/components/RightPanel/Zen/feature/Chat/constants/tag-registry';

// ── Utils ──
import { getNextUserMessage } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/renderer-utils';

// ── Components ──
import { TagHeader } from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/TagHeader';
import ErrorBlock from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/ErrorBlock';
import { BaseRendererProps } from '@renderer/components/RightPanel/Zen/feature/Chat/types/renderer-types';

import { getAgentFavicon } from '../constants/workspaceAgents';

interface AgentItem {
  id: string;
  name: string;
  type: string;
  color?: string;
  provider_id?: string | null;
  model_id?: string | null;
  account_id?: string | null;
}

const capitalize = (value: string): string =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

const AgentRow: React.FC<{ agent: AgentItem }> = ({ agent }) => (
  <div className="flex items-center gap-2 text-xs leading-[1.4]">
    <span
      className="w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: agent.color || 'rgb(106, 122, 154)' }}
    />
    <span className="text-text-secondary shrink-0">{capitalize(agent.type)}</span>
    <span className="font-semibold text-text-primary truncate min-w-0">{agent.name}</span>
    <span className="ml-auto flex items-center gap-1.5 min-w-0 font-mono text-[11px] text-text-secondary opacity-60">
      {getAgentFavicon(agent.provider_id) && (
        <img
          src={getAgentFavicon(agent.provider_id)}
          alt=""
          draggable={false}
          className="w-3.5 h-3.5 shrink-0 rounded-[2px] object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <span className="truncate">
        {agent.provider_id && agent.model_id
          ? `${agent.provider_id}/${agent.model_id}`
          : 'no model'}
      </span>
    </span>
  </div>
);

const parseAgents = (output: string): AgentItem[] | null => {
  if (!output) return null;
  try {
    const parsed = JSON.parse(output);
    return Array.isArray(parsed?.agents) ? parsed.agents : null;
  } catch {
    return null;
  }
};

const ListAgentsRenderer: React.FC<BaseRendererProps> = ({
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
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const actionId = `${messageId}-action-${actionIndex}`;
  const outputEntry = toolOutputs?.[actionId];
  const output = outputEntry?.output || '';
  const isError = !!outputEntry?.isError || !!action.params?._validationError;
  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);
  const isCompleted = !!outputEntry || isActionClicked || isError || !!nextUserMessage;
  const agents = React.useMemo(() => parseAgents(output), [output]);

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div
            className={cn(
              'flex items-center gap-2 text-xs text-text-primary',
              isCompleted ? 'cursor-pointer' : 'cursor-default',
            )}
            onClick={isCompleted ? () => setIsCollapsed((v) => !v) : undefined}
          >
            <span className="font-semibold opacity-80 shrink-0">{getToolLabel('list_agents', moduleId)}</span>
            {isCompleted && agents && (
              <span className="opacity-50 text-[10px] text-text-secondary shrink-0 ml-auto whitespace-nowrap">
                {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
              </span>
            )}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="list_agents"
        compactPath
      />

      {isCompleted && isError && (
        <ErrorBlock
          content={output || action.params?._validationError || 'List agents failed'}
          compact={true}
          maxHeight="300px"
        />
      )}

      {isCompleted && !isError && !isCollapsed && agents && (
        <div
          className="max-h-[120px] overflow-y-auto mt-0.5 pl-3 pr-2.5 py-1.5 bg-background border rounded-[4px] flex flex-col gap-1.5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(128,128,128,0.4) transparent' }}
        >
          {agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ListAgentsRenderer;
