import type { ToolFormat } from '../types';

export type LocalOperatorToolName =
  | 'run_command'
  | 'read_file'
  | 'list_files'
  | 'create_file'
  | 'update_file'
  | 'send_message';

export const LOCAL_OPERATOR_TOOLS: LocalOperatorToolName[] = [
  'run_command',
  'read_file',
  'list_files',
  'create_file',
  'update_file',
  'send_message',
];

const tick = (text: string): string => '`' + text + '`';

const callText = (
  name: LocalOperatorToolName,
  params: Record<string, string | number>,
  format: ToolFormat,
): string => {
  if (format === 'json') return JSON.stringify({ tool: name, params });
  if (Object.keys(params).length === 0) return `<${name} />`;
  const inner = Object.entries(params).map(([k, v]) => `<${k}>${v}</${k}>`).join('');
  return `<${name}>${inner}</${name}>`;
};

interface ToolDef {
  description: string;
  examples: { params: Record<string, string | number>; note: string }[];
}

const TOOL_DEFS: Record<LocalOperatorToolName, ToolDef> = {
  run_command: {
    description:
      'Run a shell command in the workspace PTY and return its stdout/stderr. Blocked patterns: sudo/su/doas, rm -rf /, dd to /dev, curl|bash, wget|bash, mkfs, fork bomb. Use folder_path to run in a sub-folder.',
    examples: [
      { params: { command: 'whois example.com' }, note: 'run whois' },
      { params: { command: 'dig +short NS example.com' }, note: 'query nameservers' },
      {
        params: { command: 'node files/scripts/recon-parse.js < input.json' },
        note: 'run a throwaway script',
      },
    ],
  },
  read_file: {
    description: 'Read a file from the recon workspace (e.g. a script you just created).',
    examples: [
      { params: { file_path: 'files/scripts/recon-parse.js' }, note: 'read the script' },
    ],
  },
  list_files: {
    description:
      'List files and folders under a path (relative to the recon workspace root). Each file entry includes its line count.',
    examples: [
      { params: { folder_path: 'files/scripts' }, note: 'list throwaway scripts' },
    ],
  },
  create_file: {
    description:
      'Create a NEW throwaway script under files/scripts/. Never create or overwrite a .recon file — the synthesizer owns those.',
    examples: [
      {
        params: {
          file_path: 'files/scripts/recon-parse-whois.js',
          content: 'const fs=require("fs");const t=fs.readFileSync(0,"utf8");console.log(t.match(/Registrar: (.+)/)?.[1]||"");',
        },
        note: 'create a one-off parser',
      },
    ],
  },
  update_file: {
    description:
      'Replace one exact snippet of an existing throwaway script. Never touch a .recon file.',
    examples: [
      {
        params: {
          file_path: 'files/scripts/recon-parse-whois.js',
          old_content: 'console.log(t.match(/Registrar: (.+)/)?.[1]||"");',
          new_content: 'console.log(JSON.stringify({registrar:t.match(/Registrar: (.+)/)?.[1]||""}));',
        },
        note: 'patch the script',
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
          message: 'TYPE: RESULT\nSTATUS: OK\nBODY:\nCOMMANDS RUN:\n- whois example.com\nOUTPUT:\n```\nRegistrar: NameCheap Inc.\n```',
        },
        note: 'send the RESULT back',
      },
    ],
  },
};

export const buildLocalOperatorToolsReference = (toolFormat: ToolFormat = 'xml'): string => {
  const how =
    toolFormat === 'json'
      ? 'Every tool call is one JSON object in its own fenced json block: ' +
        tick('{"tool":"<name>","params":{...}}') +
        '.'
      : 'Every tool call is one XML tag, for example ' + tick('<run_command>...</run_command>') + '.';
  const docs = LOCAL_OPERATOR_TOOLS.map((tool) => {
    const def = TOOL_DEFS[tool];
    const examples = def.examples
      .map((e) => `  - ${tick(callText(tool, e.params, toolFormat))} — ${e.note}`)
      .join('\n');
    return `**${tool}**: ${def.description}\n${examples}`;
  }).join('\n');
  const jsonNote =
    'JSON-STRINGS: escape every newline as backslash + n and every double quote as backslash + double quote. One object per fenced json block.';
  return [
    toolFormat === 'json' ? '# TOOLS (JSON FORMAT)' : '# TOOLS',
    'The local operator has the terminal (run_command) plus minimal file tools to create and inspect throwaway scripts. It has NO browser tools and NO .recon writing responsibility.',
    how,
    toolFormat === 'json' ? jsonNote : '',
    docs,
  ].join('\n\n');
};