const CLOSE_CONTENT = '</' + 'content>';

export const DESIGN_TOOLS_REFERENCE = `# TOOLS
Use XML tags for all tool calls. The design folder is FLAT (no sub-folders), so every file_path is a bare file name such as Home.tsx.
<read_file><file_path>Home.tsx</file_path></read_file>
<read_file><file_path>Home.tsx</file_path><start_line>1</start_line><end_line>50</end_line></read_file>
<create_file><file_path>Pricing.tsx</file_path><content>full file content${CLOSE_CONTENT}</create_file>
<update_file><file_path>Home.tsx</file_path>
<old_content>exact original (indentation must match)</old_content>
<new_content>replacement</new_content>
</update_file>
⚠ TAG-CLOSE-VERIFY: closing tag must be </new_content> — never </old_content>. Re-read the opening tag before closing.
⚠ NO-HTML-ENTITIES: Never escape code characters as <, >, &, ". Always write raw code directly inside content, new_content, and old_content.
<list_files/>
<grep><search_term>pattern</search_term></grep>

## File Line-Count Metadata & READ-LINE-BUDGET
\`list_files\` and \`grep\` results include, for every file they return, its exact line count (e.g. \`(155 lines)\`). read_file has NO cap on the number of files per turn — instead, before batching read_file calls, sum this line count across every file you intend to read this turn and keep the total at or under 1500 lines (see READ-LINE-BUDGET in CONSTRAINTS). This is a precise sum, not an estimate. Do not guess a file's line count — if you do not know it from a prior list_files/grep result, call one of those first. For any single file that alone would exceed the remaining budget, read only the relevant slice with \`start_line\`/\`end_line\`.

**read_file**: Read a file from the design folder.
- \`file_path\`: File name (required)
- \`start_line\` / \`end_line\`: (optional) read only that inclusive line range.
**create_file**: Create a new file with the given full content (page .tsx, shared component .tsx, or data .ts). Use it for NEW files; use update_file for targeted edits to existing files. Only overwrite an existing file with create_file when you are rewriting most of it.
- \`file_path\`: File name (required) — flat, no sub-folders
- \`content\`: Full file content (required), written with real line breaks
**update_file**: Replace one exact snippet of an existing file. Read the file first.
- \`file_path\`: File name (required)
- \`old_content\`: Exact original snippet, byte-for-byte (indentation and spacing included)
- \`new_content\`: Replacement
**list_files**: List every file in the design folder, each with its exact line count. Takes NO parameters — always write it as \`<list_files/>\`. There are no sub-folders to browse.
**grep**: Search ALL design files for a regular expression (case-insensitive).
- \`search_term\`: The regex pattern (required). There is NO file_path or folder_path — the search always covers the whole design folder.
- Supports JavaScript regex syntax: \`.*\`, \`[A-Z]\`, \`\\d+\`, \`(foo|bar)\`.
- Returns: for each matching file, its line count plus the matching lines with their line numbers.
- Examples:
  - \`<grep><search_term>from './Layout'</search_term></grep>\` — every file importing the layout
  - \`<grep><search_term>route="/features"</search_term></grep>\` — every link to a route
**conversation_title**: Set or update the title of the current conversation. This is a UI tag — not an executable tool. Call it on your first response and again whenever the task changes. Keep it short (max ~80 characters), written in the user's language.
- Example: \`<conversation_title>Design pricing page</conversation_title>\`
**markdown**: UI tag for prose shown to the user, e.g. \`<markdown>Added the Pricing page.</markdown>\`.`;

export const DESIGN_TOOLS_REFERENCE_JSON = `# TOOLS (JSON FORMAT)
Use JSON objects inside fenced code blocks for ALL output — both tool calls AND UI content. Each object MUST be in its own fenced block, one object per block, no arrays. There are TWO legal shapes, distinguished by the top-level key: a tool call has a \`"tool"\` key, a UI object has a \`"type"\` key. The design folder is FLAT (no sub-folders), so every file_path is a bare file name such as Home.tsx.

\`\`\`json
{"tool":"read_file","params":{"file_path":"Home.tsx"}}
\`\`\`
\`\`\`json
{"tool":"read_file","params":{"file_path":"Home.tsx","start_line":1,"end_line":50}}
\`\`\`
\`\`\`json
{"tool":"create_file","params":{"file_path":"Pricing.tsx","content":"full file content"}}
\`\`\`
\`\`\`json
{"tool":"update_file","params":{"file_path":"Home.tsx","old_content":"exact original","new_content":"replacement"}}
\`\`\`
⚠ BYTE-PERFECT: old_content must match exactly — indentation, spacing, no reformatting.
⚠ JSON-STRINGS: Escape all special characters in string values (newlines, backslashes, double quotes, tabs) per the JSON spec. Never use HTML entities.
\`\`\`json
{"tool":"list_files","params":{}}
\`\`\`
\`\`\`json
{"tool":"grep","params":{"search_term":"pattern"}}
\`\`\`
\`\`\`json
{"tool":"conversation_title","params":{"title":"Short title here"}}
\`\`\`
\`\`\`json
{"type":"markdown","content":"prose shown to the user"}
\`\`\`

## File Line-Count Metadata & READ-LINE-BUDGET
\`list_files\` and \`grep\` results include, for every file they return, its exact line count (e.g. \`(155 lines)\`). read_file has NO cap on the number of files per turn — instead, before batching read_file calls, sum this line count across every file you intend to read this turn and keep the total at or under 1500 lines (see READ-LINE-BUDGET in CONSTRAINTS). This is a precise sum, not an estimate. Do not guess a file's line count — if you do not know it from a prior list_files/grep result, call one of those first. For any single file that alone would exceed the remaining budget, read only the relevant slice with \`start_line\`/\`end_line\`.

## Tool Descriptions
**read_file**: Read a file from the design folder. \`file_path\` (required); \`start_line\`/\`end_line\` (optional inclusive range).
**create_file**: Create a new file (page .tsx, shared component .tsx, or data .ts). \`file_path\` and \`content\` (both required). Use it for NEW files; use update_file for targeted edits to existing files. Only overwrite an existing file with create_file when rewriting most of it.
**update_file**: Replace one exact snippet of an existing file. \`file_path\`, \`old_content\`, \`new_content\` (all required). Read the file first.
**list_files**: List every file in the design folder with its exact line count. Takes NO parameters — pass an empty \`params\` object. There are no sub-folders.
**grep**: Search ALL design files for a regular expression (case-insensitive). \`search_term\` is the only parameter — there is NO file_path or folder_path. In JSON, backslashes inside the regex must be escaped.
**conversation_title**: Set or refresh the conversation title (\`title\`, max ~80 characters, in the user's language) on the first response and whenever the task changes.`;