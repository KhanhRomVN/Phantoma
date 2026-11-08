/**
 * ------------------------------------------------------------------
 * Message Navigator
 * ------------------------------------------------------------------
 * Helper function để navigate messages trong conversation.
 * Dùng trong các renderer để tìm user message tiếp theo.
 *
 * Main functions:
 * - getNextUserMessage() : Lấy user message tiếp theo sau assistant message
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { Message } from '../types/message';

// ─── Functions ──────────────────────────────────────────────────────────
/**
 * Get the next user message after current assistant message
 */
export const getNextUserMessage = (
  allMessages: Message[],
  messageId: string,
): Message | undefined => {
  if (!allMessages) return undefined;
  return allMessages
    .slice(allMessages.findIndex((m) => m.id === messageId) + 1)
    .find((m) => m.role === 'user');
};