import { useWorkflowStore } from '../hooks/useWorkflowStore';
import { useCodeStore } from '../hooks/useCodeStore';

const CLOSE_AGENT_PANEL_EVENT = 'phantoma:close-agent-panel';

export async function executeDeleteAgent(params: {
  agent_id?: string;
  _validationError?: string;
}): Promise<string | null> {
  if (params._validationError) {
    return `[delete_agent] Result: Error - ${params._validationError}`;
  }

  const { agent_id } = params;
  if (!agent_id) {
    return `[delete_agent] Result: Error - Missing agent_id`;
  }
  if (agent_id === 'orchestrator') {
    return `[delete_agent] Result: Error - The orchestrator cannot be deleted`;
  }

  const store = useWorkflowStore.getState();
  const agent = store.getAgent(agent_id);
  if (!agent) {
    return `[delete_agent] Result: Error - Agent '${agent_id}' does not exist. Use list_agents to see existing agents.`;
  }

  const sessionId = useCodeStore.getState().activeWorkspaceSessionId;
  if (sessionId) {
    window.dispatchEvent(
      new CustomEvent(CLOSE_AGENT_PANEL_EVENT, { detail: { sessionId, agentId: agent_id } }),
    );
  }
  store.removeAgent(agent_id);

  return `[delete_agent] Result: Deleted ${agent.type} agent '${agent.name}' (id: ${agent_id}) and closed its Zen tab`;
}