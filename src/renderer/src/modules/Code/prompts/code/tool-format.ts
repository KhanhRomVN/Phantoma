export type ToolFormat = 'xml' | 'json';

export const DEFAULT_TOOL_FORMAT = 'json' as const;

export type CallParams = Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────────────────────────────────────────

export const tick = (text: string): string => '`' + text + '`';

// ─────────────────────────────────────────────────────────────────────────────
// XML
// ─────────────────────────────────────────────────────────────────────────────

/** `<tool><k>v</k></tool>`; không có tham số → `<tool />`. */
export const xmlCall = (tool: string, params: CallParams = {}): string => {
  const entries = Object.entries(params);
  if (entries.length === 0) return `<${tool} />`;
  const body = entries.map(([k, v]) => `<${k}>${v}</${k}>`).join('');
  return `<${tool}>${body}</${tool}>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// JSON
// ─────────────────────────────────────────────────────────────────────────────

/** `{"tool":"x","params":{...}}` trên một dòng. */
export const jsonCall = (tool: string, params: CallParams = {}): string =>
  `{"tool":${JSON.stringify(tool)},"params":${JSON.stringify(params)}}`;

const ENCODERS: Record<ToolFormat, (tool: string, params?: CallParams) => string> = {
  xml: xmlCall,
  json: jsonCall,
};

export const encodeCall = (format: ToolFormat, tool: string, params: CallParams = {}): string =>
  ENCODERS[format](tool, params);

export interface QuestionRefs {
  question: string;
  confirm: string;
}

const QUESTION_REFS_XML: QuestionRefs = {
  question: 'a <question>',
  confirm: 'a <question type="confirm">',
};

const QUESTION_REFS_JSON: QuestionRefs = {
  question: 'a question object',
  confirm: 'a question object with {"type":"confirm"}',
};

const QUESTION_REFS: Record<ToolFormat, QuestionRefs> = {
  xml: QUESTION_REFS_XML,
  json: QUESTION_REFS_JSON,
};

export const getQuestionRefs = (format: ToolFormat): QuestionRefs => QUESTION_REFS[format];