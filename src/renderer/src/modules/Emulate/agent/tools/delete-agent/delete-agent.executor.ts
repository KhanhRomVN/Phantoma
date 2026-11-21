import { ORCHESTRATOR_ID, useEmulateWorkflowStore } from '../../stores/emulate-workflow.store';

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
  if (agent_id === ORCHESTRATOR_ID) {
    return `[delete_agent] Result: Error - The orchestrator cannot be deleted`;
  }

  const store = useEmulateWorkflowStore.getState();
  const agent = store.getAgent(agent_id);
  if (!agent) {
    return `[delete_agent] Result: Error - Agent '${agent_id}' does not exist. Use list_agents to see existing agents.`;
  }

  store.removeAgent(agent_id);

  return `[delete_agent] Result: Deleted ${agent.type} agent '${agent.name}' (id: ${agent_id}) and closed its Zen tab`;
}