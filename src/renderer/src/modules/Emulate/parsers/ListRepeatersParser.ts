import type { ListRepeatersParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/**
 * Parse list_repeaters tag from AI response.
 * Format: <list_repeaters /> (no params)
 */
export function parseListRepeaters(_innerContent: string): ListRepeatersParams {
  return {};
}
