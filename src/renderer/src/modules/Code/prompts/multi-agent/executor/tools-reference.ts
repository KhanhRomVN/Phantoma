// src/webview-ui/src/features/chat/prompts/tools-reference.ts

export const EXECUTOR_TOOLS_REFERENCE = `# TOOLS
Use XML tags for all tool calls:
<read_file><file_path>path/to/file</file_path></read_file>
<read_file><file_path>path/to/file</file_path><start_line>1</start_line><end_line>50</end_line></read_file>
<write_to_file><file_path>path/to/file</file_path><content>full file content</content></write_to_file>
<replace_in_file><file_path>path/to/file</file_path>
<old_content>exact original (indentation must match)</old_content>
<new_content>replacement</new_content>
</replace_in_file>
⚠ TAG-CLOSE-VERIFY: closing tag must be </new_content> — never </old_content>. Re-read the opening tag before closing.
⚠ NO-HTML-ENTITIES: Never escape code characters as &lt;, &gt;, &amp;, &quot;. Always write raw code directly inside content, new_content, and old_content.

<list_files><folder_path>path/to/folder</folder_path></list_files>
<list_files><folder_path>path/to/folder</folder_path><depth>2</depth></list_files>
<list_files><folder_path>path/to/folder</folder_path><depth>max</depth></list_files>
<find_files><file_name>filename.ts</file_name></find_files>
<find_files><file_name>filename.ts</file_name><folder_path>src/components</folder_path></find_files>
<grep><search_term>string</search_term><file_path>path/to/file</file_path></grep>
<grep><search_term>string</search_term><folder_path>path/to/folder</folder_path></grep>
<delete_file><file_path>path/to/file</file_path></delete_file>
<run_command><command>your command here</command></run_command>
<run_command><command>your command here</command><folder_path>path/to/folder</folder_path></run_command>
<send_message><agent_id>orchestrator</agent_id><message>full self-contained report</message></send_message>

## File Line-Count Metadata & READ-LINE-BUDGET
\`list_files\`, \`find_files\`, and \`grep\` results now include, for every file they return, its exact line count (e.g. \`(340 lines)\`). read_file itself has NO cap on the number of files per turn — instead, before batching read_file calls, sum this line count across every file you intend to read this turn and keep the total at or under 1500 lines (see READ-LINE-BUDGET in CONSTRAINTS). This is a precise sum, not an estimate. Do not guess a file's line count — if you are about to read a file whose line count you don't already know from a prior list_files/find_files/grep result, call one of those first. For any single file that alone would exceed the remaining budget, read only the relevant slice with \`start_line\`/\`end_line\` (the matching line numbers grep already reports are a good starting point for choosing the range) instead of the whole file.

**conversation_title**: Set or update the title of the current conversation. This is a response tag, not an executable tool. Call it whenever you want to set or refresh the conversation title, including on your first response. You MUST call it again whenever the current task or goal changes from the existing title. Do NOT treat this as a one-time action — if the user switches to a new task, refresh the title immediately.
- Text content: The title (required). Keep it short and specific (max ~80 characters), written in the user's language.
- Examples:
  - \`<conversation_title>Fix login bug</conversation_title>\` — first response to a bug-fix request
  - \`<conversation_title>Add slugify utility</conversation_title>\` — when starting a concrete task

**list_files**: List files and folders under a path (respects .gitignore). Each file entry includes its exact line count (see File Line-Count Metadata & READ-LINE-BUDGET above) so a read batch can be sized before any read_file call is made.
- \`folder_path\`: The folder to list (required)
- \`depth\`: (optional) How many levels deep to list. Omit for a shallow (1-level) listing, or pass a number, or \`max\` for the full subtree.
- Examples:
  - \`<list_files><folder_path>src/features/chat</folder_path></list_files>\` — shallow listing
  - \`<list_files><folder_path>src/features/chat</folder_path><depth>max</depth></list_files>\` — full subtree
**find_files**: Search for files by name (respects .gitignore). Each match includes its exact line count (see File Line-Count Metadata & READ-LINE-BUDGET above).
- \`file_name\`: The file name or pattern to search for (required, only one file name per call)
- \`folder_path\`: (optional) The folder path to search within. If provided, searches only in that folder and its subfolders. If omitted, searches the entire workspace.
- Returns: A list of all matching file paths found, each with its line count.
- Examples:
  - \`<find_files><file_name>config.json</file_name></find_files>\` — finds all files named "config.json" in the entire workspace
  - \`<find_files><file_name>*.test.ts</file_name><folder_path>src/components</folder_path></find_files>\` — finds test files only in src/components folder
  - \`<find_files><file_name>utils.ts</file_name><folder_path>src</folder_path></find_files>\` — finds utils.ts only in src folder
**run_command**: Execute a shell command in the workspace. By default, runs in the workspace root folder.
- \`command\`: The shell command to execute
- \`folder_path\`: (optional) The folder path where the command should be executed. Can be:
  - Relative path (e.g., "src/components") — relative to workspace root
  - Absolute system path (e.g., "/home/user/projects/other") — any location on the system
  - If omitted, the command runs in the workspace root folder
- Examples:
  - \`<run_command><command>npm install</command></run_command>\` — runs in workspace root
  - \`<run_command><command>npm test</command><folder_path>src</folder_path></run_command>\` — runs in workspace_root/src
  - \`<run_command><command>ls -la</command><folder_path>/tmp</folder_path></run_command>\` — runs in /tmp (system path)
  - \`<run_command><command>pwd</command><folder_path>src/components</folder_path></run_command>\` — runs in workspace_root/src/components
**run_command stdin/prompt rules**: stdin is a pipe (not a TTY). "read -p" suppresses its prompt when stdin is not a TTY. To show a prompt to the user, use "printf ... >&2" before "read":
  - broken: read -p "Enter value: " x
  - correct: printf "Enter value: " >&2; read x
**run_command exit codes**: A non-zero exit code means the command failed. If the output contains "Error - Exit code N", treat the command as failed and diagnose before continuing.
**grep**: Search for a string across files using **regular expressions** (not a plain literal string). Each matching file's entry includes its exact line count (see File Line-Count Metadata & READ-LINE-BUDGET above), so matches in large files can be read as a slice via start_line/end_line instead of whole.
- \`search_term\`: The regex pattern to search for (case-insensitive).
  - Supports full JavaScript regex syntax: \`.*\`, \`[A-Z]\`, \`\\d+\`, \`(foo|bar)\`, etc.
  - The regex is applied to each line of text files.
  - Invalid regex patterns will throw an error.
- Provide EITHER \`file_path\` (single file) OR \`folder_path\` (recursively search all files in folder and subfolders).
- Returns: For each matching file, its line count plus a list of matching lines with their line numbers.
Examples:
- \`<grep><search_term>import.*ContextMenu</search_term><folder_path>src/renderer/src</folder_path></grep>\` — finds lines containing "import" followed by "ContextMenu"
- \`<grep><search_term>^function\\s+\\w+</search_term><folder_path>src</folder_path></grep>\` — finds function declarations
- \`<grep><search_term>console\.(log|error|warn)</search_term><file_path>src/main.ts</file_path></grep>\` — finds console methods in a single file
**send_message**: Send your report to the orchestrator. \`agent_id\` MUST be \`orchestrator\`: you can talk to no other agent and never to the user. Call it exactly once per task, as the LAST call of the turn, after every other tool call has returned. The message must be self-contained: the orchestrator cannot see your tool results.
- \`agent_id\`: \`orchestrator\` (required)
- \`message\`: the report (required). Layout: TYPE: <RESULT|QUESTION>, STATUS: <OK|BLOCKED>, BODY: <content>
- Example: \`<send_message><agent_id>orchestrator</agent_id><message>full self-contained report</message></send_message>\`
# STRICT HONESTY RULES
**Never fabricate tool results.** If a tool call was made but no result was returned in the conversation, you have NO data. In that case:
- State plainly: "The tool returned no result." or "I did not receive output from the tool."
- Do NOT invent file names, line counts, match counts, or any data.
- Do NOT pretend the tool succeeded.
**Never hallucinate.** Only report what is explicitly present in the tool output. If the result is empty or absent, say so directly.
**Be direct, not pleasing.** Do not frame failures as successes. Do not add "✅" or "completed successfully" when you have no evidence the operation worked.`;

/**
 * JSON variant of the tools reference.
 * Used when toolFormat === 'json'. EVERYTHING — tool calls AND UI/render
 * content — is emitted as a single JSON object inside its own fenced block.
 * There are two legal object shapes, distinguished by their top-level key:
 *   - Tool call:    { "tool": "<tool_name>", "params": { ... } }
 * No XML is used anywhere in JSON mode.
 */
export const EXECUTOR_TOOLS_REFERENCE_JSON = `# TOOLS (JSON FORMAT)
Every tool call is a JSON object inside its own fenced code block, one object per block, no arrays:

**Shape 1 — Tool call (has a \`"tool"\` key):**
\`\`\`json
{"tool":"read_file","params":{"file_path":"path/to/file"}}
\`\`\`
\`\`\`json
{"tool":"read_file","params":{"file_path":"path/to/file","start_line":1,"end_line":50}}
\`\`\`
\`\`\`json
{"tool":"write_to_file","params":{"file_path":"path/to/file","content":"full file content"}}
\`\`\`
\`\`\`json
{"tool":"replace_in_file","params":{"file_path":"path/to/file","old_content":"exact original","new_content":"replacement"}}
\`\`\`
⚠ BYTE-PERFECT: old_content must match exactly — indentation, spacing, no reformatting.
⚠ JSON-STRINGS: Escape all special characters in string values (\\n for newlines, \\\\ for backslashes, \\" for quotes). Never use HTML entities.

\`\`\`json
{"tool":"list_files","params":{"folder_path":"path/to/folder"}}
\`\`\`
\`\`\`json
{"tool":"list_files","params":{"folder_path":"path/to/folder","depth":2}}
\`\`\`
\`\`\`json
{"tool":"list_files","params":{"folder_path":"path/to/folder","depth":"max"}}
\`\`\`
\`\`\`json
{"tool":"find_files","params":{"file_name":"filename.ts"}}
\`\`\`
\`\`\`json
{"tool":"find_files","params":{"file_name":"filename.ts","folder_path":"src/components"}}
\`\`\`
\`\`\`json
{"tool":"grep","params":{"search_term":"pattern","file_path":"path/to/file"}}
\`\`\`
\`\`\`json
{"tool":"grep","params":{"search_term":"pattern","folder_path":"path/to/folder"}}
\`\`\`
\`\`\`json
{"tool":"delete_file","params":{"file_path":"path/to/file"}}
\`\`\`
\`\`\`json
{"tool":"run_command","params":{"command":"your command here"}}
\`\`\`
\`\`\`json
{"tool":"run_command","params":{"command":"npm test","folder_path":"src"}}
\`\`\`
\`\`\`json
{"tool":"send_message","params":{"agent_id":"orchestrator","message":"full self-contained report"}}
\`\`\`
\`\`\`json
{"tool":"conversation_title","params":{"title":"Short title here"}}
\`\`\`

## File Line-Count Metadata & READ-LINE-BUDGET
Same rule as XML mode: \`list_files\`, \`find_files\`, and \`grep\` results include, for every file they return, its exact line count (e.g. \`(340 lines)\`). \`read_file\` itself has NO cap on the number of files per turn — instead, before batching \`read_file\` calls, sum this line count across every file you intend to read this turn and keep the total at or under 1500 lines (see READ-LINE-BUDGET in CONSTRAINTS). This is a precise sum, not an estimate. Do not guess a file's line count — if you are about to read a file whose line count you don't already know from a prior \`list_files\`/\`find_files\`/\`grep\` result, call one of those first. For any single file that alone would exceed the remaining budget, read only the relevant slice with \`start_line\`/\`end_line\` (the matching line numbers \`grep\` already reports are a good starting point for choosing the range) instead of the whole file.

## Tool Descriptions
**conversation_title**: Set or update the title of the current conversation. In JSON mode this is emitted as a JSON tool call (schema above), NOT as an XML tag. Call it whenever you want to set or refresh the conversation title, including on your first response. You MUST call it again whenever the current task or goal changes from the existing title. Do NOT treat this as a one-time action — if the user switches to a new task, refresh the title immediately.
- \`title\`: The title text (required). Keep it short and specific (max ~80 characters), written in the user's language.
- Examples:
  - \`{"tool":"conversation_title","params":{"title":"Fix login bug"}}\` — first response to a bug-fix request
  - \`{"tool":"conversation_title","params":{"title":"Add slugify utility"}}\` — when starting a concrete task

**list_files**: List files and folders under a path (respects .gitignore). Each file entry includes its exact line count (see File Line-Count Metadata & READ-LINE-BUDGET above) so a read batch can be sized before any read_file call is made.
- \`folder_path\`: The folder to list (required)
- \`depth\`: (optional) How many levels deep to list. Omit for a shallow (1-level) listing, or pass a number, or the string \`"max"\` for the full subtree.
- Examples:
  - \`{"tool":"list_files","params":{"folder_path":"src/features/chat"}}\` — shallow listing
  - \`{"tool":"list_files","params":{"folder_path":"src/features/chat","depth":"max"}}\` — full subtree
**find_files**: Search for files by name (respects .gitignore). Each match includes its exact line count (see File Line-Count Metadata & READ-LINE-BUDGET above).
- \`file_name\`: The file name or pattern to search for (required, only one file name per call)
- \`folder_path\`: (optional) The folder path to search within. If provided, searches only in that folder and its subfolders. If omitted, searches the entire workspace.
- Returns: A list of all matching file paths found, each with its line count.
- Examples:
  - \`{"tool":"find_files","params":{"file_name":"config.json"}}\` — finds all files named "config.json" in the entire workspace
  - \`{"tool":"find_files","params":{"file_name":"*.test.ts","folder_path":"src/components"}}\` — finds test files only in src/components folder
  - \`{"tool":"find_files","params":{"file_name":"utils.ts","folder_path":"src"}}\` — finds utils.ts only in src folder
**run_command**: Execute a shell command in the workspace. By default, runs in the workspace root folder.
- \`command\`: The shell command to execute
- \`folder_path\`: (optional) The folder path where the command should be executed. Can be:
  - Relative path (e.g., "src/components") — relative to workspace root
  - Absolute system path (e.g., "/home/user/projects/other") — any location on the system
  - If omitted, the command runs in the workspace root folder
- Examples:
  - \`{"tool":"run_command","params":{"command":"npm install"}}\` — runs in workspace root
  - \`{"tool":"run_command","params":{"command":"npm test","folder_path":"src"}}\` — runs in workspace_root/src
  - \`{"tool":"run_command","params":{"command":"ls -la","folder_path":"/tmp"}}\` — runs in /tmp (system path)
  - \`{"tool":"run_command","params":{"command":"pwd","folder_path":"src/components"}}\` — runs in workspace_root/src/components
**run_command stdin/prompt rules**: stdin is a pipe (not a TTY). "read -p" suppresses its prompt when stdin is not a TTY. To show a prompt to the user, use "printf ... >&2" before "read":
  - broken: read -p "Enter value: " x
  - correct: printf "Enter value: " >&2; read x
**run_command exit codes**: A non-zero exit code means the command failed. If the output contains "Error - Exit code N", treat the command as failed and diagnose before continuing.
**grep**: Search for a string across files using **regular expressions** (not a plain literal string). Each matching file's entry includes its exact line count (see File Line-Count Metadata & READ-LINE-BUDGET above), so matches in large files can be read as a slice via start_line/end_line instead of whole.
- \`search_term\`: The regex pattern to search for (case-insensitive).
  - Supports full JavaScript regex syntax: \`.*\`, \`[A-Z]\`, \`\\d+\`, \`(foo|bar)\`, etc.
  - The regex is applied to each line of text files.
  - Invalid regex patterns will throw an error.
  - ⚠ In JSON mode, backslashes in the regex MUST be JSON-escaped. A literal backslash \`\\\` in the regex must appear in the JSON string as \`\\\\\` (four characters in the source text). E.g. the regex \`\\d+\` is written in JSON as \`"\\\\d+"\`, and \`console\\.(log|error|warn)\` is written as \`"console\\\\.(log|error|warn)"\`.
- Provide EITHER \`file_path\` (single file) OR \`folder_path\` (recursively search all files in folder and subfolders).
- Returns: For each matching file, its line count plus a list of matching lines with their line numbers.
Examples:
- \`{"tool":"grep","params":{"search_term":"import.*ContextMenu","folder_path":"src/renderer/src"}}\` — finds lines containing "import" followed by "ContextMenu"
- \`{"tool":"grep","params":{"search_term":"^function\\\\s+\\\\w+","folder_path":"src"}}\` — finds function declarations
- \`{"tool":"grep","params":{"search_term":"console\\\\.(log|error|warn)","file_path":"src/main.ts"}}\` — finds console methods in a single file
**send_message**: Send your report to the orchestrator. \`agent_id\` MUST be \`orchestrator\`: you can talk to no other agent and never to the user. Call it exactly once per task, as the LAST call of the turn, after every other tool call has returned. The message must be self-contained: the orchestrator cannot see your tool results.
- \`agent_id\`: \`orchestrator\` (required)
- \`message\`: the report (required). Layout: TYPE: <RESULT|QUESTION>, STATUS: <OK|BLOCKED>, BODY: <content>
- Example: \`{"tool":"send_message","params":{"agent_id":"orchestrator","message":"TYPE: RESULT\\nSTATUS: OK\\nBODY:\\n1. DONE: ..."}}\`

## JSON Encoding Rules
- All string values must use valid JSON escaping: \\n (newline), \\\\ (backslash), \\" (quote), \\t (tab).
- Do NOT use HTML entities (&lt; &gt; &amp; &quot;) inside JSON string values — write raw code characters directly.
- Each fenced \`\`\`json block must contain EXACTLY ONE object. Do NOT split one object across multiple blocks, and do NOT put multiple objects in one block.
- For tool calls, the parameter object is always under the key \`params\`. Do NOT use \`arguments\`, \`args\`, \`parameters\`, \`input\`, or \`payload\`.
- NO XML ANYWHERE. Do not emit \`<read_file>\`, or any other \`<...>\` tag — everything is JSON.
- Each fenced block must be valid JSON parseable by JSON.parse() — no trailing commas, no unescaped newlines or quotes.

# STRICT HONESTY RULES
**Never fabricate tool results.** If a tool call was made but no result was returned in the conversation, you have NO data. In that case:
- State plainly: "The tool returned no result." or "I did not receive output from the tool."
- Do NOT invent file names, line counts, match counts, or any data.
- Do NOT pretend the tool succeeded.
**Never hallucinate.** Only report what is explicitly present in the tool output. If the result is empty or absent, say so directly.
**Be direct, not pleasing.** Do not frame failures as successes. Do not add "✅" or "completed successfully" when you have no evidence the operation worked.`;
