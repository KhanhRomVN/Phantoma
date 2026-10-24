/**
 * ------------------------------------------------------------------
 * Permission Utils
 * ------------------------------------------------------------------
 * Helper functions để quyết định quyền thực thi cho từng tool.
 *
 * Main functions:
 * - getPermissionDecision() : Trả về quyết định (allow/reject)
 * ------------------------------------------------------------------
 */

// ─── Functions ──────────────────────────────────────────────────────────
/**
 * All tools are allowed — no permission blocking.
 */
export const getPermissionDecision = (): 'allow' | 'reject' => {
  return 'allow';
};
