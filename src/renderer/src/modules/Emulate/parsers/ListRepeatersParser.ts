export type ListRepeatersParams = Record<string, never>;

/**
 * Parse list_repeaters tag from AI response.
 * Format: <list_repeaters /> (no params)
 */
export function parseListRepeaters(_innerContent: string): ListRepeatersParams {
  return {};
}
