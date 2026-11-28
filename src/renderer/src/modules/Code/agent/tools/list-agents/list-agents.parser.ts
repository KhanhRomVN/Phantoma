/**
 * ------------------------------------------------------------------
 * List Agents Parser
 * ------------------------------------------------------------------
 * Parser params cho tool list_agents (không nhận tham số).
 *
 * Main types:
 * - ListAgentsParams : Params rỗng của tool
 *
 * Main functions:
 * - parseListAgents() : Trả về params rỗng
 * ------------------------------------------------------------------
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ListAgentsParams {
  _empty?: true;
}

// ─── Functions ───────────────────────────────────────────────────────────────
export const parseListAgents = (_innerContent: string): ListAgentsParams => {
  // list_agents không nhận tham số nào.
  return {};
};