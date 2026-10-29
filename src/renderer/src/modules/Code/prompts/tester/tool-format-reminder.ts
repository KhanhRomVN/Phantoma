import type { ToolFormat } from "../code/mode-config";

export const TESTER_FORMAT_FALLBACK_MESSAGE = `[format_error] Your last response contained no valid tool call, so nothing was executed. You have no markdown, question or code UI: every response MUST consist only of tool calls in the format below. When your test report is ready, deliver it with send_message to the orchestrator.`;

const REMINDER_JSON = `# TOOL CALL FORMAT (JSON, each call is one object in its own json code fence)
{"tool":"read_file","params":{"file_path":"p","start_line":1,"end_line":50}}
{"tool":"write_to_file","params":{"file_path":"p","content":"c"}}
{"tool":"replace_in_file","params":{"file_path":"p","old_content":"o","new_content":"n"}}
{"tool":"list_files","params":{"folder_path":"p","depth":2}}
{"tool":"find_files","params":{"file_name":"f","folder_path":"p"}}
{"tool":"grep","params":{"search_term":"s","file_path":"p"}}
{"tool":"run_command","params":{"command":"c","folder_path":"p"}}
{"tool":"send_message","params":{"agent_id":"orchestrator","message":"TYPE: TEST_REPORT\\nSTATUS: OK\\nBODY:\\n..."}}`;

const REMINDER_XML = `# TOOL CALL FORMAT (XML)
<read_file><file_path>p</file_path><start_line>1</start_line><end_line>50</end_line></read_file>
<write_to_file><file_path>p</file_path><content>c</content></write_to_file>
<replace_in_file><file_path>p</file_path><old_content>o</old_content><new_content>n</new_content></replace_in_file>
<list_files><folder_path>p</folder_path><depth>2</depth></list_files>
<find_files><file_name>f</file_name><folder_path>p</folder_path></find_files>
<grep><search_term>s</search_term><file_path>p</file_path></grep>
<run_command><command>c</command><folder_path>p</folder_path></run_command>
<send_message><agent_id>orchestrator</agent_id><message>TYPE: TEST_REPORT
STATUS: OK
BODY:
...</message></send_message>`;

export const buildTesterToolFormatReminder = (
  toolFormat: ToolFormat,
): string =>
  `${TESTER_FORMAT_FALLBACK_MESSAGE}\n\n${toolFormat === "json" ? REMINDER_JSON : REMINDER_XML}`;