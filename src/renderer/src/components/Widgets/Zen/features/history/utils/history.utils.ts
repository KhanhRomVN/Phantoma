/**
 * ------------------------------------------------------------------
 * history.utils
 * ------------------------------------------------------------------
 * Pure helpers (không React / window / IPC / service) cho History.
 * ------------------------------------------------------------------
 */

import type { ConversationItem, HistoryMessage } from '../types';

type TimestampSource = Pick<ConversationItem, 'lastModified' | 'timestamp' | 'createdAt'>;

/** Class Tailwind (tĩnh) cho màu token theo ngưỡng sử dụng. */
export interface TokenTone {
  text: string;
  chip: string;
}

const pad2 = (n: number) => n.toString().padStart(2, '0');

/** Timestamp (ms) ưu tiên lastModified → timestamp → createdAt; 0 nếu thiếu/không hợp lệ. */
export const getItemTimestamp = (item: Partial<TimestampSource>): number => {
  const ts = item.lastModified || item.timestamp || item.createdAt || 0;
  const value = new Date(ts).getTime();
  return Number.isFinite(value) && value > 0 ? value : 0;
};

/** Màu token theo ngưỡng sử dụng (class Tailwind tĩnh để JIT nhận diện). */
export const getTokenTone = (n: number): TokenTone => {
  if (n >= 500000) return { text: 'text-error', chip: 'text-error bg-error/15' };
  if (n >= 50000) return { text: 'text-warn', chip: 'text-warn bg-warn/15' };
  if (n >= 10000) return { text: 'text-success', chip: 'text-success bg-success/15' };
  return { text: 'text-primary', chip: 'text-primary bg-primary/15' };
};

export const formatTokens = (n: number): string => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

/** Tách nội dung người dùng khỏi wrapper XML của prompt. */
export const parseUserContent = (raw: string): string => {
  const content = raw || '';
  const match = content.match(/## User Message\n<user-message>\n([\s\S]*?)\n<\/user-message>/);
  if (match) return match[1];
  let cleaned = content
    .replace(/^<user-message>\n?/, '')
    .replace(/\n?<\/user-message>[\s\S]*$/, '');
  if (cleaned.startsWith('```') && cleaned.includes('```', 3)) {
    cleaned = cleaned.split('```')[1]?.trim() || cleaned;
  }
  return cleaned || '';
};

/** "Just now", "2m ago", "Yesterday 12:30", "dd/mm/yy hh:mm"; '' nếu timestamp thiếu/sai. */
export const formatTimeText = (timestamp: number): string => {
  if (!timestamp || !Number.isFinite(timestamp) || timestamp <= 0) return '';
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const d = new Date(timestamp);
  const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  if (days === 0) {
    if (hours === 0) return minutes <= 0 ? 'Just now' : `${minutes}m ago`;
    return `${hours}h ago`;
  }
  if (days === 1) return `Yesterday ${hhmm}`;
  if (days < 7) return `${days}d ago`;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${hhmm}`;
};

/** Nhãn nhóm ngày: "Today · dd/mm", "Yesterday · dd/mm", "<Weekday> · dd/mm". */
export const getDateLabel = (item: Partial<TimestampSource>): string => {
  const ts = getItemTimestamp(item);
  if (!ts) return 'Unknown date';
  const date = new Date(ts);
  const now = new Date();
  const dateStr = `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
  if (date.toDateString() === now.toDateString()) return `Today · ${dateStr}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${dateStr}`;
  return `${date.toLocaleDateString('en-US', { weekday: 'long' })} · ${dateStr}`;
};

const FAVICON_DOMAINS: Array<[string[], string]> = [
  [['openai', 'chatgpt', 'gpt'], 'openai.com'],
  [['anthropic', 'claude'], 'anthropic.com'],
  [['google', 'gemini'], 'google.com'],
  [['openrouter'], 'openrouter.ai'],
  [['deepseek'], 'deepseek.com'],
  [['grok', 'xai', 'x.ai'], 'x.ai'],
  [['zenmux'], 'zenmux.ai'],
  [['moonshot', 'kimi'], 'moonshot.cn'],
  [['qwen', 'alibaba', 'aliyun', 'dashscope'], 'qwen.ai'],
  [['groq'], 'groq.com'],
  [['mistral'], 'mistral.ai'],
  [['glm', 'zai', 'z-ai', 'zhipu', 'bigmodel'], 'bigmodel.cn'],
  [['cohere'], 'cohere.com'],
  [['perplexity'], 'perplexity.ai'],
  [['together'], 'together.ai'],
  [['fireworks'], 'fireworks.ai'],
  [['meta', 'llama'], 'meta.com'],
  [['siliconflow'], 'siliconflow.cn'],
  [['baichuan'], 'baichuan-ai.com'],
  [['minimax'], 'minimaxi.com'],
  [['01wanwu', 'yi-'], '01.ai'],
];

export const getFaviconUrlSync = (pid: string): string => {
  if (!pid) return '';
  const lower = pid.toLowerCase();
  const hit = FAVICON_DOMAINS.find(([keys]) => keys.some((k) => lower.includes(k)));
  const domain = hit ? hit[1] : `${lower}.com`;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};

/** Nội dung user mới nhất (đã bỏ wrapper). */
export const getLatestUserContent = (messages: HistoryMessage[]): string => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return parseUserContent(messages[i].content);
  }
  return '';
};

/** Format toàn bộ conversation để copy vào clipboard. */
export const formatMessagesForCopy = (messages: HistoryMessage[]): string =>
  messages
    .map((msg) => {
      const content =
        msg.role === 'user' ? parseUserContent(msg.content) || msg.content : msg.content;
      return `[${String(msg.role).toUpperCase()}]\n${content}`;
    })
    .join('\n\n')
    .trim();
