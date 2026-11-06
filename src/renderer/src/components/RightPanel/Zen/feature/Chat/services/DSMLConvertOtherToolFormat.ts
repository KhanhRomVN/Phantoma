import { getAllToolTypes } from '../constants/tag-registry';
import type { ToolCallSpec, ToolFormatId } from './tool-format-parsers';

export type DeepseekToolFormat = ToolFormatId;

export interface ProcessDeepseekContentResult {
  content: string;
  convertedToolCount: number;
}

const BAR = '[｜|]{1,2}';
const OPEN = `<${BAR}DSML${BAR}`;
const CLOSE = `</${BAR}DSML${BAR}`;

// Debug log - có thể xóa sau khi fix
const dbg = (...args: unknown[]): void => {
  console.log('[DEBUG][DSML]', ...args);
};

const preview = (s: string, max = 200): string =>
  s.length > max ? `${s.slice(0, max)}…(+${s.length - max} chars)` : s;

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

  dbg('parseInvoke:start', {
    invokeName,
    resolvedName: name,
    validTool: isValidTool(name),
    wrapperUsed: !!wrapper,
    bodyPreview: preview(body),
  });

  const params: Record<string, unknown> = {};
  for (const m of body.matchAll(PARAM_RE)) {
    const paramName = m[1];
    const isString = m[2];
    const raw = m[3];

    let value: unknown = raw;
    if (isString !== 'true') {
      try {
        value = JSON.parse(raw.trim());
      } catch (err) {
        if (isString === 'false') {
          dbg('parseInvoke:FAIL JSON.parse lỗi với string="false"', {
            tool: name,
            paramName,
            rawPreview: preview(raw),
            error: String(err),
          });
          return null;
        }
        value = raw;
      }
    }

    if (paramName === 'params' && isString === 'false') {
      if (value === false || value === null) continue;
      if (!isPlainObject(value)) {
        dbg('parseInvoke:FAIL param "params" không phải object', {
          tool: name,
          valueType: Array.isArray(value) ? 'array' : typeof value,
          rawPreview: preview(raw),
        });
        return null;
      }
      Object.assign(params, value);
    } else {
      params[paramName] = value;
    }
  }

  const leftover = body.replace(PARAM_RE, '');
  if (!isOnlyWhitespace(leftover)) {
    dbg('parseInvoke:FAIL còn nội dung thừa ngoài các parameter', {
      tool: name,
      leftoverPreview: preview(leftover),
    });
    return null;
  }

  if (isValidTool(name)) return { tool: name, params };

  const { tool: toolParam, ...rest } = params;
  if (typeof toolParam === 'string' && isValidTool(toolParam)) {
    return { tool: toolParam, params: rest };
  }
  dbg('parseInvoke:FAIL tên tool không hợp lệ', {
    invokeName,
    resolvedName: name,
    toolParam,
    paramKeys: Object.keys(params),
  });
  return null;
};

const parseCallsBlock = (body: string): ToolCallSpec[] | null => {
  const calls: ToolCallSpec[] = [];
  for (const m of body.matchAll(INVOKE_RE)) {
    const call = parseInvoke(m[1], m[2]);
    if (!call) {
      dbg('parseCallsBlock:FAIL invoke không parse được', {
        invokeName: m[1],
        invokeBodyPreview: preview(m[2]),
      });
      return null;
    }
    calls.push(call);
  }
  if (calls.length === 0) {
    dbg('parseCallsBlock:FAIL không match được invoke nào (INVOKE_RE)', {
      bodyPreview: preview(body),
    });
    return null;
  }
  const leftover = body.replace(INVOKE_RE, '');
  if (!isOnlyWhitespace(leftover)) {
    dbg('parseCallsBlock:FAIL còn nội dung thừa ngoài các invoke', {
      leftoverPreview: preview(leftover),
    });
    return null;
  }
  return calls;
};

const stringifyParam = (v: unknown): string => (typeof v === 'string' ? v : JSON.stringify(v));

const toXml = (call: ToolCallSpec): string => {
  const { tool, params } = call;
  if (tool === 'conversation_title') {
    return `<conversation_title>${stringifyParam(params.title ?? '')}</conversation_title>`;
  }
  if (tool === 'read_skill') {
    return `<read_skill>${stringifyParam(params.skill_id ?? '')}</read_skill>`;
  }
  const inner = Object.entries(params)
    .map(([k, v]) => `<${k}>${stringifyParam(v)}</${k}>`)
    .join('');
  return `<${tool}>${inner}</${tool}>`;
};

const toJson = (call: ToolCallSpec): string =>
  '```json\n' + JSON.stringify({ tool: call.tool, params: call.params }) + '\n```';

export const hasDeepseekDSML = (content: string): boolean =>
  new RegExp(`${OPEN}\\s+calls\\s*>`).test(content);

export const processDeepseekContent = (
  content: string,
  toolFormat: DeepseekToolFormat = 'xml',
): ProcessDeepseekContentResult => {
  if (!hasDeepseekDSML(content)) {
    return { content, convertedToolCount: 0 };
  }

  dbg('processDeepseekContent:start', { toolFormat, contentLength: content.length });

  let convertedToolCount = 0;
  let blockCount = 0;
  const converted = content.replace(CALLS_RE, (whole, body: string) => {
    blockCount++;
    const calls = parseCallsBlock(body);
    if (!calls) {
      dbg('processDeepseekContent:FAIL giữ nguyên block DSML do parse lỗi', {
        blockIndex: blockCount,
        blockPreview: preview(whole, 400),
      });
      return whole;
    }
    convertedToolCount += calls.length;
    return calls.map((c) => (toolFormat === 'json' ? toJson(c) : toXml(c))).join('\n');
  });

  if (blockCount === 0) {
    dbg('processDeepseekContent:FAIL có mở thẻ calls nhưng CALLS_RE không match block đóng (thiếu thẻ đóng?)', {
      contentTail: preview(content.slice(-300), 300),
    });
  }
  dbg('processDeepseekContent:done', { blockCount, convertedToolCount });

  return { content: converted, convertedToolCount };
};