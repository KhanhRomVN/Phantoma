export interface ListAgentsParams {
  _empty?: true;
}

export const parseListAgents = (_innerContent: string): ListAgentsParams => {
  // list_agents không nhận tham số nào.
  return {};
};