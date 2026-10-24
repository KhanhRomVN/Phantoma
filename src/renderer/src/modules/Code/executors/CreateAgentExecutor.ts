import { useWorkflowStore } from '../hooks/useWorkflowStore';
import { AGENT_TYPE_COLORS, type AgentType } from '../types/agents';

export async function executeCreateAgent(params: {
  agent_type?: string;
  agent_name?: string;
  provider_id?: string;
  model_id?: string;
  account_id?: string;
  _validationError?: string;
}): Promise<string | null> {
  console.log('[CreateAgentExecutor] Executing with params:', params);

  if (params._validationError) {
    console.log('[CreateAgentExecutor] Validation error:', params._validationError);
    return `[create_agent] Result: Error - ${params._validationError}`;
  }

  const { agent_type, agent_name, provider_id, model_id, account_id } = params;

  // Generate agent_id from agent_name (convert to snake_case)
  const agent_id = agent_name
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');

  if (!agent_id || !agent_type || !agent_name) {
    console.error('[CreateAgentExecutor] Missing required fields:', {
      agent_id,
      agent_type,
      agent_name,
    });
    return `[create_agent] Result: Error - Missing required fields (type: ${agent_type}, name: ${agent_name}, id: ${agent_id})`;
  }

  // Add agent to workflow store
  const store = useWorkflowStore.getState();

  // Check if agent already exists
  const existing = store.getAgent(agent_id);
  if (existing) {
    return `[create_agent] Result: Error - Agent with id '${agent_id}' already exists`;
  }

  // Create agent
  const color = AGENT_TYPE_COLORS[agent_type as AgentType] || '#A78BFA';
  store.addAgent({
    id: agent_id,
    name: agent_name,
    title: `${agent_type.charAt(0).toUpperCase() + agent_type.slice(1)} agent`,
    type: agent_type as AgentType,
    color,
  });

  // Set model and account for this agent
  if (provider_id && model_id && account_id) {
    // TODO: Fetch actual model and account objects from API
    // For now, store the IDs
    store.setModel(agent_id, { providerId: provider_id, modelId: model_id });
    store.setAccount(agent_id, { accountId: account_id });
  }

  return `[create_agent] Result: Created ${agent_type} agent '${agent_name}' (id: ${agent_id}) with ${provider_id}/${model_id} (account: ${account_id})`;
}
