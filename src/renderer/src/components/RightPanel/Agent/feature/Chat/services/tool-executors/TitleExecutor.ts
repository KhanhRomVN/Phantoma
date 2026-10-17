/**
 * ------------------------------------------------------------------
 * Conversation Title Executor
 * ------------------------------------------------------------------
 * Cập nhật title cho conversation hiện tại. Cần moduleId + conversationId
 * từ ExecutorContext.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Controller ──
import { TitleController } from '@renderer/controller/TitleController';

// ─── Types ──────────────────────────────────────────────────────────────
import type { ExecutorContext } from '../../types/executor-types';

// ─── Functions ──────────────────────────────────────────────────────────
export async function executeConversationTitle(
  params: { title: string },
  ctx: ExecutorContext,
): Promise<string | null> {
  const title = (params.title || '').trim();
  if (!title) {
    return '[conversation_title] Result: Error - title is required';
  }

  const moduleId = (ctx as any).moduleId || '';
  const conversationId = ctx.conversationIdRef?.current || '';

  if (!moduleId || !conversationId) {
    return '[conversation_title] Result: Error - moduleId/conversationId missing in context';
  }

  const result = await TitleController.updateTitle(moduleId, conversationId, title);
  if (!result.success) {
    return `[conversation_title] Result: Error - ${result.error}`;
  }

  return `[conversation_title] Result: Title updated to "${title}"`;
}