export type ListAgentsParams = Record<string, never>;

/** Parse list_agents tag. Format: <list_agents /> (no params) */
export function parseListAgents(_innerContent: string): ListAgentsParams {
  return {};
}