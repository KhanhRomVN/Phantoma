// Tool validation rules cho recon mode — XML + JSON variants
export const RECON_TOOL_VALIDATION = `# TOOL VALIDATION & ERROR PREVENTION

## Valid Tool Tags (CRITICAL — MUST MATCH EXACTLY)
Only these tags are valid. Full parameters and usage syntax for each are documented in the TOOLS section above — this list exists purely to catch invented tool names, not to re-document usage:
\`list_tabs\`, \`create_tab\`, \`close_tab\`, \`switch_tab\`, \`navigate\`, \`back\`, \`forward\`, \`reload\`, \`get_page_content\`, \`list_elements\`, \`list_frames\`, \`capture_screenshot\`, \`click_element\`, \`fill_input\`, \`clear_input\`, \`select_option\`, \`hover\`, \`upload_file\`, \`press_key\`, \`scroll\`, \`scroll_to_element\`, \`wait_for\`, \`evaluate_js\`, \`read_file\`, \`create_file\`, \`update_file\`, \`list_files\`, \`delete_file\`.
Response-only tags (not tools): \`thinking\`, \`markdown\`, \`code\`, \`question\`.

## Common Invented-Tool Mistakes to AVOID
These tag names do NOT exist. If you are about to write one of these, STOP and use the real tool on the right instead:
\`\`\`
<list_pages>         ❌ → use <list_tabs>
<open_url>           ❌ → use <navigate>
<goto>               ❌ → use <navigate>
<get_content>        ❌ → use <get_page_content>
<get_html>           ❌ → use <get_page_content>
<click>              ❌ → use <click_element>
<type_text>          ❌ → use <fill_input>
<fill>               ❌ → use <fill_input>
<select>             ❌ → use <select_option>
<press>              ❌ → use <press_key>
<execute_js>         ❌ → use <evaluate_js>
<run_script>         ❌ → use <evaluate_js>
<take_screenshot>    ❌ → use <capture_screenshot>
<wait>               ❌ → use <wait_for>
\`\`\`
For exact syntax and parameters of every real tool, see the TOOLS section above — re-check there rather than re-deriving syntax from memory if unsure.

## Tool Tag Validation Rules
1. NEVER invent new tool tags — only use the exact tags listed above.
2. Case-sensitive, lowercase with underscores (e.g. \`get_page_content\`, not \`getPageContent\` or \`Get_Page_Content\`).
3. No abbreviations — use full tag names (e.g. \`scroll_to_element\`, not \`scroll_to\`).
4. \`scroll\` vs \`scroll_to_element\`: \`scroll\` scrolls the page by direction/amount; \`scroll_to_element\` scrolls directly to a known element ref.
5. \`fill_input\` vs \`clear_input\`: \`fill_input\` clears then types new value; \`clear_input\` only clears.
6. \`click_element\` vs \`hover\`: \`click_element\` clicks; \`hover\` moves the mouse over (for menus/tooltips).

## Self-Check Before Sending Response
Before outputting any tool calls, verify:
- [ ] Every tool tag matches the valid list exactly — none invented
- [ ] Tag names are lowercase with underscores
- [ ] LIST-BEFORE-ACTION rules are satisfied (list_tabs before tab actions, get_page_content/list_elements before element actions)
- [ ] Each tool has its required parameters (ref, url, tabId, key, direction, condition, etc.)
- [ ] \`evaluate_js\` is only used after an IMPACT-CONFIRM question

## Error Recovery
If you realize you've used an invalid tool tag:
1. STOP immediately
2. Identify the correct valid tool from the list above
3. Rewrite using the correct tool tag
4. Double-check all other tool calls in the response
`;

export const RECON_TOOL_VALIDATION_JSON = `# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)

## Valid JSON Object Shapes (CRITICAL — MUST MATCH EXACTLY)
Every emitted block is a single JSON object inside its own fenced \`\`\`json block. There are exactly TWO legal shapes — a tool call and a UI object — and they are distinguished by their top-level key:

**Shape 1 — Tool call (has a \`"tool"\` key):**
\`\`\`json
{"tool":"<tool_name>","params":{ ... }}
\`\`\`
Valid \`tool\` values (full parameters in TOOLS section above):
\`list_tabs\`, \`create_tab\`, \`close_tab\`, \`switch_tab\`, \`navigate\`, \`back\`, \`forward\`, \`reload\`, \`get_page_content\`, \`list_elements\`, \`list_frames\`, \`capture_screenshot\`, \`click_element\`, \`fill_input\`, \`clear_input\`, \`select_option\`, \`hover\`, \`upload_file\`, \`press_key\`, \`scroll\`, \`scroll_to_element\`, \`wait_for\`, \`evaluate_js\`, \`read_file\`, \`create_file\`, \`update_file\`, \`list_files\`, \`delete_file\`.

**Shape 2 — UI/render object (has a \`"type"\` key, NO \`"tool"\` key):**
\`\`\`json
{"type":"markdown","content":"..."}
{"type":"code","language":"ts","content":"..."}
{"type":"question","questions":[ ... ]}
\`\`\`
Valid \`type\` values: \`markdown\`, \`code\`, \`question\`. These are NOT executable tools — the renderer consumes them. They replace the XML UI tags \`<markdown>\`, \`<code>\`, and \`<question>\` used in XML mode.

**Zero XML in JSON mode.** Do NOT emit \`<markdown>\`, \`<code>\`, \`<question>\`, \`<list_tabs>\`, or any other \`<...>\` tag anywhere in a JSON-mode response — those will not be parsed.

## Common Invented-Tool Mistakes to AVOID
These \`tool\` values do NOT exist. If you are about to emit one, STOP and use the real tool on the right instead:
\`\`\`
{"tool":"list_pages"}       ❌ → use "list_tabs"
{"tool":"open_url"}         ❌ → use "navigate"
{"tool":"goto"}             ❌ → use "navigate"
{"tool":"get_content"}      ❌ → use "get_page_content"
{"tool":"get_html"}         ❌ → use "get_page_content"
{"tool":"click"}            ❌ → use "click_element"
{"tool":"type_text"}        ❌ → use "fill_input"
{"tool":"fill"}             ❌ → use "fill_input"
{"tool":"select"}           ❌ → use "select_option"
{"tool":"press"}            ❌ → use "press_key"
{"tool":"execute_js"}       ❌ → use "evaluate_js"
{"tool":"run_script"}       ❌ → use "evaluate_js"
{"tool":"take_screenshot"}  ❌ → use "capture_screenshot"
{"tool":"wait"}             ❌ → use "wait_for"
{"tool":"markdown"}         ❌ → use {"type":"markdown","content":"..."}
{"tool":"code"}             ❌ → use {"type":"code","language":"...","content":"..."}
{"tool":"question"}         ❌ → use {"type":"question","questions":[...]}
\`\`\`
For exact syntax and parameters of every real tool, see the TOOLS section above — re-check there rather than re-deriving syntax from memory if unsure.

## JSON-Specific Mistakes to AVOID
These are the most common JSON-mode failures. Each fenced block MUST be valid, parseable JSON:
- **Unescaped newlines**: A real line break inside a string value makes the JSON invalid. Write the two characters \\n (backslash + n) instead of an actual line break. This applies to \`script\`, \`value\`, \`label\`, \`content\`, and any multi-line string.
- **Unescaped quotes**: A \`"\` inside a string value must be written as \\" . This applies especially to \`evaluate_js\` scripts that contain JS string literals, and to \`fill_input\` values that contain quotes.
- **Unescaped backslashes**: A literal backslash in a string value must be written as \\\\ . This applies especially to \`evaluate_js\` scripts using regex.
- **HTML entities**: Never write \`<\`, \`>\`, \`&\`, \`"\` inside a JSON string value. Write the raw characters directly.
- **Multiple objects in one block**: Each fenced \`\`\`json block must contain EXACTLY ONE object. Emit a separate fenced block per object.
- **Wrong params key**: For tool calls, the parameter object is always under the key \`params\`. Do NOT use \`arguments\`, \`args\`, \`parameters\`, \`input\`, \`payload\`.
- **Wrong UI shape**: A UI object uses \`"type"\`, NOT \`"tool"\`.
- **XML tags anywhere**: Never emit any XML tag in JSON mode.
- **Missing/extra commas**: Trailing commas before \`}\` or \`]\` are invalid. Missing commas are also invalid.
- **String value wrapping**: Numbers, booleans, and arrays belong as their JSON-native types — do not wrap them in strings unless the schema explicitly says so (e.g. \`visibleOnly\` is a boolean, \`limit\`/\`offset\`/\`timeoutMs\`/\`amount\` are numbers).

## Tool Call Validation Rules
1. NEVER invent new tool names or UI types — only use the exact names listed above.
2. Names are case-sensitive, lowercase with underscores.
3. No abbreviations — use the full name (e.g. \`scroll_to_element\`, not \`scroll_to\`).
4. \`scroll\` vs \`scroll_to_element\`: scroll = direction/amount; scroll_to_element = known ref.
5. \`fill_input\` vs \`clear_input\`: fill = clear + type; clear = clear only.
6. \`click_element\` vs \`hover\`: click = actual click; hover = mouse over only.
7. Every fenced \`\`\`json block must parse successfully with \`JSON.parse()\` — verify before emitting.

## Self-Check Before Sending Response
Before outputting any JSON object, verify:
- [ ] Every fenced \`\`\`json block parses as valid JSON
- [ ] Each block contains EXACTLY ONE object, with top-level key either \`"tool"\` or \`"type"\`
- [ ] Every \`tool\` value is one of the valid names listed above — none invented
- [ ] Every \`type\` value is one of \`markdown\`, \`code\`, \`question\` — none invented
- [ ] No XML tag leaked into the response
- [ ] LIST-BEFORE-ACTION rules are satisfied (list_tabs before tab actions, get_page_content/list_elements before element actions)
- [ ] Each tool has its required params (ref, url, tabId, key, direction, condition, etc.)
- [ ] \`evaluate_js\` is only used after an IMPACT-CONFIRM question

## Error Recovery
If you realize you've emitted an invalid JSON object:
1. STOP immediately
2. Identify the correct valid shape from the list above (tool call vs UI object)
3. Rewrite the block as a single, valid, parseable JSON object
4. Re-verify every other fenced block in the response for the same class of error
`;