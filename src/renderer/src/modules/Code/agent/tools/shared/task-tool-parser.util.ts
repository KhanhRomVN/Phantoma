export interface ToolParamSpec {
  required: string[];
  optional?: string[];
  verbatim?: string[];
}

const readTag = (raw: string, tag: string, verbatim: boolean): string | undefined => {
  const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!m) return undefined;
  return verbatim ? m[1] : m[1].trim();
};

const readAttr = (raw: string, name: string): string | undefined => {
  const m = raw.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : undefined;
};

const readJsonParams = (raw: string, tool: string): Record<string, any> | null => {
  const jsonMatch = raw.match(/```json\s*({[\s\S]*?})\s*```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return parsed.tool === tool && parsed.params ? parsed.params : null;
  } catch {
    return null;
  }
};

export const createToolParser = (tool: string, spec: ToolParamSpec) => {
  const optional = spec.optional ?? [];
  const verbatim = spec.verbatim ?? [];

  return (raw: string): Record<string, any> => {
    const jsonParams = readJsonParams(raw, tool);
    const read = (name: string): string | undefined => {
      const isVerbatim = verbatim.includes(name);
      const value = jsonParams
        ? jsonParams[name]
        : (readTag(raw, name, isVerbatim) ?? (isVerbatim ? undefined : readAttr(raw, name)));
      if (typeof value === 'number') return String(value);
      if (typeof value !== 'string') return undefined;
      return isVerbatim ? value : value.trim();
    };

    const params: Record<string, string> = {};
    for (const name of [...spec.required, ...optional]) {
      const value = read(name);
      if (value !== undefined) params[name] = value;
    }

    const missing = spec.required.filter(
      (name) => params[name] === undefined || (params[name] === '' && name !== 'new_content'),
    );
    if (missing.length > 0) {
      return { _validationError: `Missing required fields: ${missing.join(', ')}` };
    }
    return params;
  };
};