import type { ToolFormat } from '../types';

export type OrchestratorToolName =
  | 'conversation_title'
  | 'list_agents'
  | 'create_agent'
  | 'delete_agent'
  | 'send_message';

export type ToolParams = Record<string, string | number>;

export const ORCHESTRATOR_TOOLS: OrchestratorToolName[] = [
  'conversation_title',
  'list_agents',
  'create_agent',
  'delete_agent',
  'send_message',
];

/** Sub-agent types the Recon orchestrator may staff. */
export const RECON_AGENT_TYPES = [
  'recon_planner',
  'recon_web',
  'recon_local',
  'recon_verifier',
  'recon_synthesizer',
] as const;

export type ReconAgentType = (typeof RECON_AGENT_TYPES)[number];

export const tick = (text: string): string => '`' + text + '`';

export const callText = (
  name: OrchestratorToolName,
  params: ToolParams,
  format: ToolFormat,
): string => {
  if (format === 'json') return JSON.stringify({ tool: name, params });
  if (Object.keys(params).length === 0) return `<${name} />`;
  if (name === 'conversation_title') return `<conversation_title>${params.title}</conversation_title>`;
  const inner = Object.entries(params)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join('');
  return `<${name}>${inner}</${name}>`;
};

export const fenceCall = (
  name: OrchestratorToolName,
  params: ToolParams,
  format: ToolFormat,
): string => '```' + format + '\n' + callText(name, params, format) + '\n```';

export const fenceMarkdown = (content: string, format: ToolFormat): string =>
  format === 'json'
    ? '```json\n' + JSON.stringify({ type: 'markdown', content }) + '\n```'
    : '```xml\n<markdown>' + content + '</markdown>\n```';

export interface QuestionItem {
  id: string;
  type: 'single' | 'multi' | 'text' | 'confirm';
  label: string;
  options?: string[];
}

export const fenceQuestion = (questions: QuestionItem[], format: ToolFormat): string => {
  if (format === 'json') {
    return '```json\n' + JSON.stringify({ type: 'question', questions }) + '\n```';
  }
  const body = questions
    .map((q) => {
      const head = `<q id="${q.id}" type="${q.type}" label="${q.label.replace(/"/g, '"')}"`;
      if (!q.options || q.options.length === 0) return `  ${head} />`;
      const options = q.options.map((option) => `    <option>${option}</option>`).join('\n');
      return `  ${head}>\n${options}\n  </q>`;
    })
    .join('\n');
  return '```xml\n<question>\n' + body + '\n</question>\n```';
};

interface ToolExample {
  params: ToolParams;
  note: string;
}

interface ToolDef {
  description: string;
  examples: ToolExample[];
}

const TOOL_DEFS: Record<OrchestratorToolName, ToolDef> = {
  conversation_title: {
    description:
      "Set or refresh the conversation title (UI action). Short, specific, in the user's language. Refresh it whenever the task changes.",
    examples: [{ params: { title: 'Short title here' }, note: 'set the title' }],
  },
  list_agents: {
    description:
      'List all recon agents with their type, name, id and status (idle/working/waiting/blocked). Call it before delegating to see who exists and who is free.',
    examples: [{ params: {}, note: 'no parameters' }],
  },
  create_agent: {
    description:
      `Create a recon agent. Required: agent_id (unique snake_case identifier), agent_type (${RECON_AGENT_TYPES.join('|')}) and agent_name (human-readable); nothing else. Choose an agent_id not already in list_agents. The agent only becomes available in a later turn: end the turn right after this call, then confirm with list_agents before send_message.`,
    examples: [
      {
        params: {
          agent_id: 'web_scout_1',
          agent_type: 'recon_web',
          agent_name: 'Web Scout #1',
        },
        note: 'create a web-collector agent',
      },
      {
        params: {
          agent_id: 'local_ops_1',
          agent_type: 'recon_local',
          agent_name: 'Local Operator #1',
        },
        note: 'create a local-terminal agent',
      },
    ],
  },
  delete_agent: {
    description:
      'Delete a sub-agent by agent_id (the id shown by list_agents). Its pending work is cancelled and its reply will not arrive. The orchestrator cannot be deleted. Required: agent_id.',
    examples: [
      { params: { agent_id: 'web_scout_1' }, note: "delete the agent with id 'web_scout_1'" },
    ],
  },
  send_message: {
    description:
      'Send a message to one agent by agent_id. Required: agent_id and message. The message follows the Message format in WORKFLOW and is self-contained: the agent cannot see your context or your tool results. The agent\'s reply arrives later as an incoming message; never predict it.',
    examples: [
      {
        params: {
          agent_id: 'recon_planner',
          message:
            'TYPE: TASK\nGOAL: plan OSINT collection for domain example.com.\nCONTEXT: focus on public records, WHOIS, subdomains, social profiles; verifier will cross-check.\nINPUT: none\nEXPECTED OUTPUT: a PLAN.',
        },
        note: 'send a planning task',
      },
      {
        params: {
          agent_id: 'web_scout_1',
          message:
            'TYPE: TASK\nGOAL: collect the WHOIS contact page at https://whois.example.com/example.com.\nCONTEXT: read-only; capture emails, phone numbers, registrar, dates; do NOT fill any form.\nINPUT: none\nEXPECTED OUTPUT: a RESULT with the extracted fields.',
        },
        note: 'send a collection task',
      },
    ],
  },
};

const renderToolDocs = (format: ToolFormat): string =>
  ORCHESTRATOR_TOOLS.map((tool) => {
    const def = TOOL_DEFS[tool];
    const examples = def.examples
      .map(
        (example) =>
          `  - ${tick(callText(tool, example.params, format))} — ${example.note}`,
      )
      .join('\n');
    return `**${tool}**: ${def.description}\n${examples}`;
  }).join('\n');

const jsonNote =
  'JSON-STRINGS: escape every newline as backslash + n, every double quote as backslash + double quote and every backslash as two backslashes. Never use HTML entities. One object per fenced json block.';

const uiDocs = (format: ToolFormat): string =>
  format === 'json'
    ? 'UI objects (not tools): ' +
      tick('{"type":"markdown","content":"..."}') +
      ' for your reply to the user, and ' +
      tick('{"type":"question","questions":[...]}') +
      ' to ask the user.'
    : 'UI tags (not tools): ' +
      tick('<markdown>reply to the user</markdown>') +
      ' for your reply to the user, and ' +
      tick('<question>...</question>') +
      ' to ask the user.';

const questionDocs = (format: ToolFormat): string => {
  const confirm = fenceQuestion(
    [
      {
        id: '1',
        type: 'confirm',
        label:
          'Local Operator needs to run `whois example.com` which contacts a public WHOIS server. Proceed?',
      },
    ],
    format,
  );
  const single = fenceQuestion(
    [
      {
        id: '1',
        type: 'single',
        label: 'Which collection approach should the planner use?',
        options: [
          'Passive OSINT only (recommended — public records, WHOIS, cached pages; lowest legal risk)',
          'Active probing (DNS enumeration, port scan; more data but touches the target directly)',
        ],
      },
    ],
    format,
  );
  return [
    '## question — ask the user',
    'Put every open question in ONE question block. Inner types: single (pick one, ≥2 options), multi (pick several, ≥2 options), text (free answer, no options), confirm (yes/no, no options). Every inner question needs id, type and label.',
    'PRIORITIZE-AND-CONFIRM: form your own recommendation before asking. One clearly best path → a confirm whose label states the proposal and the reason. Real trade-offs → single with the best option FIRST, marked (recommended — reason).',
    'If the user answers only some of the questions, re-ask only the unanswered ones.',
    confirm,
    single,
  ].join('\n\n');
};

export const buildOrchestratorToolsReference = (
  toolFormat: ToolFormat = 'xml',
): string => {
  const how =
    toolFormat === 'json'
      ? 'Every tool call is one JSON object in its own fenced json block: ' +
        tick('{"tool":"<name>","params":{...}}') +
        '.'
      : 'Every tool call is one XML tag, for example ' + tick('<list_agents />') + '.';
  return [
    toolFormat === 'json' ? '# TOOLS (JSON FORMAT)' : '# TOOLS',
    'The orchestrator coordinates the OSINT reconnaissance workflow. It has NO browser, terminal or file tools: it sets the conversation title, manages recon sub-agents, sends them messages and asks the user through the question UI.',
    how,
    toolFormat === 'json' ? jsonNote : '',
    renderToolDocs(toolFormat),
    uiDocs(toolFormat),
    questionDocs(toolFormat),
  ]
    .filter((part) => part.length > 0)
    .join('\n\n');
};