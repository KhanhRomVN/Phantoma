/**
 * ------------------------------------------------------------------
 * Read Memory Parser
 * ------------------------------------------------------------------
 * Parser params cho tool read_memory (không nhận tham số).
 *
 * Main types:
 * - ReadMemoryParams : Params rỗng của tool
 *
 * Main functions:
 * - parseReadMemory() : Trả về params rỗng
 * ------------------------------------------------------------------
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ReadMemoryParams {
  _empty?: true;
}

// ─── Functions ───────────────────────────────────────────────────────────────
export const parseReadMemory = (_innerContent: string): ReadMemoryParams => {
  // read_memory không nhận tham số nào.
  return {};
};