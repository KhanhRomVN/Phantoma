import type { ListHostsParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/**
 * Parse list_hosts tag from AI response.
 * Format: <list_hosts /> (no params)
 */
export function parseListHosts(_innerContent: string): ListHostsParams {
  return {};
}
