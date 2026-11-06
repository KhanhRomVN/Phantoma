export type ListHostsParams = Record<string, never>;

/**
 * Parse list_hosts tag from AI response.
 * Format: <list_hosts /> (no params)
 */
export function parseListHosts(_innerContent: string): ListHostsParams {
  return {};
}
