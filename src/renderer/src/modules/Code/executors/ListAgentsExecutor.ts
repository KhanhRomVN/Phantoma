import { useWorkflowStore } from '../hooks/useWorkflowStore';
import { useCodeStore } from '../hooks/useCodeStore';

export async function executeListAgents(): Promise<string | null> {
  const { agents, configs } = useWorkflowStore.getState();
  const code = useCodeStore.getState();
  const panels = code.projects.find((p) => p.id === code.currentProjectId)?.workspacePanels ?? [];
  const linkedIds = new Set(
    panels
      .filter((p) => p.workflowAgentId && p.sessionId === code.activeWorkspaceSessionId)
      .map((p) => p.workflowAgentId),
  );

  const items = agents.filter((agent) => linkedIds.has(agent.id)).map((agent) => {
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
