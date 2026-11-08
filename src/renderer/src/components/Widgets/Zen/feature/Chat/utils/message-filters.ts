/**
 * ------------------------------------------------------------------
 * Message Filters
 * ------------------------------------------------------------------
 * Helper functions để filter và phân loại messages theo role/type.
 * Dùng trong ChatBody, ChatFooter, và message action hooks.
 *
 * Main functions:
 * - isUserMessage()        : Kiểm tra message có role 'user'
 * - isAssistantMessage()   : Kiểm tra message có role 'assistant'
 * - isManualUserMessage()  : Kiểm tra message là user message thủ công (không có actionIds)
 * - parseUserContent()     : Parse nội dung user message (remove wrapper tags)
 * - extractFirstUserMessage() : Lấy user message đầu tiên làm title candidate
 * - countAssistantMessages(): Đếm số assistant messages
 * - findPreviousMessage()  : Tìm message trước đó theo role
 * ------------------------------------------------------------------
 */

import type { Message } from '../types/message';
import { USER_MESSAGE_WRAPPER_REGEX, USER_MESSAGE_TAG_REGEX } from '../constants/patterns';

export const isUserMessage = (message: Message): boolean => {
  return message.role === 'user';
};

export const isAssistantMessage = (message: Message): boolean => {
  return message.role === 'assistant';
};

export const isManualUserMessage = (message: Message): boolean => {
  return isUserMessage(message) && (!message.actionIds || message.actionIds.length === 0);
};

export const parseUserContent = (content: string): string => {
  const match = content.match(USER_MESSAGE_WRAPPER_REGEX);
  if (match) return match[1];

  let cleaned = content.replace(USER_MESSAGE_TAG_REGEX, '');

  if (cleaned.startsWith('```') && cleaned.includes('```', 3)) {
    cleaned = cleaned.split('```')[1]?.trim() || cleaned;
  }
  return cleaned || '';
};

export const extractFirstUserMessage = (messages: Message[] | undefined): string => {
  if (!messages || !messages.length) return '';
  const firstUserMsg = messages.find(isUserMessage);
  if (!firstUserMsg) return '';

  const rawContent = typeof firstUserMsg.content === 'string' ? firstUserMsg.content : '';
  const parsed = parseUserContent(rawContent).trim();
  const lines = parsed.split('\n').filter((l) => l.trim());
  const titleCandidate = lines[0] || parsed.substring(0, 60);

  return titleCandidate.length > 60 ? titleCandidate.substring(0, 57) + '...' : titleCandidate;
};

export const countAssistantMessages = (messages: Message[]): number => {
  return messages.filter(isAssistantMessage).length;
};

export const findPreviousMessage = (
  messages: Message[],
  currentMessageId: string,
  role: 'user' | 'assistant',
): Message | null => {
  const msgIndex = messages.findIndex((m) => m.id === currentMessageId);
  if (msgIndex <= 0) return null;

  for (let i = msgIndex - 1; i >= 0; i--) {
    if (messages[i].role === role) {
      return messages[i];
    }
  }
  return null;
};