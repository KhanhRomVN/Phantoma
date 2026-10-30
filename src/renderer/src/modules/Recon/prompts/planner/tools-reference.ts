import type { ToolFormat } from '../types';

export type PlannerToolName = 'read_file' | 'list_files' | 'send_message';

export const PLANNER_TOOLS: PlannerToolName[] = ['read_file', 'list_files', 'send_message'];

const tick = (text: string): string => '`' + text + '`';

const callText = (name: PlannerToolName, params: Record<string, string>, format: ToolFormat): string => {
  if (format === 'json') return JSON.stringify({ tool: name, params });
  if (Object.keys(params).length === 0) return `<${name} />`;
  const inner = Object.entries(params).map(([k, v]) => `<${k}>${v}</${k}>`).join('');
  return `<${name}>${inner}</${name}>`;
};

interface ToolDef {
  description: string;
  examples: { params: Record<string, string>; note: string }[];
}

const TOOL_DEFS: Record<PlannerToolName, ToolDef> = {
  read_file: {
    description:
      'Read a file from the recon workspace. Use it to inspect prior .recon files before planning.',
    examples: [
      { params: { file_path: '_index.recon' }, note: 'read the index file' },
      { params: { file_path: '_kv.recon' }, note: 'read a tab file' },
    ],
  },
  list_files: {
    description:
      'List files and folders under a path (relative to the recon workspace root). Each file entry includes its line count.',
    examples: [
      { params: {}, note: 'list the workspace root' },
      { params: { folder_path: 'files', depth: 'max' }, note: 'list the files/ subtree' },
    ],
  },
  send_message: {
    description:
      'Reply to the orchestrator. Required: agent_id (always "orchestrator") and message (a self-contained TYPE: PLAN|QUESTION with STATUS and BODY).',
    examples: [
      {
        params: {
          agent_id: 'orchestrator',
          message: 'TYPE: PLAN\nSTATUS: OK\nBODY:\nTARGET: ...\nSCOPE: ...',
        },
        note: 'send the plan back to the orchestrator',
      },
    ],
  },
};

export const buildPlannerToolsReference = (toolFormat: ToolFormat = 'xml'): string => {
  const how =
    toolFormat === 'json'
      ? 'Every tool call is one JSON object in its own fenced json block: ' +
        tick('{"tool":"<name>","params":{...}}') +
        '.'
      : 'Every tool call is one XML tag, for example ' + tick('<list_files />') + '.';
  const docs = PLANNER_TOOLS.map((tool) => {
    const def = TOOL_DEFS[tool];
    const examples = def.examples
      .map((e) => `  - ${tick(callText(tool, e.params, toolFormat))} — ${e.note}`)
      .join('\n');
    return `**${tool}**: ${def.description}\n${examples}`;
  }).join('\n');
  const jsonNote =
    'JSON-STRINGS: escape every newline as backslash + n and every double quote as backslash + double quote. One object per fenced json block.';
  const uiNote =
    toolFormat === 'json'
      ? 'UI objects (not tools): ' +
        tick('{"type":"markdown","content":"..."}') +
        ' for your reply, ' +
        tick('{"type":"question","questions":[...]}') +
        ' to ask the orchestrator a clarifying question (rare — prefer send_message TYPE: QUESTION).'
      : 'UI tags (not tools): ' +
        tick('<markdown>reply</markdown>') +
        ' and ' +
        tick('<question>...</question>') +
        ' (rare — prefer send_message TYPE: QUESTION).';
  return [
    toolFormat === 'json' ? '# TOOLS (JSON FORMAT)' : '# TOOLS',
    'The planner has read-only workspace tools (read_file, list_files) and one messaging tool (send_message to the orchestrator). It has NO browser, terminal, create_file or update_file tools.',
    how,
    toolFormat === 'json' ? jsonNote : '',
    docs,
    uiNote,
  ]
    .filter((part) => part.length > 0)
    .join('\n\n');
};