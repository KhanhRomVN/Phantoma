export const EMULATE_EXECUTOR_TOOL_VALIDATION_XML = `# TOOL VALIDATION (XML FORMAT)
Valid tools: read_file, write_to_file, replace_in_file, list_files, find_files, grep, delete_file, run_command, conversation_title, send_message

Common mistakes:
- Inventing tool names (search_files, edit_file, create_file, etc.)
- HTML entities in content (<, >, &, ") — write raw code
- Wrong closing tags (</old_content> instead of </new_content>)
- Wrapping XML in json fences
- Multiple tool calls without proper closing tags`;

export const EMULATE_EXECUTOR_TOOL_VALIDATION_JSON = `# TOOL VALIDATION (JSON FORMAT)
Every tool call is a single JSON object in its own json fence.
Valid shape: {"tool":"<name>","params":{...}}

Common mistakes:
- Unescaped newlines/quotes in JSON strings (use \\n, \\")
- Multiple objects in one block
- XML tags anywhere
- Inventing tool names
- HTML entities in string values (<, >) — write raw characters`;