/**
 * ------------------------------------------------------------------
 * Conversation Title Parser
 * ------------------------------------------------------------------
 * Parse conversation_title tag.
 * Tag này chỉ chứa text thuần (title), không có param con.
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
export interface ConversationTitleParams {
  title: string;
}

// ─── Functions ──────────────────────────────────────────────────────────
export const parseConversationTitle = (innerContent: string): ConversationTitleParams => {
  return {
    title: innerContent.trim(),
  };
};