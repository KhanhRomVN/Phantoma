/**
 * ------------------------------------------------------------------
 * List Agents Executor
 * ------------------------------------------------------------------
 * Thực thi tool list_agents: liệt kê các agent đang có Zen tab mở trong
 * session hiện tại kèm cấu hình provider/model/account.
 *
 * Main functions:
 * - executeListAgents() : Trả về danh sách agent dạng JSON
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Stores ──
import { isAgentInCurrentWorkflow, useWorkflowStore } from '../../stores/workflow.store';

// ─── Functions ───────────────────────────────────────────────────────────────
export async function executeListAgents(): Promise<string | null> {
  const { agents, configs } = useWorkflowStore.getState();

  const items = agents.filter(isAgentInCurrentWorkflow).map((agent) => {
    const config = configs[agent.id];
    return {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      color: agent.color,
      provider_id: config?.model?.providerId ?? null,
      model_id: config?.model?.modelId ?? config?.model?.id ?? null,
      account_id: config?.account?.accountId ?? config?.account?.id ?? null,
    };
  });

  return `[list_agents] Result:\n${JSON.stringify({ agents: items })}`;
}
