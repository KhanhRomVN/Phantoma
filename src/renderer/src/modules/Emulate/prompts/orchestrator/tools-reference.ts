import type { ToolFormat } from './types';

export type EmulateOrchestratorToolName =
  | 'conversation_title'
  | 'list_agents'
  | 'create_agent'
  | 'delete_agent'
  | 'send_message';

export type ToolParams = Record<string, string | number>;

export const EMULATE_ORCHESTRATOR_TOOLS: EmulateOrchestratorToolName[] = [
  'conversation_title',
  'list_agents',
  'create_agent',
  'delete_agent',
  'send_message',
];

export const EMULATE_AGENT_TYPES = [
  'traffic-analyzer',
  'fuzzer',
  'filter',
  'report-generator',
] as const;

export const tick = (text: string): string => '`' + text + '`';

export const callText = (
  name: EmulateOrchestratorToolName,
  params: ToolParams,
  format: ToolFormat,
): string => {
  if (format === 'json') {
    return JSON.stringify({ tool: name, params });
  }
  if (Object.keys(params).length === 0) {
    return `<${name} />`;
  }
  if (name === 'conversation_title') {
    return `<conversation_title>${params.title}</conversation_title>`;
  }
  const inner = Object.entries(params)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join('');
  return `<${name}>${inner}</${name}>`;
};

export const fenceCall = (
  name: EmulateOrchestratorToolName,
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
      const head = `<q id="${q.id}" type="${q.type}" label="${q.label.replace(/"/g, '&' + 'quot;')}"`;
      if (!q.options || q.options.length === 0) {
        return `  ${head} />`;
      }
      const options = q.options.map((option) => `    <option>${option}</option>`).join('\n');
      return `  ${head}>\n${options}\n  </q>`;
    })
    .join('\n');
  return '```xml\n<question>\n' + body + '\n</question>\n```';
};

export const buildEmulateOrchestratorToolsReference = (toolFormat: ToolFormat): string => {
  if (toolFormat === 'json') {
    return `# TOOLS (JSON FORMAT)
{"tool":"conversation_title","params":{"title":"Short title"}}
{"tool":"list_agents","params":{}}
{"tool":"create_agent","params":{"agent_id":"traffic_analyzer","agent_type":"traffic-analyzer","agent_name":"Traffic Analyzer"}}
{"tool":"delete_agent","params":{"agent_id":"traffic_analyzer"}}
{"tool":"send_message","params":{"agent_id":"traffic_analyzer","message":"TYPE: TASK\\nGOAL: analyze HTTP traffic\\nCONTEXT: ...\\nINPUT: none\\nEXPECTED OUTPUT: analysis report"}}

## Agent Types
- traffic-analyzer: Analyze HTTP/WebSocket traffic, apply filters
- fuzzer: Generate and run fuzzing payloads
- filter: Create and manage traffic filters
- report-generator: Generate security reports from findings`;
  }
  return `# TOOLS (XML FORMAT)
<conversation_title>Short title</conversation_title>
<list_agents />
<create_agent><agent_id>traffic_analyzer</agent_id><agent_type>traffic-analyzer</agent_type><agent_name>Traffic Analyzer</agent_name></create_agent>
<delete_agent><agent_id>traffic_analyzer</agent_id></delete_agent>
<send_message><agent_id>traffic_analyzer</agent_id><message>TYPE: TASK
GOAL: analyze HTTP traffic
CONTEXT: ...
INPUT: none
EXPECTED OUTPUT: analysis report</message></send_message>

## Agent Types
- traffic-analyzer: Analyze HTTP/WebSocket traffic, apply filters
- fuzzer: Generate and run fuzzing payloads
- filter: Create and manage traffic filters
- report-generator: Generate security reports from findings`;
};