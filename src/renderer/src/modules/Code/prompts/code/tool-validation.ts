/**
 * Tool validation — the "# TOOL VALIDATION & ERROR PREVENTION" section.
 *
 * Cùng khung với example.ts / tools-reference.ts: mỗi format (xml · json) có một
 * bộ mảnh cùng tên, rồi ghép theo format ở cuối file.
 *
 *   TITLE            tiêu đề
 *   VALID            tool / shape hợp lệ + quy tắc hình dạng của format
 *   INVENTED         bảng "tên tool bịa" → tool đúng
 *   FORMAT_MISTAKES  lỗi riêng của format (chỉ json cần)
 *   RULES            quy tắc đặt tên / validate
 *   SELF_CHECK       checklist trước khi gửi
 *   RECOVERY         cách sửa khi đã dùng sai
 */

import { type ToolFormat } from "./tool-format";

// ─────────────────────────────────────────────────────────────────────────────
// XML
// ─────────────────────────────────────────────────────────────────────────────

const VALIDATION_TITLE_XML = `# TOOL VALIDATION & ERROR PREVENTION`;

const VALIDATION_VALID_XML = `## Valid Tool Tags (CRITICAL — MUST MATCH EXACTLY)
Only these tags are valid. Full parameters and usage syntax for each are documented in the TOOLS section above — this list exists purely to catch invented tool names, not to re-document usage:
\`read_file\`, \`write_to_file\`, \`replace_in_file\`, \`list_files\`, \`find_files\`, \`grep\`, \`delete_file\`, \`run_command\`, \`read_skill\`, \`read_memory\`, \`update_memory\`.
Response-only tags (not tools): \`conversation_title\`, \`markdown\`, \`code\`, \`question\`.`;

const VALIDATION_INVENTED_XML = `## Common Invented-Tool Mistakes to AVOID
These tag names do NOT exist. If you are about to write one of these, STOP and use the real tool on the right instead:
\`\`\`
<search_files>   ❌ → use <grep> or <find_files>
<replace_file>   ❌ → use <replace_in_file>
<edit_file>      ❌ → use <replace_in_file> or <write_to_file>
<create_file>    ❌ → use <write_to_file>
<update_file>    ❌ → use <replace_in_file>
<modify_file>    ❌ → use <replace_in_file>
<get_file>       ❌ → use <read_file>

\`\`\`
For exact syntax and parameters of every real tool, see the TOOLS section above — re-check there rather than re-deriving syntax from memory if unsure.`;

const VALIDATION_RULES_XML = `## Tool Tag Validation Rules
1. NEVER invent new tool tags — only use the exact tags listed above.
2. Case-sensitive, lowercase with underscores (e.g. \`read_file\`, not \`readFile\` or \`Read_File\`).
3. No abbreviations — use full tag names (e.g. \`replace_in_file\`, not \`replace\`).
4. find_files vs grep: \`<find_files>\` locates files by name/pattern; \`<grep>\` searches text inside files.`;

const VALIDATION_SELF_CHECK_XML = `## Self-Check Before Sending Response
Before outputting any tool calls, verify:
- [ ] Every tool tag matches the valid list exactly — none invented
- [ ] Tag names are lowercase with underscores
- [ ] Each tool has its required parameters (file_path, folder_path, file_name, etc.)`;

const VALIDATION_RECOVERY_XML = `## Error Recovery
If you realize you've used an invalid tool tag:
1. STOP immediately
2. Identify the correct valid tool from the list above
3. Rewrite using the correct tool tag
4. Double-check all other tool calls in the response
`;

// ─────────────────────────────────────────────────────────────────────────────
// JSON
// ─────────────────────────────────────────────────────────────────────────────

const VALIDATION_TITLE_JSON = `# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)`;

const VALIDATION_VALID_JSON = `## Valid JSON Object Shapes (CRITICAL — MUST MATCH EXACTLY)
Every emitted block is a single JSON object inside its own fenced \`\`\`json block. There are exactly TWO legal shapes — a tool call and a UI object — and they are distinguished by their top-level key:

**Shape 1 — Tool call (has a \`"tool"\` key):**
\`\`\`json
{"tool":"<tool_name>","params":{ ... }}
\`\`\`
Valid \`tool\` values (full parameters in TOOLS section above):
\`read_file\`, \`write_to_file\`, \`replace_in_file\`, \`list_files\`, \`find_files\`, \`grep\`, \`delete_file\`, \`run_command\`, \`read_skill\`, \`read_memory\`, \`update_memory\`, \`conversation_title\`.

**Shape 2 — UI/render object (has a \`"type"\` key, NO \`"tool"\` key):**
\`\`\`json
{"type":"markdown","content":"..."}
{"type":"code","language":"ts","content":"..."}
{"type":"question","questions":[ ... ]}
\`\`\`
Valid \`type\` values: \`markdown\`, \`code\`, \`question\`. These are NOT executable tools — the renderer consumes them.`;

const VALIDATION_INVENTED_JSON = `## Common Invented-Tool Mistakes to AVOID
These \`tool\` values do NOT exist. If you are about to emit one, STOP and use the real tool on the right instead:
\`\`\`
{"tool":"search_files"}     ❌ → use "grep" or "find_files"
{"tool":"replace_file"}     ❌ → use "replace_in_file"
{"tool":"edit_file"}        ❌ → use "replace_in_file" or "write_to_file"
{"tool":"create_file"}      ❌ → use "write_to_file"
{"tool":"update_file"}      ❌ → use "replace_in_file"
{"tool":"modify_file"}      ❌ → use "replace_in_file"
{"tool":"get_file"}         ❌ → use "read_file"

{"tool":"markdown"}         ❌ → use {"type":"markdown","content":"..."}
{"tool":"code"}             ❌ → use {"type":"code","language":"...","content":"..."}
{"tool":"question"}         ❌ → use {"type":"question","questions":[...]}
\`\`\`
For exact syntax and parameters of every real tool, see the TOOLS section above — re-check there rather than re-deriving syntax from memory if unsure.`;

const VALIDATION_FORMAT_MISTAKES_JSON = `## JSON-Specific Mistakes to AVOID
These are the most common JSON-mode failures. Each fenced block MUST be valid, parseable JSON:
- **Unescaped newlines**: A real line break inside a string value makes the JSON invalid. Write the two characters \\n (backslash + n) instead of an actual line break. This applies to \`content\`, \`old_content\`, \`new_content\`, \`label\`, and any multi-line string.
- **Unescaped quotes**: A \`"\` inside a string value must be written as \\" . This applies especially to file contents that themselves contain string literals.
- **Unescaped backslashes**: A literal backslash in a string value must be written as \\\\ . This applies especially to regex search terms passed to \`grep\`.
- **HTML entities**: Never write \`&lt;\`, \`&gt;\`, \`&amp;\`, \`&quot;\` inside a JSON string value. Write the raw characters directly (\`<\`, \`>\`, \`&\`, \`"\`).
- **Multiple objects in one block**: Each fenced \`\`\`json block must contain EXACTLY ONE object — either one tool call OR one UI object. Do NOT put an array of calls, or two adjacent objects, in the same block. Emit a separate fenced block per object.
- **Wrong params key**: For tool calls, the parameter object is always under the key \`params\`. Do NOT use \`arguments\`, \`args\`, \`parameters\`, \`input\`, \`payload\`, or any other key name.
- **Wrong UI shape**: A UI object uses \`"type"\`, NOT \`"tool"\`. Emitting \`{"tool":"markdown",...}\` is an invented tool — use \`{"type":"markdown","content":"..."}\`.

- **Missing/extra commas**: Trailing commas before \`}\` or \`]\` are invalid in strict JSON. Missing commas between fields are also invalid.
- **String value wrapping**: Numbers, booleans, and arrays belong as their JSON-native types — do not wrap them in strings unless the schema explicitly says so.`;

const VALIDATION_RULES_JSON = `## Tool Call Validation Rules
1. NEVER invent new tool names or UI types — only use the exact names listed above.
2. Names are case-sensitive, lowercase with underscores (e.g. \`"read_file"\`, not \`"readFile"\`).
3. No abbreviations — use the full name (e.g. \`"replace_in_file"\`, not \`"replace"\`).
4. \`find_files\` vs \`grep\`: \`find_files\` locates files by name/pattern; \`grep\` searches text inside files.
5. Every fenced \`\`\`json block must parse successfully with \`JSON.parse()\` — verify before emitting.`;

const VALIDATION_SELF_CHECK_JSON = `## Self-Check Before Sending Response
Before outputting any JSON object, verify:
- [ ] Every fenced \`\`\`json block parses as valid JSON (no trailing commas; all newlines, quotes, and backslashes escaped)
- [ ] Each block contains EXACTLY ONE object, and its top-level key is either \`"tool"\` (tool call) or \`"type"\` (UI object) — never both, never neither
- [ ] Every \`tool\` value is one of the valid names listed above — none invented
- [ ] Every \`type\` value is one of \`markdown\`, \`code\`, \`question\` — none invented

- [ ] Each tool has its required params (\`file_path\`, \`folder_path\`, \`file_name\`, etc.)
- [ ] Each \`question\` object's inner questions follow the schema (single/multi need \`options\`, text/confirm must not have \`options\`)`;

const VALIDATION_RECOVERY_JSON = `## Error Recovery
If you realize you've emitted an invalid JSON object:
1. STOP immediately
2. Identify the correct valid shape from the list above (tool call vs UI object)
3. Rewrite the block as a single, valid, parseable JSON object
4. Re-verify every other fenced block in the response for the same class of error
`;

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP BY FORMAT
// ─────────────────────────────────────────────────────────────────────────────

/** Ghép các mảnh theo thứ tự cố định; mảnh rỗng bị bỏ qua. */
const assemble = (...parts: string[]): string =>
  parts.filter((part) => part.length > 0).join("\n\n");

export const TOOL_VALIDATION_XML = assemble(
  VALIDATION_TITLE_XML,
  VALIDATION_VALID_XML,
  VALIDATION_INVENTED_XML,
  VALIDATION_RULES_XML,
  VALIDATION_SELF_CHECK_XML,
  VALIDATION_RECOVERY_XML,
);

export const TOOL_VALIDATION_JSON = assemble(
  VALIDATION_TITLE_JSON,
  VALIDATION_VALID_JSON,
  VALIDATION_INVENTED_JSON,
  VALIDATION_FORMAT_MISTAKES_JSON,
  VALIDATION_RULES_JSON,
  VALIDATION_SELF_CHECK_JSON,
  VALIDATION_RECOVERY_JSON,
);

const VALIDATIONS: Record<ToolFormat, string> = {
  xml: TOOL_VALIDATION_XML,
  json: TOOL_VALIDATION_JSON,
};

export const getToolValidation = (format: ToolFormat): string =>
  VALIDATIONS[format];
