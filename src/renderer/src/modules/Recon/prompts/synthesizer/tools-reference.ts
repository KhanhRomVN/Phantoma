import type { ToolFormat } from '../types';
import { RECON_FORMAT_GUIDE } from '../recon-format';

export type SynthesizerToolName =
  | 'read_file'
  | 'list_files'
  | 'create_file'
  | 'update_file'
  | 'send_message';

export const SYNTHESIZER_TOOLS: SynthesizerToolName[] = [
  'read_file',
  'list_files',
  'create_file',
  'update_file',
  'send_message',
];

const tick = (text: string): string => '`' + text + '`';

const callText = (
  name: SynthesizerToolName,
  params: Record<string, string>,
  format: ToolFormat,
): string => {
  if (format === 'json') return JSON.stringify({ tool: name, params });
  if (Object.keys(params).length === 0) return `<${name} />`;
  const inner = Object.entries(params).map(([k, v]) => `<${k}>${v}</${k}>`).join('');
  return `<${name}>${inner}</${name}>`;
};

interface ToolDef {
  description: string;
  examples: { params: Record<string, string>; note: string }[];
}

const TOOL_DEFS: Record<SynthesizerToolName, ToolDef> = {
  read_file: {
    description: 'Read a .recon file before updating it. Read the whole file when it is small.',
    examples: [{ params: { file_path: '_index.recon' }, note: 'read the index before updating it' }],
  },
  list_files: {
    description:
      'List files and folders under a path (relative to the recon workspace root). Each file entry includes its line count.',
    examples: [{ params: {}, note: 'list the workspace root' }],
  },
  create_file: {
    description:
      'Create a NEW .recon file with full content. Use only for files that do not exist yet. The content must be a complete file starting with the frontmatter block.',
    examples: [
      {
        params: {
          file_path: '_timeline.recon',
          content:
            '---\nrecon: 1.0\ntype: tab\ntitle: Timeline\n---\n\n# Mốc thời gian\n@box w=5 maxh=8 ui=timeline icon=History desc="Hai sự kiện"\n\n- 2026-10-01 | Bắt đầu thu thập dữ liệu\n- 2026-10-12 | Hoàn tất đợt thu thập đầu tiên\n',
        },
        note: 'create a new timeline tab',
      },
    ],
  },
  update_file: {
    description:
      'Replace one exact snippet of an existing .recon file. read_file it first; copy old_content byte-for-byte.',
    examples: [
      {
        params: {
          file_path: '_kv.recon',
          old_content: 'Mức ưu tiên: Cao [enum] {tone=danger}',
          new_content: 'Mức ưu tiên: Trung bình [enum] {tone=warn}',
        },
        note: 'patch one KV line',
      },
    ],
  },
  send_message: {
    description:
      'Reply to the orchestrator. Required: agent_id (always "orchestrator") and message (a self-contained TYPE: RESULT|QUESTION with STATUS and BODY).',
    examples: [
      {
        params: {
          agent_id: 'orchestrator',
          message:
            'TYPE: RESULT\nSTATUS: OK\nBODY:\nFILES:\n- _index.recon — index for example.com\n- _kv.recon — registrar, dates, nameservers\nVERIFIED RECORDED: 5 fields\nUNVERIFIED RECORDED: 1 field (registrant_email)\nSKIPPED: none',
        },
        note: 'send the RESULT back',
      },
    ],
  },
};

export const buildSynthesizerToolsReference = (toolFormat: ToolFormat = 'xml'): string => {
  const how =
    toolFormat === 'json'
      ? 'Every tool call is one JSON object in its own fenced json block: ' +
        tick('{"tool":"<name>","params":{...}}') +
        '.'
      : 'Every tool call is one XML tag, for example ' + tick('<list_files />') + '.';
  const docs = SYNTHESIZER_TOOLS.map((tool) => {
    const def = TOOL_DEFS[tool];
    const examples = def.examples
      .map((e) => `  - ${tick(callText(tool, e.params, toolFormat))} — ${e.note}`)
      .join('\n');
    return `**${tool}**: ${def.description}\n${examples}`;
  }).join('\n');
  const jsonNote =
    'JSON-STRINGS: escape every newline as backslash + n and every double quote as backslash + double quote. One object per fenced json block. .recon content is multi-line: every real newline in the file becomes \\n in the JSON string.';
  return [
    toolFormat === 'json' ? '# TOOLS (JSON FORMAT)' : '# TOOLS',
    'The synthesizer writes .recon files. It has workspace file tools (read_file, list_files, create_file, update_file) plus send_message. It has NO browser, terminal or delete_file tools.',
    how,
    toolFormat === 'json' ? jsonNote : '',
    docs,
    RECON_FORMAT_GUIDE,
  ].join('\n\n');
};