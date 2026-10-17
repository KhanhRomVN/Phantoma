/**
 * ------------------------------------------------------------------
 * Conversation Export Utils
 * ------------------------------------------------------------------
 * Helper functions để copy/export conversation ra Markdown hoặc JSON.
 * Dùng cho menu 3 chấm ở ChatHeader.
 * ------------------------------------------------------------------
 */

import type { Message } from '../types/message';

interface ConversationExportInput {
  messages: Message[];
  conversationId?: string | null;
  title?: string;
}

/** Convert messages thành Markdown text. */
export function messagesToMarkdown(input: ConversationExportInput): string {
  const { messages, conversationId, title } = input;
  const lines: string[] = [];

  lines.push(`# ${title || 'Conversation'}`);
  if (conversationId) lines.push(`\n> ID: \`${conversationId}\``);
  lines.push(`\n> Exported at: ${new Date().toISOString()}\n`);
  lines.push('---\n');

  for (const msg of messages) {
    if (msg.uiHidden) continue;
    const roleLabel = msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '🤖 Assistant' : `⚙️ ${msg.role}`;
    lines.push(`## ${roleLabel}\n`);
    lines.push(msg.content || '');
    lines.push('\n---\n');
  }

  return lines.join('\n');
}

/** Convert conversation thành JSON string. */
export function messagesToJson(input: ConversationExportInput): string {
  const { messages, conversationId, title } = input;
  const payload = {
    title: title || 'Conversation',
    conversationId: conversationId || null,
    exportedAt: new Date().toISOString(),
    messages: messages
      .filter((m) => !m.uiHidden)
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        token_usage: m.token_usage,
        usage: m.usage,
        providerId: m.providerId,
        modelId: m.modelId,
      })),
  };
  return JSON.stringify(payload, null, 2);
}

/** Trigger browser download của một JSON string. */
export function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Copy text vào clipboard với fallback execCommand. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}