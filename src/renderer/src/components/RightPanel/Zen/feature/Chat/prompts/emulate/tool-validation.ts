// Tool validation rules cho emulate mode — XML + JSON variants
export const EMULATE_TOOL_VALIDATION = `# TOOL VALIDATION & ERROR PREVENTION

## Valid Tool Tags (CRITICAL — MUST MATCH EXACTLY)
Only these tags are valid. Full parameters and usage syntax for each are documented in the TOOLS section above — this list exists purely to catch invented tool names, not to re-document usage:
\`list_https\`, \`get_https_detail\`, \`list_hosts\`, \`list_sources\`, \`get_source_detail\`, \`list_resources\`, \`get_resource_content\`, \`apply_filter\`, \`send_to_repeater\`, \`list_repeaters\`, \`delete_repeater\`, \`get_repeater_detail\`, \`update_repeater_content\`, \`run_repeater\`, \`list_reports\`, \`create_report\`, \`read_report\`, \`update_report\`, \`list_report_files\`, \`create_report_file\`, \`read_report_file\`, \`update_report_file\`, \`delete_report_file\`, \`execute_command\`.
Response-only tags (not tools): \`thinking\`, \`markdown\`, \`code\`, \`question\`.

## Common Invented-Tool Mistakes to AVOID
These tag names do NOT exist. If you are about to write one of these, STOP and use the real tool on the right instead:
\`\`\`
<list_requests>       ❌ → use <list_https>
<get_detail>          ❌ → use <get_https_detail>
<get_source>          ❌ → use <get_source_detail>
<list_files>          ❌ → use <list_sources> or <list_resources>
<read_file>           ❌ → use <get_source_detail> or <get_resource_content>
<write_file>          ❌ → use <create_report_file> or <update_report_file>
<send_request>        ❌ → use <send_to_repeater> or <run_repeater>
<filter>              ❌ → use <apply_filter>
<create_report_doc>   ❌ → use <create_report>
\`\`\`
For exact syntax and parameters of every real tool, see the TOOLS section above — re-check there rather than re-deriving syntax from memory if unsure.

## Tool Tag Validation Rules
1. NEVER invent new tool tags — only use the exact tags listed above.
2. Case-sensitive, lowercase with underscores (e.g. \`get_https_detail\`, not \`getHttpsDetail\` or \`Get_Https_Detail\`).
3. No abbreviations — use full tag names (e.g. \`update_repeater_content\`, not \`update_repeater\`).
4. \`list_sources\` vs \`list_resources\`: \`list_sources\` lists script/style source files (js/css/doc); \`list_resources\` lists media/binary resources (image/video/audio/font/document/wasm).
5. \`send_to_repeater\` vs \`run_repeater\`: \`send_to_repeater\` copies a captured request INTO the Repeater; \`run_repeater\` executes an existing Repeater entry.

## Self-Check Before Sending Response
Before outputting any tool calls, verify:
- [ ] Every tool tag matches the valid list exactly — none invented
- [ ] Tag names are lowercase with underscores
- [ ] LIST-BEFORE-DETAIL rules are satisfied (list_https → get_https_detail, list_sources → get_source_detail, list_resources → get_resource_content, list_repeaters → get/update/run/delete_repeater, list_reports → read/update/list_report_files/execute_command)
- [ ] Each tool has its required parameters (index, filepath, filename, report_id, repeater_id, etc.)

## Error Recovery
If you realize you've used an invalid tool tag:
1. STOP immediately
2. Identify the correct valid tool from the list above
3. Rewrite using the correct tool tag
4. Double-check all other tool calls in the response
`;

export const EMULATE_TOOL_VALIDATION_JSON = `# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)

## Valid JSON Object Shapes (CRITICAL — MUST MATCH EXACTLY)
Every emitted block is a single JSON object inside its own fenced \`\`\`json block. There are exactly TWO legal shapes — a tool call and a UI object — and they are distinguished by their top-level key:

**Shape 1 — Tool call (has a \`"tool"\` key):**
\`\`\`json
{"tool":"<tool_name>","params":{ ... }}
\`\`\`
Valid \`tool\` values (full parameters in TOOLS section above):
\`list_https\`, \`get_https_detail\`, \`list_hosts\`, \`list_sources\`, \`get_source_detail\`, \`list_resources\`, \`get_resource_content\`, \`apply_filter\`, \`send_to_repeater\`, \`list_repeaters\`, \`delete_repeater\`, \`get_repeater_detail\`, \`update_repeater_content\`, \`run_repeater\`, \`list_reports\`, \`create_report\`, \`read_report\`, \`update_report\`, \`list_report_files\`, \`create_report_file\`, \`read_report_file\`, \`update_report_file\`, \`delete_report_file\`, \`execute_command\`.

**Shape 2 — UI/render object (has a \`"type"\` key, NO \`"tool"\` key):**
\`\`\`json
{"type":"markdown","content":"..."}
{"type":"code","language":"json","content":"..."}
{"type":"question","questions":[ ... ]}
\`\`\`
Valid \`type\` values: \`markdown\`, \`code\`, \`question\`. These are NOT executable tools — the renderer consumes them. They replace the XML UI tags \`<markdown>\`, \`<code>\`, and \`<question>\` used in XML mode.

**Zero XML in JSON mode.** Do NOT emit \`<markdown>\`, \`<code>\`, \`<question>\`, \`<list_https>\`, or any other \`<...>\` tag anywhere in a JSON-mode response — those will not be parsed.

## Common Invented-Tool Mistakes to AVOID
These \`tool\` values do NOT exist. If you are about to emit one, STOP and use the real tool on the right instead:
\`\`\`
{"tool":"list_requests"}        ❌ → use "list_https"
{"tool":"get_detail"}           ❌ → use "get_https_detail"
{"tool":"get_source"}           ❌ → use "get_source_detail"
{"tool":"list_files"}           ❌ → use "list_sources" or "list_resources"
{"tool":"read_file"}            ❌ → use "get_source_detail" or "get_resource_content"
{"tool":"write_file"}           ❌ → use "create_report_file" or "update_report_file"
{"tool":"send_request"}         ❌ → use "send_to_repeater" or "run_repeater"
{"tool":"filter"}               ❌ → use "apply_filter"
{"tool":"create_report_doc"}    ❌ → use "create_report"
{"tool":"markdown"}             ❌ → use {"type":"markdown","content":"..."}
{"tool":"code"}                 ❌ → use {"type":"code","language":"...","content":"..."}
{"tool":"question"}             ❌ → use {"type":"question","questions":[...]}
\`\`\`
For exact syntax and parameters of every real tool, see the TOOLS section above — re-check there rather than re-deriving syntax from memory if unsure.

## JSON-Specific Mistakes to AVOID
These are the most common JSON-mode failures. Each fenced block MUST be valid, parseable JSON:
- **Unescaped newlines**: A real line break inside a string value makes the JSON invalid. Write the two characters \\n (backslash + n) instead of an actual line break. This applies to \`content\`, \`old_content\`, \`new_content\`, \`script\`, and any multi-line string.
- **Unescaped quotes**: A \`"\` inside a string value must be written as \\" . This applies especially to JSON content passed to \`update_repeater_content\` (which is itself JSON, with nested quotes).
- **Unescaped backslashes**: A literal backslash in a string value must be written as \\\\ .
- **HTML entities**: Never write \`<\`, \`>\`, \`&\`, \`"\` inside a JSON string value. Write the raw characters directly.
- **Multiple objects in one block**: Each fenced \`\`\`json block must contain EXACTLY ONE object. Emit a separate fenced block per object.
- **Wrong params key**: For tool calls, the parameter object is always under the key \`params\`. Do NOT use \`arguments\`, \`args\`, \`parameters\`, \`input\`, \`payload\`.
- **Wrong UI shape**: A UI object uses \`"type"\`, NOT \`"tool"\`.
- **XML tags anywhere**: Never emit any XML tag in JSON mode.
- **Missing/extra commas**: Trailing commas before \`}\` or \`]\` are invalid. Missing commas are also invalid.
- **String value wrapping**: Numbers, booleans, and arrays belong as their JSON-native types — do not wrap them in strings unless the schema explicitly says so.
- **Pretty-printed JSON for update_repeater_content**: When the \`old_content\`/\`new_content\` contains pretty-printed JSON (2-space indent, newlines), those newlines MUST be JSON-escaped as \\n in the outer JSON value. Example: \`"old_content": "[\\n  {\\n    \\\"key\\\": \\\"test1\\\"\\n  }\\n]"\`.

## Tool Call Validation Rules
1. NEVER invent new tool names or UI types — only use the exact names listed above.
2. Names are case-sensitive, lowercase with underscores.
3. No abbreviations — use the full name (e.g. \`update_repeater_content\`, not \`update_repeater\`).
4. \`list_sources\` vs \`list_resources\`: sources = js/css/doc files; resources = image/video/audio/font/document/wasm.
5. \`send_to_repeater\` vs \`run_repeater\`: send = copy captured request into Repeater; run = execute an existing Repeater entry.
6. Every fenced \`\`\`json block must parse successfully with \`JSON.parse()\` — verify before emitting.

## Self-Check Before Sending Response
Before outputting any JSON object, verify:
- [ ] Every fenced \`\`\`json block parses as valid JSON
- [ ] Each block contains EXACTLY ONE object, with top-level key either \`"tool"\` or \`"type"\`
- [ ] Every \`tool\` value is one of the valid names listed above — none invented
- [ ] Every \`type\` value is one of \`markdown\`, \`code\`, \`question\` — none invented
- [ ] No XML tag leaked into the response
- [ ] LIST-BEFORE-DETAIL rules are satisfied (list_https → get_https_detail, list_sources → get_source_detail, list_resources → get_resource_content, list_repeaters → get/update/run/delete_repeater, list_reports → read/update/list_report_files/execute_command)
- [ ] Each tool has its required params (index, filepath, filename, report_id, repeater_id, etc.)
- [ ] \`update_repeater_content\`: \`old_content\`/\`new_content\` preserve the EXACT pretty-printed JSON format (2-space indent + newlines), with all newlines escaped as \\n in the outer JSON value

## Error Recovery
If you realize you've emitted an invalid JSON object:
1. STOP immediately
2. Identify the correct valid shape from the list above (tool call vs UI object)
3. Rewrite the block as a single, valid, parseable JSON object
4. Re-verify every other fenced block in the response for the same class of error
`;