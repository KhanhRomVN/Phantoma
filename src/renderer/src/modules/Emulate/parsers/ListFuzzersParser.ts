export type ListFuzzersParams = Record<string, never>;

/**
 * Parse list_fuzzers tag from AI response.
 * Format: <list_fuzzers /> (no params)
 */
export function parseListFuzzers(_innerContent: string): ListFuzzersParams {
  return {};
}
