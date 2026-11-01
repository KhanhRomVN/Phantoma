import { getAllToolTypes } from '../../constants/tag-registry';
import { callToXml } from './XMLFormat';
import type {
  ForeignConversion,
  ToolCallSerializer,
  ToolCallSpec,
  ToolFormatDefinition,
} from './types';

const BAR = '[｜|]{1,2}';
const OPEN = `<${BAR}DSML${BAR}`;
const CLOSE = `</${BAR}DSML${BAR}`;

const CALLS_RE = new RegExp(`${OPEN}\\s+calls\\s*>([\\s\\S]*?)${CLOSE}\\s+calls\\s*>`, 'g');
const INVOKE_RE = new RegExp(
  `${OPEN}\\s+invoke\\s+name="([^"]+)"\\s*>([\\s\\S]*?)${CLOSE}\\s+invoke\\s*>`,
  'g',
);
const PARAM_OPEN = `<(?:${BAR}DSML${BAR}\\s+)?`;
const PARAM_CLOSE = `</(?:${BAR}DSML${BAR}\\s+)?`;
const PARAM_RE = new RegExp(
  `${PARAM_OPEN}parameter\\s+name="([^"]+)"(?:\\s+string="(true|false)")?\\s*>([\\s\\S]*?)${PARAM_CLOSE}parameter\\s*>`,
  'g',
);

const isValidTool = (name: string): boolean => getAllToolTypes().includes(name);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isOnlyWhitespace = (s: string): boolean => s.trim().length === 0;

const WRAPPER_RE = new RegExp(
  `^\\s*${PARAM_OPEN}parameter\\s+name="([^"]+)"\\s*>(?=\\s*${PARAM_OPEN}parameter\\s)`,
);

const MALFORMED_WRAPPER_RE = new RegExp(
  `^\\s*${PARAM_OPEN}parameter\\s+name="([^"<\\s]+)${PARAM_CLOSE}parameter\\s*>`,
);

const parseInvoke = (invokeName: string, invokeBody: string): ToolCallSpec | null => {
  let name = invokeName;
  let body = invokeBody;
  const wrapper = isValidTool(name)
    ? null
    : (body.match(WRAPPER_RE) ?? body.match(MALFORMED_WRAPPER_RE));
  if (wrapper && isValidTool(wrapper[1])) {
    name = wrapper[1];
    body = body.slice(wrapper[0].length);
  }

  const params: Record<string, unknown> = {};
  for (const m of body.matchAll(PARAM_RE)) {
    const paramName = m[1];
    const isString = m[2];
    const raw = m[3];

    let value: unknown = raw;
    if (isString !== 'true') {
      try {
        value = JSON.parse(raw.trim());
      } catch {
        if (isString === 'false') return null;
        value = raw;
      }
    }

    if (paramName === 'params' && isString === 'false') {
      if (value === false || value === null) continue;
      if (!isPlainObject(value)) return null;
      Object.assign(params, value);
    } else {
      params[paramName] = value;
    }
  }

  if (!isOnlyWhitespace(body.replace(PARAM_RE, ''))) return null;

  if (isValidTool(name)) return { tool: name, params };

  const { tool: toolParam, ...rest } = params;
  if (typeof toolParam === 'string' && isValidTool(toolParam)) {
    return { tool: toolParam, params: rest };
  }
  return null;
};

const parseCallsBlock = (body: string): ToolCallSpec[] | null => {
  const calls: ToolCallSpec[] = [];
  for (const m of body.matchAll(INVOKE_RE)) {
    const call = parseInvoke(m[1], m[2]);
    if (!call) return null;
    calls.push(call);
  }
  if (calls.length === 0) return null;
  if (!isOnlyWhitespace(body.replace(INVOKE_RE, ''))) return null;
  return calls;
};

const hasDsml = (content: string): boolean => new RegExp(`${OPEN}\\s+calls\\s*>`).test(content);

const convertDsml = (content: string, serialize: ToolCallSerializer): ForeignConversion => {
  if (!hasDsml(content)) {
    return { content, convertedToolCount: 0 };
  }

  let convertedToolCount = 0;
  const converted = content.replace(CALLS_RE, (whole, body: string) => {
    const calls = parseCallsBlock(body);
    if (!calls) return whole;
    convertedToolCount += calls.length;
    return calls.map(serialize).join('\n');
  });

  return { content: converted, convertedToolCount };
};

export const dsmlFormat: ToolFormatDefinition = {
  id: 'dsml',
  label: 'DSML',
  description: 'AI uses a DSML calls block for tool calls',
  colorVar: '--purple',
  normalize: (content) => convertDsml(content, callToXml).content,
  detectForeign: hasDsml,
  convertForeign: convertDsml,
  foreignNotice: `# DEEPSEEK DSML NOTICE\nYour previous response used DSML tags (<｜DSML｜calls>, <｜DSML｜invoke>, <｜DSML｜parameter>). DSML is NOT a supported tool-call syntax. Never use it. Use only the tool call format below.`,
};
