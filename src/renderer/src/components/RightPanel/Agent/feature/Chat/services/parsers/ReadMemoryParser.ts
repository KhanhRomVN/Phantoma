/**
 * ------------------------------------------------------------------
 * Read Memory Parser
 * ------------------------------------------------------------------
 * Parse read_memory tag. Tag này không có tham số — chỉ cần phát
 * hiện sự tồn tại là đủ.
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
export interface ReadMemoryParams {
  _empty?: true;
}

// ─── Functions ──────────────────────────────────────────────────────────
export const parseReadMemory = (_innerContent: string): ReadMemoryParams => {
  // read_memory không nhận tham số nào.
  return {};
};