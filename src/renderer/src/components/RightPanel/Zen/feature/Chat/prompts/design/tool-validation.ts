export const DESIGN_TOOL_VALIDATION = `# TOOL VALIDATION & ERROR PREVENTION

## Valid Tool Tags (CRITICAL — MUST MATCH EXACTLY)
Only these tags are valid tools. Full parameters and usage are documented in the TOOLS section — this list exists purely to catch invented tool names:
\`read_file\`, \`create_file\`, \`update_file\`, \`list_files\`, \`grep\`.
Response-only tags (not tools): \`conversation_title\`, \`markdown\`.

## Common Invented-Tool Mistakes to AVOID
These do NOT exist in the design workspace. If you are about to write one, STOP and use the real tool on the right instead:
\`\`\`
<write_to_file>                  ❌ → use <create_file>
<replace_in_file>                ❌ → use <update_file>
<edit_file> / <modify_file>      ❌ → use <update_file>
<replace_file>                   ❌ → use <update_file>
<get_file>                       ❌ → use <read_file>
<find_files> / <search_files>    ❌ → use <list_files/> or <grep>
<delete_file>                    ❌ → not available — you cannot delete files
<run_command>                    ❌ → not available — there is no shell
<git_status> / <git_diff>        ❌ → not available
<revert_file>                    ❌ → not available
<list_files> with <folder_path>  ❌ → <list_files/> takes NO parameters (the folder is flat)
<grep> with <file_path> or <folder_path> ❌ → <grep> takes ONLY <search_term>
\`\`\`

## Tool Tag Validation Rules
1. NEVER invent new tool tags — only use the exact tags listed above.
2. Case-sensitive, lowercase with underscores (e.g. \`read_file\`, not \`readFile\`).
3. file_path is always a bare file name — never a path with folders.
4. list_files is written \`<list_files/>\` with no children.

## Self-Check Before Sending Response
- [ ] Every tool tag matches the valid list exactly — none invented
- [ ] list_files has no parameters; grep has only search_term
- [ ] Each tool has its required parameters (file_path; content; old_content + new_content; search_term)
- [ ] update_file closes with </new_content> (never </old_content>)

## Error Recovery
If you realize you used an invalid tool tag: STOP, pick the correct tool from the list above, rewrite the call, and re-check every other tool call in the response.
`;

export const DESIGN_TOOL_VALIDATION_JSON = `# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)

## Valid JSON Object Shapes (CRITICAL — MUST MATCH EXACTLY)
Every emitted block is a single JSON object inside its own fenced \`\`\`json block. Two legal shapes, distinguished by the top-level key:
- **Tool call** (\`"tool"\` key): \`{"tool":"<tool_name>","params":{ ... }}\`. Valid \`tool\` values: \`read_file\`, \`create_file\`, \`update_file\`, \`list_files\`, \`grep\`, \`conversation_title\`.
- **UI object** (\`"type"\` key, NO \`"tool"\` key): \`{"type":"markdown","content":"..."}\`. The only valid \`type\` value is \`markdown\`.

**Zero XML in JSON mode.** Do NOT emit \`<markdown>\`, \`<read_file>\`, or any other \`<...>\` tag — they will not be parsed.

## Common Invented-Tool Mistakes to AVOID
\`\`\`
{"tool":"write_to_file"}     ❌ → use "create_file"
{"tool":"replace_in_file"}   ❌ → use "update_file"
{"tool":"edit_file"}         ❌ → use "update_file"
{"tool":"find_files"}        ❌ → use "list_files" or "grep"
{"tool":"search_files"}      ❌ → use "grep"
{"tool":"delete_file"}       ❌ → not available
{"tool":"run_command"}       ❌ → not available
{"tool":"markdown"}          ❌ → use {"type":"markdown","content":"..."}
\`\`\`
- list_files takes NO parameters: \`{"tool":"list_files","params":{}}\`.
- grep takes ONLY \`search_term\` — no file_path or folder_path.

## JSON-Specific Mistakes to AVOID
- **Unescaped newlines**: write \\n, never a real line break inside a string value (applies to \`content\`, \`old_content\`, \`new_content\`).
- **Unescaped quotes**: a \`"\` inside a string value must be written \\\" — file contents are full of string literals.
- **Unescaped backslashes**: a literal backslash must be written \\\\ (especially in grep regexes).
- **HTML entities**: never write < > & " — write raw characters.
- **Multiple objects in one block**: exactly ONE object per fenced block; no arrays.
- **Wrong params key**: always \`params\` — never arguments, args, parameters, input, payload.
- **Wrong UI shape**: UI objects use \`"type"\`, NOT \`"tool"\`.
- **Trailing/missing commas** are invalid JSON.

## Self-Check Before Sending Response
- [ ] Every fenced \`\`\`json block parses with JSON.parse()
- [ ] Each block has exactly one object with either a \`"tool"\` or a \`"type"\` key — never both, never neither
- [ ] Every \`tool\` value is one of the valid names above
- [ ] No XML tag leaked into the response
- [ ] Each tool has its required params

## Error Recovery
If you emitted an invalid object: STOP, rewrite it as one valid parseable JSON object, and re-verify every other block in the response.
`;