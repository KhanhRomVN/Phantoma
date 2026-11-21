import {
  EMULATE_AGENT_COLORS,
  ORCHESTRATOR_ID,
  useEmulateWorkflowStore,
} from '../../stores/emulate-workflow.store';
import {
  EMULATE_AGENT_TYPES,
  type EmulateAgentType,
} from '../../prompts/orchestrator/tools-reference';

export async function executeCreateAgent(params: {
  agent_id?: string;
  agent_type?: string;
  agent_name?: string;
  _validationError?: string;
}): Promise<string | null> {
  if (params._validationError) {
    return `[create_agent] Result: Error - ${params._validationError}`;
  }

  const { agent_id, agent_type, agent_name } = params;
  if (!agent_id || !agent_type || !agent_name) {
    return `[create_agent] Result: Error - Missing required fields (type: ${agent_type}, name: ${agent_name}, id: ${agent_id})`;
  }
  if (!EMULATE_AGENT_TYPES.includes(agent_type as EmulateAgentType)) {
    return `[create_agent] Result: Error - agent_type must be one of: ${EMULATE_AGENT_TYPES.join(', ')}`;
  }

  const store = useEmulateWorkflowStore.getState();
  if (agent_id === ORCHESTRATOR_ID || store.getAgent(agent_id)) {
    return `[create_agent] Result: Error - Agent with id '${agent_id}' already exists`;
  }

  store.addAgent({
    id: agent_id,
    name: agent_name,
    type: agent_type as EmulateAgentType,
    color: EMULATE_AGENT_COLORS[agent_type as EmulateAgentType],
  });

  // ASSUMED: a new sub-agent inherits the orchestrator's model + account (create_agent takes no model params)
  const orchestratorConfig = store.configs[ORCHESTRATOR_ID];
  if (orchestratorConfig?.model) store.setModel(agent_id, orchestratorConfig.model);
  if (orchestratorConfig?.account) store.setAccount(agent_id, orchestratorConfig.account);

  return `[create_agent] Result: Created ${agent_type} agent '${agent_name}' (id: ${agent_id})`;
}