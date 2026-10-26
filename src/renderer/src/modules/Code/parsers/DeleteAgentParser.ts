const readTag = (raw: string, tag: string): string | undefined => {
  const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : undefined;
};

const readJsonParams = (raw: string): Record<string, any> | null => {
  const jsonMatch = raw.match(/```json\s*({[\s\S]*?})\s*```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return parsed.tool === 'delete_agent' && parsed.params ? parsed.params : null;
  } catch {
    return null;
  }
};

// Trả về CHỈ params: ResponseParser tự bọc thành { type, params }
export function parseDeleteAgent(raw: string): Record<string, any> {
  const jsonParams = readJsonParams(raw);
  const agent_id = jsonParams
    ? jsonParams.agent_id
    : (readTag(raw, 'agent_id') ?? raw.match(/agent_id="([^"]+)"/)?.[1]);

  if (typeof agent_id !== 'string' || !agent_id.trim()) {
    return { _validationError: 'Missing required field: agent_id' };
  }

  return { agent_id: agent_id.trim() };
}