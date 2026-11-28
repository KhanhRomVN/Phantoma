// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { OPEN_AGENT_PANEL_EVENT } from '../../services/agent-panel.service';

// ── Stores ──
import { isAgentInCurrentWorkflow, useWorkflowStore } from '../../stores/workflow.store';
import { useCodeStore } from '../../../shared/stores/code.store';

// ── Types ──
import { AGENT_TYPE_COLORS, type AgentType } from '../../../shared/types/agents.types';

// ─── Constants ───────────────────────────────────────────────────────────────
const OPEN_AGENT_PANEL_TIMEOUT_MS = 8000;

// ─── Functions ───────────────────────────────────────────────────────────────
const openAgentPanel = (agentId: string, title: string) =>
  new Promise<boolean>((resolve) => {
    const sessionId = useCodeStore.getState().activeWorkspaceSessionId;
    if (!sessionId) return resolve(false);
    const timer = setTimeout(() => resolve(false), OPEN_AGENT_PANEL_TIMEOUT_MS);
    window.dispatchEvent(
      new CustomEvent(OPEN_AGENT_PANEL_EVENT, {
        detail: {
          sessionId,
          agentId,
          title,
          done: (ok: boolean) => {
            clearTimeout(timer);
            resolve(ok);
          },
        },
      }),
    );
  });

export async function executeCreateAgent(params: {
  agent_id?: string;
  agent_type?: string;
  agent_name?: string;
  provider_id?: string;
  model_id?: string;
  account_id?: string;
  account_email?: string;
  _validationError?: string;
}): Promise<string | null> {
  if (params._validationError) {
    return `[create_agent] Result: Error - ${params._validationError}`;
  }

  const { agent_id, agent_type, agent_name, provider_id, model_id, account_id, account_email } =
    params;

  if (!agent_id || !agent_type || !agent_name) {
    console.error('[CreateAgentExecutor] Missing required fields:', {
      agent_id,
      agent_type,
      agent_name,
    });
    return `[create_agent] Result: Error - Missing required fields (type: ${agent_type}, name: ${agent_name}, id: ${agent_id})`;
  }

  const store = useWorkflowStore.getState();
  const existing = store.getAgent(agent_id);
  if (existing) {
    if (isAgentInCurrentWorkflow(existing)) {
      return `[create_agent] Result: Error - Agent with id '${agent_id}' already exists`;
    }
    store.removeAgent(agent_id);
  }

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
    store.setModel(agent_id, {
      providerId: provider_id,
      modelId: model_id,
      id: model_id,
      name: model_id,
    });
    store.setAccount(agent_id, { id: account_id, provider_id, email: account_email });
  }

  useCodeStore.getState().setContentViewMode('workspace');
  const typeLabel = agent_type.charAt(0).toUpperCase() + agent_type.slice(1);
  const opened = await openAgentPanel(agent_id, `${typeLabel} - ${agent_name}`);
  if (!opened) {
    store.removeAgent(agent_id);
    return `[create_agent] Result: Error - Failed to open Zen tab for ${agent_type} agent '${agent_name}' (id: ${agent_id})`;
  }

  return `[create_agent] Result: Created ${agent_type} agent '${agent_name}' (id: ${agent_id}) with ${provider_id}/${model_id} (account: ${account_id})`;
}
