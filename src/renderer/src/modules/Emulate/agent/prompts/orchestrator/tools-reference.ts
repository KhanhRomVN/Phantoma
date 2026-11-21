import type { ToolFormat } from './types';

export type OrchestratorToolName =
  | 'conversation_title'
  | 'list_agents'
  | 'create_agent'
  | 'delete_agent'
  | 'send_message'
  | 'list_reports'
  | 'create_report'
  | 'read_report'
  | 'update_report';

export type ToolParams = Record<string, string | number>;

export const ORCHESTRATOR_TOOLS: OrchestratorToolName[] = [
  'conversation_title',
  'list_agents',
  'create_agent',
  'delete_agent',
  'send_message',
  'list_reports',
  'create_report',
  'read_report',
  'update_report',
];

/** Sub-agent types the Emulate orchestrator may staff. */
export const EMULATE_AGENT_TYPES = [
  'emulate_planner',
  'emulate_browser',
  'emulate_cli',
  'emulate_analyzer',
] as const;

export type EmulateAgentType = (typeof EMULATE_AGENT_TYPES)[number];

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
      'List all emulate agents with their type, name, id and status (idle/working/waiting/blocked). Call it before delegating to see who exists and who is free.',
    examples: [{ params: {}, note: 'no parameters' }],
  },
  create_agent: {
    description:
      `Create an emulate agent. Required: agent_id (unique snake_case identifier), agent_type (${EMULATE_AGENT_TYPES.join('|')}) and agent_name (human-readable); nothing else. Choose an agent_id not already in list_agents. The agent only becomes available in a later turn: end the turn right after this call, then confirm with list_agents before send_message.`,
    examples: [
      {
        params: { agent_id: 'browser_1', agent_type: 'emulate_browser', agent_name: 'Browser Control #1' },
        note: 'create a browser-control agent',
      },
      {
        params: { agent_id: 'cli_1', agent_type: 'emulate_cli', agent_name: 'CLI Tool #1' },
        note: 'create a terminal agent',
      },
    ],
  },
  delete_agent: {
    description:
      'Delete a sub-agent by agent_id (the id shown by list_agents). Its pending work is cancelled and its reply will not arrive. The orchestrator cannot be deleted. Required: agent_id.',
    examples: [{ params: { agent_id: 'browser_1' }, note: "delete the agent with id 'browser_1'" }],
  },
  send_message: {
    description:
      "Send a message to one agent by agent_id. Required: agent_id and message. The message follows the Message format in WORKFLOW and is self-contained: the agent cannot see your context or your tool results. The agent's reply arrives later as an incoming message; never predict it.",
    examples: [
      {
        params: {
          agent_id: 'planner_1',
          message:
            'TYPE: TASK\nGOAL: plan a security review of the login flow of shop.example.com.\nCONTEXT: traffic is captured by Emulate; fuzzing is allowed only against the user-owned test target shop.example.com.\nINPUT: none\nEXPECTED OUTPUT: a PLAN.',
        },
        note: 'send a planning task',
      },
      {
        params: {
          agent_id: 'analyzer_1',
          message:
            'TYPE: ANALYZE\nGOAL: analyze the captured login traffic for token leaks and missing rate limiting.\nCONTEXT: browser flow was just reproduced; host is shop.example.com.\nINPUT: flow steps from the browser agent RESULT.\nEXPECTED OUTPUT: a RESULT with findings and evidence.',
        },
        note: 'send an analysis task',
      },
    ],
  },
  list_reports: {
    description: 'List all markdown reports in the Report workspace with report_<number>, title and last update time.',
    examples: [{ params: {}, note: 'no parameters' }],
  },
  create_report: {
    description:
      'Create a new markdown report. Required: content (full markdown; the title is parsed from the first heading line). Write it only from findings the analyzer actually returned.',
    examples: [
      {
        params: { content: '# Login flow review\n\n## Findings\n- ...' },
        note: 'create a report',
      },
    ],
  },
  read_report: {
    description:
      'Read a report by report_id from list_reports, optionally a line range with start_line and end_line (1-indexed, inclusive).',
    examples: [{ params: { report_id: 'report_1' }, note: 'read the whole report' }],
  },
  update_report: {
    description:
      'Update an existing report. Required: report_id from list_reports. Optional: content (new full markdown) and title. Call list_reports first.',
    examples: [
      {
        params: { report_id: 'report_1', content: '# Login flow review\n\n## Findings\n- updated' },
        note: 'replace the report content',
      },
    ],
  },
};

const renderToolDocs = (format: ToolFormat): string =>
  ORCHESTRATOR_TOOLS.map((tool) => {
    const def = TOOL_DEFS[tool];
    const examples = def.examples
      .map((example) => `  - ${tick(callText(tool, example.params, format))} — ${example.note}`)
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
          'The fuzzer would send about 200 payloads to api.example.com/login. Confirm that you own or are authorized to test this host?',
      },
    ],
    format,
  );
  const single = fenceQuestion(
    [
      {
        id: '1',
        type: 'single',
        label: 'Which analysis scope should the analyzer use?',
        options: [
          'Passive review of captured traffic only (recommended — no new requests are sent to the target)',
          'Passive review plus fuzzer fuzzing (more findings but sends new requests to the target)',
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

export const buildOrchestratorToolsReference = (toolFormat: ToolFormat = 'xml'): string => {
  const how =
    toolFormat === 'json'
      ? 'Every tool call is one JSON object in its own fenced json block: ' +
        tick('{"tool":"<name>","params":{...}}') +
        '.'
      : 'Every tool call is one XML tag, for example ' + tick('<list_agents />') + '.';
  return [
    toolFormat === 'json' ? '# TOOLS (JSON FORMAT)' : '# TOOLS',
    'The orchestrator coordinates the Emulate traffic-analysis workflow. It has NO browser, terminal, traffic or generic file tools: it sets the conversation title, manages emulate sub-agents, sends them messages, writes reports and asks the user through the question UI.',
    how,
    toolFormat === 'json' ? jsonNote : '',
    renderToolDocs(toolFormat),
    uiDocs(toolFormat),
    questionDocs(toolFormat),
  ]
    .filter((part) => part.length > 0)
    .join('\n\n');
};