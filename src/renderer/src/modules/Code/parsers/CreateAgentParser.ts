const VALID_AGENT_TYPES = ['executor', 'planner', 'reviewer'];
const VALID_AGENT_ID = /^[a-z][a-z0-9_]*$/;

const readTag = (raw: string, tag: string): string | undefined => {
  const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : undefined;
};

const readAttr = (raw: string, name: string): string | undefined => {
  const m = raw.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : undefined;
};

const pick = (raw: string, name: string): string | undefined =>
  readTag(raw, name) ?? readAttr(raw, name);

const readJsonParams = (raw: string): Record<string, any> | null => {
  const jsonMatch = raw.match(/```json\s*({[\s\S]*?})\s*```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return parsed.tool === 'create_agent' && parsed.params ? parsed.params : null;
  } catch {
    return null;
  }
};

// Trả về CHỈ params: ResponseParser tự bọc thành { type, params }
export function parseCreateAgent(raw: string): Record<string, any> {
  const jsonParams = readJsonParams(raw);
  const source = (name: string): string | undefined => {
    const v = jsonParams ? jsonParams[name] : pick(raw, name);
    return typeof v === 'string' ? v.trim() : undefined;
  };

  const agent_id = source('agent_id');
  const agent_type = source('agent_type');
  const agent_name = source('agent_name');

  if (!agent_id || !agent_type || !agent_name) {
    return { _validationError: 'Missing required fields: agent_id, agent_type, agent_name' };
  }

  if (!VALID_AGENT_ID.test(agent_id)) {
    return {
      _validationError:
        'agent_id must be snake_case: lowercase letters, digits and underscores, starting with a letter',
    };
  }

  if (!VALID_AGENT_TYPES.includes(agent_type)) {
    return { _validationError: 'agent_type must be executor, planner, or reviewer' };
  }

  return { agent_id, agent_type, agent_name };
}
