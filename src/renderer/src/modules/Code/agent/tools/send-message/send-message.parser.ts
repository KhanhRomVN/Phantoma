/**
 * ------------------------------------------------------------------
 * Send Message Parser
 * ------------------------------------------------------------------
 * Parse params của tool send_message từ khối JSON, thẻ XML hoặc attribute.
 *
 * Main functions:
 * - parseSendMessage() : Trích xuất và validate agent_id, message
 * ------------------------------------------------------------------
 */

// ─── Functions ───────────────────────────────────────────────────────────────
const readTag = (raw: string, tag: string): string | undefined => {
  const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : undefined;
};

const readJsonParams = (raw: string): Record<string, any> | null => {
  const jsonMatch = raw.match(/```json\s*({[\s\S]*?})\s*```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return parsed.tool === 'send_message' && parsed.params ? parsed.params : null;
  } catch (error) {
    console.warn(
      `[DEBUG][SendMessage][Parser] JSON.parse failed: ${error instanceof Error ? error.message : String(error)} jsonPreview=${JSON.stringify(jsonMatch[1].slice(0, 300))}`,
    );
    return null;
  }
};

// Trả về CHỈ params: ResponseParser tự bọc thành { type, params }
export function parseSendMessage(raw: string): Record<string, any> {
  const jsonParams = readJsonParams(raw);

  const agent_id = jsonParams
    ? jsonParams.agent_id
    : (readTag(raw, 'agent_id') ?? raw.match(/agent_id="([^"]+)"/)?.[1]);
  const message = jsonParams
    ? jsonParams.message
    : (readTag(raw, 'message') ??
      raw.match(/<send_message[^>]*>([\s\S]*?)<\/send_message>/)?.[1]?.trim());

  if (typeof agent_id !== 'string' || typeof message !== 'string' || !agent_id || !message) {
    console.warn(
      `[DEBUG][SendMessage][Parser] validation failed: jsonParams=${!!jsonParams} agent_idType=${typeof agent_id} messageType=${typeof message} rawPreview=${JSON.stringify(raw.slice(0, 300))}`,
    );
    return { _validationError: 'Missing required fields: agent_id, message' };
  }

  return { agent_id: agent_id.trim(), message };
}
