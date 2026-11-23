import React from 'react';
import { cn } from '@renderer/utils/cn';
import { getToolLabel } from '@renderer/components/Widgets/Zen/screens/Chat/constants/tag-registry';
import { TagHeader } from '@renderer/components/Widgets/Zen/screens/Chat/components/ChatBody/AIMessageBox/TagHeader';
import { BaseRendererProps } from '@renderer/components/Widgets/Zen/screens/Chat/types/renderer-types';
import ErrorBlock from '@renderer/components/Widgets/Zen/screens/Chat/components/ChatBody/AIMessageBox/ErrorBlock';

interface AgentItem {
  id: string;
  name: string;
  type: string;
  color?: string;
  status?: string;
  provider_id?: string | null;
  model_id?: string | null;
}

const parseAgents = (output: string): AgentItem[] | null => {
  const start = output.indexOf('{');
  if (start < 0) return null;
  try {
    const parsed = JSON.parse(output.slice(start));
    return Array.isArray(parsed?.agents) ? parsed.agents : null;
  } catch {
    return null;
  }
};

const AgentRow: React.FC<{ agent: AgentItem }> = ({ agent }) => (
  <div className="flex items-center gap-2 text-xs leading-[1.4]">
    <span
      className="w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: agent.color || 'rgb(106, 122, 154)' }}
    />
    <span className="text-text-secondary shrink-0">{agent.type}</span>
    <span className="font-semibold text-text-primary truncate min-w-0">{agent.name}</span>
    <span className="ml-auto font-mono text-[11px] text-text-secondary opacity-60 truncate">
      {agent.status ?? 'idle'}
      {' · '}
      {agent.provider_id && agent.model_id ? `${agent.provider_id}/${agent.model_id}` : 'no model'}
    </span>
  </div>
);

export const ListAgentsRenderer: React.FC<BaseRendererProps> = ({
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
  moduleId,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const actionId = `${messageId}-action-${actionIndex}`;
  const output = toolOutputs?.[actionId]?.output || '';
  const isError = !!toolOutputs?.[actionId]?.isError;
  const isCompleted = Boolean(isActionClicked || isError || output.trim().length > 0);
  const agents = React.useMemo(() => parseAgents(output), [output]);

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80 shrink-0">
              {getToolLabel('list_agents', moduleId)}
            </span>
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
        isPartial={!isCompleted}
        onClick={() => setIsCollapsed((v) => !v)}
        path=""
      />

      {isError && <ErrorBlock content={output} compact={true} maxHeight="300px" />}

      {isCompleted && !isError && !isCollapsed && agents && (
        <div className="max-h-[120px] overflow-y-auto mt-0.5 pl-3 pr-2.5 py-1.5 bg-background border rounded-[4px] flex flex-col gap-1.5">
          {agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
};
