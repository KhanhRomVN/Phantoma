/**
 * ------------------------------------------------------------------
 * Conversation Title Parser
 * ------------------------------------------------------------------
 * Parse conversation_title tag.
 * Tag này chỉ chứa text thuần (title), không có param con.
 * ------------------------------------------------------------------
 */

import type { ConversationTitleParams } from '../../types/tool-types';

// ─── Functions ──────────────────────────────────────────────────────────
export const parseConversationTitle = (innerContent: string): ConversationTitleParams => {
  return {
    title: innerContent.trim(),
  };
};