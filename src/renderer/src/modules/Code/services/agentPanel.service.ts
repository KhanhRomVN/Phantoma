import { useCodeStore } from '../hooks/useCodeStore';
import { useWorkflowStore } from '../hooks/useWorkflowStore';
import { AGENT_TYPE_COLORS, type AgentType } from '../types/agents';

const OPEN_AGENT_PANEL_EVENT = 'phantoma:open-agent-panel';

const humanizeAgentId = (id: string): string =>
  id
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

export function focusAgentPanel(agentId: string): void {
  if (!agentId) return;
  const codeStore = useCodeStore.getState();
  const sessionId = codeStore.activeWorkspaceSessionId;
  if (!sessionId) return;

  const workflow = useWorkflowStore.getState();
  let agent = workflow.getAgent(agentId);
  if (!agent) {
    const type: AgentType = 'executor';
    agent = {
      id: agentId,
      name: humanizeAgentId(agentId),
      title: 'Agent',
      type,
      color: AGENT_TYPE_COLORS[type],
    };
    workflow.addAgent(agent);
  }

  const title =
    agent.id === 'orchestrator' ? 'Zen - Orchestrator' : `${capitalize(agent.type)} - ${agent.name}`;

  codeStore.setContentViewMode('workspace');
  window.dispatchEvent(
    new CustomEvent(OPEN_AGENT_PANEL_EVENT, {
      detail: { sessionId, agentId, title, focus: true, done: () => {} },
    }),
  );
}