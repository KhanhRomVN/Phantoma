import type { ToolFormat } from './types';

export const EMULATE_ORCHESTRATOR_FORMAT_FALLBACK_MESSAGE = `[format_error] Your last response contained no valid tool call, so nothing was executed. You have no markdown, question or code UI: every response MUST consist only of tool calls in the format below.`;

const REMINDER_JSON = `# TOOL CALL FORMAT (JSON, each call is one object in its own json code fence)
{"tool":"list_agents","params":{}}
{"tool":"create_agent","params":{"agent_id":"a","agent_type":"traffic-analyzer","agent_name":"A"}}
{"tool":"send_message","params":{"agent_id":"a","message":"TYPE: TASK\\nBODY:\\n..."}}`;

const REMINDER_XML = `# TOOL CALL FORMAT (XML)
<list_agents />
<create_agent><agent_id>a</agent_id><agent_type>traffic-analyzer</agent_type><agent_name>A</agent_name></create_agent>
<send_message><agent_id>a</agent_id><message>TYPE: TASK
BODY:
...</message></send_message>`;

export const buildEmulateOrchestratorToolFormatReminder = (toolFormat: ToolFormat): string =>
  `${EMULATE_ORCHESTRATOR_FORMAT_FALLBACK_MESSAGE}\n\n${toolFormat === 'json' ? REMINDER_JSON : REMINDER_XML}`;