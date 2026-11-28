export const EMULATE_EXECUTOR_TOOLS_REFERENCE_XML = `# TOOLS
Use XML tags for all tool calls:
<read_file><file_path>path/to/file</file_path></read_file>
<read_file><file_path>path/to/file</file_path><start_line>1</start_line><end_line>50</end_line></read_file>
<write_to_file><file_path>path/to/file</file_path><content>full file content</content></write_to_file>
<replace_in_file><file_path>path/to/file</file_path>
<old_content>exact original (indentation must match)</old_content>
<new_content>replacement</new_content>
</replace_in_file>

<list_files><folder_path>path/to/folder</folder_path></list_files>
<list_files><folder_path>path/to/folder</folder_path><depth>2</depth></list_files>
<find_files><file_name>filename.ts</file_name></find_files>
<grep><search_term>string</search_term><file_path>path/to/file</file_path></grep>
<delete_file><file_path>path/to/file</file_path></delete_file>
<run_command><command>your command here</command></run_command>
<send_message><agent_id>orchestrator</agent_id><message>full self-contained report</message></send_message>

**conversation_title**: Set or update conversation title.
**list_files**: List files and folders (respects .gitignore). Each file includes exact line count.
**find_files**: Search files by name. Each match includes line count.
**grep**: Search for regex pattern across files. Returns matching lines with line numbers.
**run_command**: Execute shell command. Use folder_path for custom working directory.
**send_message**: Report back to orchestrator. Must be LAST call after all other tools.

MESSAGE FORMAT:
TYPE: RESULT
STATUS: OK|BLOCKED|NEEDS_REWORK
SUMMARY: one sentence of what was done/found.
FILES_CHANGED: list of paths modified.
OUTPUT: completed work or analysis results.
BLOCKED_ON: what prevents progress (if STATUS: BLOCKED).
QUESTION: your question (if STATUS: BLOCKED).`;

export const EMULATE_EXECUTOR_TOOLS_REFERENCE_JSON = `# TOOLS (JSON FORMAT)
Each tool call is one JSON object in its own json fence:
{"tool":"read_file","params":{"file_path":"p","start_line":1,"end_line":50}}
{"tool":"write_to_file","params":{"file_path":"p","content":"c"}}
{"tool":"replace_in_file","params":{"file_path":"p","old_content":"o","new_content":"n"}}
{"tool":"list_files","params":{"folder_path":"p","depth":2}}
{"tool":"find_files","params":{"file_name":"f","folder_path":"p"}}
{"tool":"grep","params":{"search_term":"s","file_path":"p"}}
{"tool":"delete_file","params":{"file_path":"p"}}
{"tool":"run_command","params":{"command":"c","folder_path":"p"}}
{"tool":"conversation_title","params":{"title":"t"}}
{"tool":"send_message","params":{"agent_id":"orchestrator","message":"TYPE: RESULT\\nSTATUS: OK\\nBODY:\\n..."}}

MESSAGE FORMAT:
TYPE: RESULT
STATUS: OK|BLOCKED|NEEDS_REWORK
SUMMARY: one sentence.
FILES_CHANGED: list of paths.
OUTPUT: completed work.
BLOCKED_ON: what prevents progress (if BLOCKED).
QUESTION: your question (if BLOCKED).`;