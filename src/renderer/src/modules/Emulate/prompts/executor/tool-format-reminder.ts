import type { ToolFormat } from './types';

export const EMULATE_EXECUTOR_FORMAT_FALLBACK_MESSAGE = `[format_error] Your last response contained no valid tool call, so nothing was executed. You have no markdown, question or code UI: every response MUST consist only of tool calls in the format below. When work is done, deliver your result with send_message to the orchestrator.`;

const REMINDER_JSON = `# TOOL CALL FORMAT (JSON)
{"tool":"read_file","params":{"file_path":"p"}}
{"tool":"write_to_file","params":{"file_path":"p","content":"c"}}
{"tool":"replace_in_file","params":{"file_path":"p","old_content":"o","new_content":"n"}}
{"tool":"send_message","params":{"agent_id":"orchestrator","message":"TYPE: RESULT\\nSTATUS: OK\\nBODY:\\n..."}}`;

const REMINDER_XML = `# TOOL CALL FORMAT (XML)
<read_file><file_path>p</file_path></read_file>
<write_to_file><file_path>p</file_path><content>c</content></write_to_file>
<replace_in_file><file_path>p</file_path><old_content>o</old_content><new_content>n</new_content></replace_in_file>
<send_message><agent_id>orchestrator</agent_id><message>TYPE: RESULT
STATUS: OK
BODY:
...</message></send_message>`;

export const buildEmulateExecutorToolFormatReminder = (toolFormat: ToolFormat): string =>
  `${EMULATE_EXECUTOR_FORMAT_FALLBACK_MESSAGE}\n\n${toolFormat === 'json' ? REMINDER_JSON : REMINDER_XML}`;