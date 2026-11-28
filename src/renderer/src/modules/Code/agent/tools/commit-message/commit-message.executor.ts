/**
 * ------------------------------------------------------------------
 * Commit Message Executor
 * ------------------------------------------------------------------
 * Display-only tool - không thực thi, chỉ trả về marker để UI render.
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { DISPLAY_ONLY_RESULT } from '@renderer/modules/Code/shared/zen/zen-bridge';
import { ExecutorContext } from '@renderer/modules/Code/shared/zen/zen-bridge';
// import { ExecutorContext } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ─── Functions ───────────────────────────────────────────────────────────────
export async function executeCommitMessage(
  _params: Record<string, any>,
  _ctx: ExecutorContext,
): Promise<string> {
  return DISPLAY_ONLY_RESULT;
}
