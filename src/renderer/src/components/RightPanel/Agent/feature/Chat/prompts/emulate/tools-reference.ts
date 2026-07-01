export const EMULATE_TOOLS_REFERENCE = `# EMULATE TOOLS

Use XML tags for all emulate tool calls:

<list_https><filter><method>string</method><host>string</host><path>string</path><status>number</status></filter><limit>number</limit><offset>number</offset></list_https>

<get_https_detail><index>number</index></get_https_detail>

---

## list_https — List captured HTTPS requests

Lists all captured HTTPS requests with optional filtering and pagination.

**Parameters:**
- \`<filter>\` (optional) — Filter criteria:
  - \`<method>\` — HTTP method (GET, POST, PUT, DELETE, etc.). Case-insensitive.
  - \`<host>\` — Hostname filter (partial match, e.g. "api.example.com" matches "https://api.example.com/v1/users").
  - \`<path>\` — Path filter (partial match, e.g. "/api/" matches "/api/users" and "/api/products").
  - \`<status>\` — HTTP status code (e.g. 200, 404, 500).
- \`<limit>\` (optional) — Maximum number of results to return (default: 100).
- \`<offset>\` (optional) — Number of results to skip for pagination (default: 0).

**Returns:** A list of matching requests, each with:
- \`stt\` — Sequential index (0-based) for use with \`get_https_detail\`
- \`method\` — HTTP method
- \`host\` — Hostname
- \`path\` — URL path
- \`status\` — HTTP status code
- \`size\` — Response size
- \`time\` — Request timestamp or duration
- \`type\` — Content type (e.g. "json", "html", "image", "script", "stylesheet")

**Example:**
\\\`\\\`\\\`xml
<list_https>
  <filter>
    <method>POST</method>
    <host>api.example.com</host>
    <status>200</status>
  </filter>
  <limit>20</limit>
</list_https>
\\\`\\\`\\\`

---

## get_https_detail — Get full request & response details

Retrieves the complete request and response data for a specific captured HTTPS request identified by its \`stt\` index from \`list_https\`.

**Parameters:**
- \`<index>\` (required) — The \`stt\` value from a \`list_https\` result. Must be a valid 0-based index.

**Returns:**
- \`request\` — Full request details:
  - \`method\`, \`url\`, \`host\`, \`path\`
  - \`headers\` — Request headers (key-value pairs)
  - \`body\` — Request body (if any)
  - \`cookies\` — Request cookies
- \`response\` — Full response details:
  - \`status\` — HTTP status code
  - \`headers\` — Response headers (key-value pairs)
  - \`body\` — Response body (truncated if >50KB)
  - \`cookies\` — Response cookies
- \`timing\` — Timing breakdown (dns, connect, ttfb, download, total)
- \`size\` — Request size, response size
- \`security\` — Any detected security issues (if analysis was run)

**Example:**
\\\`\\\`\\\`xml
<get_https_detail><index>3</index></get_https_detail>
\\\`\\\`\\\`

---

# RESPONSE TAGS

__THINKING_1__
<markdown>prose, tables, explanations</markdown>
<code language="ts">read-only display</code>

## <question> — Multi-Question Block

Use <question> to ask the user one or more questions at once. Each question is a <q> element.

**Schema:**
\`\`\`xml
<question>
  <q id="1" type="single" label="Question text here?">
    <option>Option A</option>
    <option>Option B</option>
    <option>Option C</option>
  </q>
  <q id="2" type="multi" label="Which features should be included?">
    <option>Auth</option>
    <option>Logging</option>
    <option>Cache</option>
    <option>Rate limiting</option>
  </q>
  <q id="3" type="text" label="What should the new module be named?" />
  <q id="4" type="confirm" label="This will modify 4 files. Proceed?" />
</question>
\`\`\`

**Supported types:**
- \`single\` — user picks exactly one option from the list
- \`multi\` — user picks one or more options from the list
- \`text\` — user types a free-form answer (no <option> children needed)
- \`confirm\` — yes/no question, renders as two buttons: Yes / No (no <option> children needed)

**Rules:**
- Always include a \`label\` attribute — this is the displayed question text.
- Always include an \`id\` attribute — used to reference answers.
- \`type="text"\` and \`type="confirm"\` must NOT have <option> children.
- \`type="single"\` and \`type="multi"\` must have at least 2 <option> children.
- Group related questions into one <question> block rather than asking in separate turns.
- Use <question> any time you have uncertainty — do not silently assume an answer.

---

**Important:**
- Always run \`list_https\` first to discover available requests and their \`stt\` indices.
- Use \`get_https_detail\` to inspect specific requests identified during \`list_https\`.
- Do NOT call \`get_https_detail\` with an index that was not returned by a recent \`list_https\` call.
- Results from \`get_https_detail\` may be large — analyze only what's relevant to the task.`;
