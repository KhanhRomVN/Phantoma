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

// ─── Imports ────────────────────────────────────────────────────────────
// ── Constants ──
import { TAG_REGISTRY } from "../constants/constants";

// ─── Functions ──────────────────────────────────────────────────────────
/**
 * Trả về quyết định cho một loại tool.
 * - "allow"  → tool đã đăng ký, thực thi ngay
 * - "reject" → tag lạ / không phải tool, chặn thực thi
 */
export const getPermissionDecision = (toolType: string): "allow" | "reject" => {
  const tagDef = TAG_REGISTRY[toolType];
  return tagDef && tagDef.category === "tool" ? "allow" : "reject";
};