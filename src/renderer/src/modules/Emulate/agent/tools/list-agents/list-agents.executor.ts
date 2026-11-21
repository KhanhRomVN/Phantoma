import { useEmulateWorkflowStore } from '../../stores/emulate-workflow.store';

export async function executeListAgents(): Promise<string | null> {
  const { agents, configs, inbox } = useEmulateWorkflowStore.getState();

  const items = agents.map((agent) => {
    const config = configs[agent.id];
    return {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      color: agent.color,
      status: (inbox[agent.id]?.length ?? 0) > 0 ? 'working' : 'idle',
      provider_id: config?.model?.providerId ?? null,
      model_id: config?.model?.modelId ?? config?.model?.id ?? null,
      account_id: config?.account?.accountId ?? config?.account?.id ?? null,
    };
  });

  return `[list_agents] Result:\n${JSON.stringify({ agents: items })}`;
}