import type { ToolFormat } from '../types';

export type VerifierToolName = 'read_file' | 'list_files' | 'send_message';

export const VERIFIER_TOOLS: VerifierToolName[] = ['read_file', 'list_files', 'send_message'];

const tick = (text: string): string => '`' + text + '`';

const callText = (name: VerifierToolName, params: Record<string, string>, format: ToolFormat): string => {
  if (format === 'json') return JSON.stringify({ tool: name, params });
  if (Object.keys(params).length === 0) return `<${name} />`;
  const inner = Object.entries(params).map(([k, v]) => `<${k}>${v}</${k}>`).join('');
  return `<${name}>${inner}</${name}>`;
};

interface ToolDef {
  description: string;
  examples: { params: Record<string, string>; note: string }[];
}

const TOOL_DEFS: Record<VerifierToolName, ToolDef> = {
  read_file: {
    description:
      'Read an existing .recon file from the workspace to compare new findings against previously recorded data.',
    examples: [
      { params: { file_path: '_kv.recon' }, note: 'read the kv tab before cross-checking' },
    ],
  },
  list_files: {
    description:
      'List files under a path (relative to the recon workspace root). Each file entry includes its line count.',
    examples: [{ params: {}, note: 'list the workspace root' }],
  },
  send_message: {
    description:
      'Reply to the orchestrator. Required: agent_id (always "orchestrator") and message (a self-contained TYPE: REVIEW|QUESTION with STATUS and BODY).',
    examples: [
      {
        params: {
          agent_id: 'orchestrator',
          message: 'TYPE: REVIEW\nSTATUS: OK\nBODY:\nVERIFIED:\n- email = a@example.com — [S-001, S-002]\n...',
        },
        note: 'send the REVIEW back',
      },
    ],
  },
};

export const buildVerifierToolsReference = (toolFormat: ToolFormat = 'xml'): string => {
  const how =
    toolFormat === 'json'
      ? 'Every tool call is one JSON object in its own fenced json block: ' +
        tick('{"tool":"<name>","params":{...}}') +
        '.'
      : 'Every tool call is one XML tag, for example ' + tick('<list_files />') + '.';
  const docs = VERIFIER_TOOLS.map((tool) => {
    const def = TOOL_DEFS[tool];
    const examples = def.examples
      .map((e) => `  - ${tick(callText(tool, e.params, toolFormat))} — ${e.note}`)
      .join('\n');
    return `**${tool}**: ${def.description}\n${examples}`;
  }).join('\n');
  return [
    toolFormat === 'json' ? '# TOOLS (JSON FORMAT)' : '# TOOLS',
    'The verifier has only read-only workspace tools (read_file, list_files) plus send_message. It has NO browser, terminal or write tools: verification is done on the orchestrator-supplied results and prior .recon files.',
    how,
    docs,
  ].join('\n\n');
};