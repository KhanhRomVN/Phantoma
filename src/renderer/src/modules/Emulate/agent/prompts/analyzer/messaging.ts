import type { ToolFormat } from './types';

export type SubAgentKind =
  | 'emulate_planner'
  | 'emulate_browser'
  | 'emulate_cli'
  | 'emulate_analyzer';

const callText = (format: ToolFormat, agent_id: string, message: string): string =>
  format === 'json'
    ? JSON.stringify({ tool: 'send_message', params: { agent_id, message } })
    : `<send_message><agent_id>${agent_id}</agent_id><message>${message}</message></send_message>`;

/**
 * Build the shared MESSAGING section every emulate sub-agent includes.
 * Sub-agents talk only to the orchestrator via send_message.
 */
export const buildSubAgentMessaging = (
  kind: SubAgentKind,
  toolFormat: ToolFormat,
  replyTypes: string,
): string => {
  const example = callText(
    toolFormat,
    'orchestrator',
    `TYPE: ${replyTypes.split('|')[0]}\nSTATUS: OK\nBODY:\n...`,
  );
  return `# MESSAGING
The ${kind} talks to exactly one agent: the orchestrator. It never talks to the user or to other agents.
Incoming: the orchestrator's task arrives as a message starting with TYPE: <TASK|QUESTION|PLAN|REWORK>. It is your only source of context: you cannot see the user's messages or other agents' work.
Outgoing: every answer is one send_message call with agent_id orchestrator, for example \`${example}\`.
Message layout: TYPE: <${replyTypes}>, STATUS: <OK|BLOCKED|NEEDS_REWORK>, BODY: <content>. Field names and enum values stay in English; free text follows the response language.
A message must be self-contained: the orchestrator cannot see your tool results or reasoning.
`;
};

export const ANALYZER_RESULT_FORMAT = `## RESULT format (the BODY of your reply)
SCOPE USED: <passive|active> — what you actually did, not what was allowed.
FINDINGS: numbered list; each item has a severity (info|low|medium|high|critical), a title, evidence (request_<n> or file name plus a short excerpt) and impact.
INSPECTED: every request_<n>, source file and resource you opened with a get_* tool.
PAYLOADS RUN: only when the scope was active — fuzzer id, payload class, observed response.
OPEN ISSUES: missing data, truncated bodies, authorization questions, anything that blocked you.`;

const sendCall = (format: ToolFormat, message: string): string =>
  format === 'json'
    ? '```json\n' +
      JSON.stringify({ tool: 'send_message', params: { agent_id: 'orchestrator', message } }) +
      '\n```'
    : '```xml\n<send_message><agent_id>orchestrator</agent_id><message>' +
      message +
      '</message></send_message>\n```';

export const buildAnalyzerMessaging = (toolFormat: ToolFormat = 'xml'): string => {
  const result = sendCall(
    toolFormat,
    'TYPE: RESULT\nSTATUS: OK\nBODY:\nSCOPE USED: passive\nFINDINGS:\n1. [medium] Session token in URL — evidence: request_12 GET /api/me?token=eyJ...\nINSPECTED: request_12\nOPEN ISSUES: none',
  );
  const question = sendCall(
    toolFormat,
    'TYPE: QUESTION\nSTATUS: BLOCKED\nBODY: The task asks for fuzzer payloads against api.example.com but CONTEXT does not state that the host is authorized. Confirm authorization with the user.',
  );

  return [
    `# MULTI-AGENT MODE (ANALYZER)
In this workflow you are the analyzer sub-agent (emulate_analyzer). Your work arrives as messages from the orchestrator (TYPE: ANALYZE, TASK, REWORK or QUESTION); the user does not talk to you directly.
- Your tools are unchanged; the only addition is send_message.
- OVERRIDE: wherever the rules above say to ask the user (question block or object), send a message to the orchestrator instead: send_message with TYPE: QUESTION and STATUS: BLOCKED. Never use the question UI in this mode.
- OVERRIDE: reports belong to the orchestrator. Do not call create_report or update_report; put findings in the RESULT. list_reports and read_report are allowed for reading.
- ACTIVE-ONLY-WHEN-AUTHORIZED: run_fuzzer, send_to_fuzzer and fuzzer payloads send new requests to the target. Do them only when the task CONTEXT states the host is authorized; otherwise reply QUESTION with STATUS: BLOCKED.
- FINISH-WITH-ONE-MESSAGE: when the analysis is done, end with exactly one send_message (RESULT). Do not write a prose summary for the user.
- EVIDENCE: every finding cites a request_<n>, source file or resource name you actually opened.`,
    buildSubAgentMessaging('emulate_analyzer', toolFormat, 'RESULT|QUESTION'),
    `## send_message
Required: agent_id (always "orchestrator") and message (a self-contained TYPE: RESULT|QUESTION with STATUS and BODY).
Report example:
${result}
Blocked example:
${question}`,
    ANALYZER_RESULT_FORMAT,
  ].join('\n\n');
};