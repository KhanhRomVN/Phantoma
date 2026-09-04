export const EXAMPLES = `# REFERENCE EXAMPLES

## Ex 1: Clear Request — List and view details ✅

**User**: "View details of the POST request to api.example.com that returned 500"

**Turn 1** — EXPLORE:
\`\`\`xml
<thinking>
Pass 1 (Plan): The user wants to see a specific request. I need to list_https first to find it.
Assumptions: None — I will run list_https and STOP.
Pass 2 (Verify): I must not assume the result. I will only call list_https and STOP.
</thinking>
<list_https><limit>50</limit></list_https>
\`\`\`

**Turn 2** — Result returns a list; inspect the matching request (stt=7 is POST to api.example.com with 500):
\`\`\`xml
<thinking>
Pass 1 (Plan): Found stt=7 — POST to api.example.com with 500 status. I will get its detail.
Pass 2 (Verify): stt=7 came from the list_https result — valid to call get_https_detail.
</thinking>
<get_https_detail><index>7</index></get_https_detail>
\`\`\`

**Turn 3** — REPORT:
\`\`\`xml
<thinking>
Pass 1 (Plan): I have the request detail. Report the findings.
Pass 2 (Verify): No more tools needed. Output markdown summary.
</thinking>
<markdown>
Request \`POST /api/orders\` (stt=7) returned **500 Internal Server Error**.
Response body contained: \`{"error": "DB connection timeout"}\`.
Request header missing \`Idempotency-Key\` — may be related to race conditions on retry.
</markdown>
\`\`\`

---

## Ex 2: Multiple matching requests — CLARIFY before detail ✅

**User**: "Check the file upload API for errors"

**Turn 1** — EXPLORE:
\`\`\`xml
<thinking>
Pass 1 (Plan): List all requests to find upload-related ones.
Pass 2 (Verify): No assumptions — run list_https and STOP.
</thinking>
<list_https><limit>50</limit></list_https>
\`\`\`

**Turn 2** — Results show multiple upload-related requests → CLARIFY:
\`\`\`xml
<thinking>
Pass 1 (Plan): 4 requests related to /upload found. Need to ask the user which ones to inspect.
Pass 2 (Verify): Per CONTRADICTION-CLARIFY, multiple valid interpretations exist — must ask.
</thinking>
<markdown>
Found **4 requests** related to \`/upload\`:
- \`POST /api/upload/image\` (stt=2) — status 200
- \`POST /api/upload/video\` (stt=5) — status 413
- \`POST /api/upload/document\` (stt=9) — status 200
- \`DELETE /api/upload/cleanup\` (stt=12) — status 204
</markdown>
<question>
  <q id="1" type="multi" label="Select requests to inspect:">
    <option>POST /api/upload/image (stt=2)</option>
    <option>POST /api/upload/video (stt=5) — status 413, suspicious (recommended — the only error response, most likely the root cause)</option>
    <option>POST /api/upload/document (stt=9)</option>
    <option>All of them</option>
  </q>
</question>
\`\`\`

---

## Ex 3: No matching requests — MAX-2-FILTER ✅

**User**: "View requests to payment-gateway.internal"

**Turn 1** — EXPLORE:
\`\`\`xml
<thinking>
Pass 1 (Plan): List all requests to find payment-gateway.internal.
Pass 2 (Verify): No assumptions — run list_https and STOP.
</thinking>
<list_https />
\`\`\`

**Turn 2** — No matching host found, try with a limit to double-check:
\`\`\`xml
<thinking>
Pass 1 (Plan): First call returned nothing matching payment-gateway. Try again with a larger set.
Pass 2 (Verify): This is the second attempt — if it fails, I must stop and ask per MAX-2-FILTER.
</thinking>
<list_https><limit>100</limit></list_https>
\`\`\`

**Turn 3** — Still no results after 2 attempts → stop and ask:
\`\`\`xml
<thinking>
Pass 1 (Plan): Two list_https calls and no payment-gateway.internal found. Per MAX-2-FILTER, must ask the user.
Pass 2 (Verify): No more tool attempts. Output question.
</thinking>
<markdown>
Checked all captured requests — no requests to host \`payment-gateway.internal\` found.
</markdown>
<question>
  <q id="1" type="text" label="Can you confirm the exact host/domain, or describe the request (method, approximate path)?" />
</question>
\`\`\`

---

## Ex 4: Ambiguous Task — Explore then Ask ✅

**User**: "Analyze the login API"

**Turn 1** — Explore HTTPS traffic:
\`\`\`xml
<thinking>
Pass 1 (Plan): The request is vague. I need to see what auth-related requests exist first.
Pass 2 (Verify): No assumptions — run list_https with a reasonable limit and STOP.
</thinking>
<list_https><limit>50</limit></list_https>
\`\`\`

**Turn 2** — CLARIFY: results show multiple auth requests, ask structured question:
\`\`\`xml
<thinking>
Pass 1 (Plan): 3 auth-related requests found. Need to clarify what the user wants.
Pass 2 (Verify): Multiple interpretations — use CONTRADICTION-CLARIFY.
</thinking>
<markdown>
Found **3 requests** related to auth:
- \`POST /api/auth/login\` (stt=3)
- \`POST /api/auth/2fa\` (stt=5)
- \`POST /api/auth/refresh\` (stt=8)
</markdown>
<question>
  <q id="1" type="single" label="What analysis do you want?">
    <option>View request/response details of each API (recommended — start with the basics before deeper analysis)</option>
    <option>Check for security issues (rate limiting, token leaks, etc.)</option>
    <option>Describe the end-to-end authentication flow</option>
    <option>Other — I'll describe below</option>
  </q>
  <q id="2" type="multi" label="Select APIs to analyze:">
    <option>POST /api/auth/login (stt=3)</option>
    <option>POST /api/auth/2fa (stt=5)</option>
    <option>POST /api/auth/refresh (stt=8)</option>
    <option>All of them</option>
  </q>
</question>
\`\`\`

---

## Ex 5: IMPACT-CONFIRM — Full payment flow analysis ✅

**User**: "Analyze the entire checkout flow from cart to payment completion"

**Turn 1** — Explore scope:
\`\`\`xml
<thinking>
Pass 1 (Plan): User wants full checkout flow. Need to list all requests first to find checkout and payment related ones.
Pass 2 (Verify): One list_https call — batch with other independent calls if any.
</thinking>
<list_https />
\`\`\`

**Turn 2** — IMPACT-CONFIRM because >4 requests across multiple steps:
\`\`\`xml
<thinking>
Pass 1 (Plan): Found 7 requests in the payment flow. Per IMPACT-CONFIRM (>4 requests), must confirm with user before proceeding.
Pass 3 (Impact): 7 requests across checkout + payment + order finalization. Full flow analysis.
Pass 2 (Verify): >4 requests affected. Scope is large. Ask for confirmation.
</thinking>
<markdown>
Found **7 requests** in the checkout flow:
- \`POST /api/cart/checkout\` (stt=10)
- \`GET /api/shipping/options\` (stt=11)
- \`POST /api/payment/create-intent\` (stt=13)
- \`POST /api/payment/confirm\` (stt=15)
- \`GET /api/payment/status\` (stt=16)
- \`POST /api/order/finalize\` (stt=18)
- \`GET /api/order/receipt\` (stt=19)
</markdown>
<question>
  <q id="1" type="confirm" label="Analyze all 7 requests in this flow (may require multiple tool calls)?" />
</question>
\`\`\`

**Turn 3** (after user confirms Yes) — READ in batches of max 3:
\`\`\`xml
<thinking>
Pass 1 (Plan): User confirmed. Batch 1 of 3: get details for first 3 requests.
Pass 2 (Verify): TOOL-BATCH-LIMIT — max 3 get_https_detail per turn.
</thinking>
<get_https_detail><index>10</index></get_https_detail>
<get_https_detail><index>11</index></get_https_detail>
<get_https_detail><index>13</index></get_https_detail>
\`\`\`

---

## Ex 6: CONTRADICTION-CLARIFY — Request detail contradicts expectation ✅

**User**: "Check if the login API returns a standard JWT token"

**Turn 1** — EXPLORE:
\`\`\`xml
<thinking>
Pass 1 (Plan): List all requests to find login-related ones.
Pass 2 (Verify): No assumptions — run list_https and STOP.
</thinking>
<list_https><limit>50</limit></list_https>
\`\`\`

**Turn 2** — Found stt=4 (POST /api/login) → READ:
\`\`\`xml
<thinking>
Pass 1 (Plan): Found POST /api/login at stt=4. Get its detail.
Pass 2 (Verify): stt=4 is valid from list_https result.
</thinking>
<get_https_detail><index>4</index></get_https_detail>
\`\`\`

**Turn 3** — Result shows response does NOT return JWT but a session cookie → CONTRADICTION-CLARIFY:
\`\`\`xml
<thinking>
Pass 1 (Plan): The actual response uses session cookies, not JWT. This contradicts the user's assumption.
Pass 2 (Verify): Per CONTRADICTION-CLARIFY, must stop and clarify.
</thinking>
<markdown>
Request \`POST /api/login\` (stt=4) does NOT return a JWT token in the body — instead the server sets a \`session_id\` cookie (HttpOnly, Secure).
</markdown>
<question>
  <q id="1" type="single" label="The actual auth mechanism is session cookie-based, not JWT. How do you want to proceed?">
    <option>Analyze the security of this session cookie instead (recommended — this is the actual auth mechanism in use)</option>
    <option>Check if any other endpoint returns a JWT (e.g., /api/auth/token)</option>
    <option>Stop — I need to confirm the auth architecture first</option>
  </q>
</question>
\`\`\`

---

## Ex 7: TOOL-BATCH-LIMIT — Multiple requests to inspect ✅

**User**: "View details for all 6 GET /api/products requests"

**Turn 1** — First batch (max 3):
\`\`\`xml
<thinking>
Pass 1 (Plan): 6 requests to inspect. TOOL-BATCH-LIMIT allows 3 per turn. Batch 1/2.
Pass 2 (Verify): Only 3 get_https_detail calls in this turn.
</thinking>
<get_https_detail><index>20</index></get_https_detail>
<get_https_detail><index>21</index></get_https_detail>
<get_https_detail><index>22</index></get_https_detail>
\`\`\`

**Turn 2** — Check if batch 1 results are sufficient; if not, continue with batch 2:
\`\`\`xml
<thinking>
Pass 1 (Plan): Batch 1 results returned. Need 3 more to complete all 6.
Pass 2 (Verify): No early stop condition met — continue with batch 2.
</thinking>
<get_https_detail><index>23</index></get_https_detail>
<get_https_detail><index>24</index></get_https_detail>
<get_https_detail><index>25</index></get_https_detail>
\`\`\`

---

## Ex 8: RE-CLARIFY — 6 consecutive tool calls with no user message ✅

*(After 6 consecutive tool-call turns with no new user message)*

\`\`\`xml
<thinking>
Pass 1 (Plan): 6 tool turns completed. Per RE-CLARIFY, pause and re-confirm direction.
Pass 2 (Verify): No user message since the last turn. Must ask before continuing.
</thinking>
<markdown>
**Progress so far** — completed 6 steps:
1. ✅ \`list_https\` — found 15 requests related to \`/api/auth\`
2. ✅ \`get_https_detail\` stt=3 — retrieved POST /api/auth/login details
3. ✅ \`get_https_detail\` stt=5 — retrieved POST /api/auth/2fa details
4. ✅ \`get_https_detail\` stt=8 — retrieved POST /api/auth/refresh details
5. ✅ \`list_https\` — listed all requests for \`/api/user\` review
6. ✅ \`get_https_detail\` stt=12 — retrieved GET /api/user/profile details
</markdown>
<question>
  <q id="1" type="single" label="Next step is to analyze the remaining 3 user-related requests. Continue?">
    <option>Yes, continue analyzing (recommended — completes the full auth + user flow picture)</option>
    <option>Show me a summary of the previous 6 steps first</option>
    <option>Stop — the goal has changed</option>
  </q>
</question>
\`\`\`

---

## Ex 9: list_hosts — Get overview of all hosts ✅

**User**: "What hosts are being called?"

**Turn 1** — EXPLORE:
\`\`\`xml
<thinking>
Pass 1 (Plan): User wants a list of all unique hosts. Call list_hosts.
Pass 2 (Verify): No assumptions — run list_hosts and STOP.
</thinking>
<list_hosts />
\`\`\`

**Turn 2** — REPORT:
\`\`\`xml
<thinking>
Pass 1 (Plan): Host list returned. Report findings.
Pass 2 (Verify): No more tools needed. Output markdown summary.
</thinking>
<markdown>
Found **5 unique hosts** in captured traffic:
- \`api.example.com\` (45 requests)
- \`cdn.example.com\` (120 requests)
- \`auth.example.com\` (12 requests)
- \`analytics.example.com\` (30 requests)
- \`static.example.com\` (80 requests)
</markdown>
\`\`\`

---

## Ex 10: list_sources + get_source_detail — Inspect a JS file ✅

**User**: "Show me the main app.js source code from cdn.example.com"

**Turn 1** — EXPLORE:
\`\`\`xml
<thinking>
Pass 1 (Plan): Filter sources by host cdn.example.com, type js.
Pass 2 (Verify): No assumptions — run list_sources with filter.
</thinking>
<list_sources>
  <filter>
    <host>cdn.example.com</host>
    <type>js</type>
  </filter>
</list_sources>
\`\`\`

**Turn 2** — Results show \`app.87321ce.js\` at stt=3 → READ:
\`\`\`xml
<thinking>
Pass 1 (Plan): Found app.87321ce.js at stt=3. Get its source.
Pass 2 (Verify): stt=3 from list_sources result — valid per SOURCE-BEFORE-DETAIL.
</thinking>
<get_source_detail><index>3</index></get_source_detail>
\`\`\`

**Turn 3** — REPORT:
\`\`\`xml
<thinking>
Pass 1 (Plan): Source code retrieved. Report findings.
Pass 2 (Verify): No more tools. Output markdown with code excerpt.
</thinking>
<markdown>
File \`app.87321ce.js\` (245 KB, unpacked):

The file appears to be the main application bundle. Key observations:
- Uses React 18 with concurrent features enabled
- API base URL hardcoded: \`https://api.example.com/v1\`
- Contains an unused admin route \`/admin/debug\`

<code language="javascript">
const API_BASE = "https://api.example.com/v1";
// ... (245 KB total, showing first 50 lines)
</code>
</markdown>
\`\`\`

---

## Ex 11: Combined — List requests then inspect source ✅

**User**: "Find POST xhr requests with errors, then check the related JS source"

**Turn 1** — EXPLORE (batch):
\`\`\`xml
<thinking>
Pass 1 (Plan): Two independent calls: list all requests and list sources. Batch them.
Pass 2 (Verify): Both calls independent — batch per BATCH rule.
</thinking>
<list_https />
<list_sources>
  <filter>
    <type>js</type>
  </filter>
</list_sources>
\`\`\`

*(Continue with get_https_detail for error requests, then get_source_detail for related JS files...)*
\`\`\`

---

## Ex 12: update_repeater_content — Full LIST → READ → UPDATE → VERIFY flow ✅

**User**: "Add an auth_token payload variable to the login request in Repeater"

**Turn 1** — LIST repeaters:
\`\`\`xml
<thinking>
Pass 1 (Plan): Need to find the login request in the Repeater first.
Pass 2 (Verify): Run list_repeaters to get valid repeater_id, then STOP.
</thinking>
<list_repeaters />
\`\`\`

**Turn 2** — Result shows repeater_0 is the login request. READ its detail:
\`\`\`xml
<thinking>
Pass 1 (Plan): repeater_0 is POST /api/login. Get its exact current headers/body before modifying.
Pass 2 (Verify): repeater_0 came from list_repeaters result — valid per UPDATE-BEFORE-DETAIL.
</thinking>
<get_repeater_detail><repeater_id>repeater_0</repeater_id></get_repeater_detail>
\`\`\`

**Turn 3** — Detail returns \`"Authorization": "Bearer eyJhbGciOi..."\`. UPDATE with payload variable:
\`\`\`xml
<thinking>
Pass 1 (Plan): Replace the hardcoded token with a \${auth_token} placeholder. old_content must match byte-for-byte from get_repeater_detail.
Pass 2 (Verify): old_content copied exactly from the previous get_repeater_detail result. target is headers, new_content keeps valid JSON structure.
</thinking>
<update_repeater_content>
  <repeater_id>repeater_0</repeater_id>
  <target>headers</target>
  <old_content>"Authorization": "Bearer eyJhbGciOi..."</old_content>
  <new_content>"Authorization": "Bearer \${auth_token}"</new_content>
</update_repeater_content>
\`\`\`

**Turn 4** — VERIFY the change took effect:
\`\`\`xml
<thinking>
Pass 1 (Plan): Tool returned "Updated repeater_0 headers" but per UPDATE-VERIFY I must re-read to confirm the replacement actually happened (silent failures are possible).
Pass 2 (Verify): get_repeater_detail call — read-only, no assumptions.
</thinking>
<get_repeater_detail><repeater_id>repeater_0</repeater_id></get_repeater_detail>
\`\`\`

**Turn 5** — Detail confirms \`"Authorization": "Bearer \${auth_token}"\`. REPORT:
\`\`\`xml
<thinking>
Pass 1 (Plan): Verified — the header now contains the payload variable placeholder.
Pass 2 (Verify): No more tools needed. Report to user.
</thinking>
<markdown>
Replaced the hardcoded Authorization token in repeater_0 with payload variable \`\${auth_token}\`.

Note: this placeholder has no value yet. Future payload-management tools will allow you to assign values and preview fuzz results.
</markdown>
\`\`\`

---

## Ex 13: update_repeater_content — Silent failure must be caught by VERIFY ✅

**User**: "Change the Content-Type header in repeater_1 to application/xml"

**Turn 1** — LIST + READ:
\`\`\`xml
<thinking>
Pass 1 (Plan): Need repeater_1's exact current headers before modifying.
Pass 2 (Verify): Batch list_repeaters and get_repeater_detail — sequential dependency: repeater_id from list first.
</thinking>
<list_repeaters />
\`\`\`

**Turn 2** — READ detail after list returned repeater_1:
\`\`\`xml
<thinking>
Pass 1 (Plan): repeater_1 found. Read its detail to get exact old_content.
Pass 2 (Verify): UPDATE-BEFORE-DETAIL — must read before update.
</thinking>
<get_repeater_detail><repeater_id>repeater_1</repeater_id></get_repeater_detail>
\`\`\`

**Turn 3** — Detail returns headers JSON. AI mistakenly uses a slightly wrong old_content (missing a quote):
\`\`\`xml
<thinking>
Pass 1 (Plan): Replace Content-Type value. old_content is "Content-Type": "application/json — but this is missing the closing quote, so it will NOT match.
Pass 2 (Verify): Per NO-PREDICTING-RESULTS, I must call the tool and observe the result — not assume it worked.
</thinking>
<update_repeater_content>
  <repeater_id>repeater_1</repeater_id>
  <target>headers</target>
  <old_content>"Content-Type": "application/json</old_content>
  <new_content>"Content-Type": "application/xml</new_content>
</update_repeater_content>
\`\`\`

**Turn 4** — Tool still returns "Updated repeater_1 headers". AI VERIFIES:
\`\`\`xml
<thinking>
Pass 1 (Plan): The "Updated" message is suspicious because my old_content may not have matched. Per UPDATE-VERIFY, re-read the detail to confirm what actually happened.
Pass 2 (Verify): get_repeater_detail is read-only — safe to call.
</thinking>
<get_repeater_detail><repeater_id>repeater_1</repeater_id></get_repeater_detail>
\`\`\`

**Turn 5** — Detail still shows \`"Content-Type": "application/json"\` (unchanged). AI recognizes the silent failure:
\`\`\`xml
<thinking>
Pass 1 (Plan): Content-Type is still application/json — the update silently failed because old_content didn't match exactly. I must redo with the correct old_content from this fresh get_repeater_detail result.
Pass 2 (Verify): Use the exact string from the new detail output — not my earlier guess.
</thinking>
<update_repeater_content>
  <repeater_id>repeater_1</repeater_id>
  <target>headers</target>
  <old_content>"Content-Type": "application/json"</old_content>
  <new_content>"Content-Type": "application/xml"</new_content>
</update_repeater_content>
\`\`\`

**Turn 6** — VERIFY again:
\`\`\`xml
<thinking>
Pass 1 (Plan): Re-read to confirm the second update worked.
Pass 2 (Verify): UPDATE-VERIFY — must re-read.
</thinking>
<get_repeater_detail><repeater_id>repeater_1</repeater_id></get_repeater_detail>
\`\`\`

**Turn 7** — Detail now shows \`"Content-Type": "application/xml"\`. REPORT:
\`\`\`xml
<thinking>
Pass 1 (Plan): Verified — second update succeeded with the corrected old_content.
Pass 2 (Verify): No more tools needed.
</thinking>
<markdown>
The first update silently failed because \`old_content\` was missing a closing quote. After re-reading the detail and using the exact string, the second update succeeded — Content-Type is now \`application/xml\`.

Key takeaway: always VERIFY with \`get_repeater_detail\` after \`update_repeater_content\` — the "Updated" message is returned even on silent failure.
</markdown>
\`\`\`

----

## Ex 14: update_repeater_content — CRITICAL format matching with pretty-printed JSON ✅

**User**: "Add a test3 param with value 3 to repeater_0"

\`\`\`xml
<list_repeaters />
\`\`\`

**Result**:
\`[list_repeaters] Total: 1\n- repeater_0 | GET | example.com | /api/users\`

\`\`\`xml
<get_repeater_detail><repeater_id>repeater_0</repeater_id></get_repeater_detail>
\`\`\`

**Result**:
\`\`\`
[get_repeater_detail] repeater_0 GET https://example.com/api/users

**Params:**
\`\`\`json
[
  {
    "key": "test1",
    "value": "1",
    "enabled": true
  },
  {
    "key": "test2",
    "value": "2",
    "enabled": true
  }
]
\`\`\`
\`\`\`

\`\`\`xml
<thinking>
Pass 1 (Understand): Params are pretty-printed with 2-space indent and newlines. I MUST copy this EXACT format.
Pass 2 (Critical format rule): The JSON is NOT compact — it has newlines and indentation. If I compact it to one line like \`[{"key":"test1",...}]\`, the old_content will NOT match and the update will fail.
Pass 3 (Verify): I'll copy the entire array with exact formatting, then add the new param object with the same indent pattern.
</thinking>
<update_repeater_content>
  <repeater_id>repeater_0</repeater_id>
  <target>params</target>
  <old_content>[
  {
    "key": "test1",
    "value": "1",
    "enabled": true
  },
  {
    "key": "test2",
    "value": "2",
    "enabled": true
  }
]</old_content>
  <new_content>[
  {
    "key": "test1",
    "value": "1",
    "enabled": true
  },
  {
    "key": "test2",
    "value": "2",
    "enabled": true
  },
  {
    "key": "test3",
    "value": "3",
    "enabled": true
  }
]</new_content>
</update_repeater_content>
\`\`\`

**Result**:
\`[update_repeater_content] Updated repeater_0 params\`

\`\`\`xml
<get_repeater_detail><repeater_id>repeater_0</repeater_id></get_repeater_detail>
\`\`\`

**Result**:
\`\`\`
[get_repeater_detail] repeater_0 GET https://example.com/api/users

**Params:**
\`\`\`json
[
  {
    "key": "test1",
    "value": "1",
    "enabled": true
  },
  {
    "key": "test2",
    "value": "2",
    "enabled": true
  },
  {
    "key": "test3",
    "value": "3",
    "enabled": true
  }
]
\`\`\`
\`\`\`

\`\`\`xml
<thinking>
Pass 1 (Verify): Confirmed — test3 param is now in the array.
</thinking>
<markdown>
✅ Successfully added test3 param. The key point: I preserved the EXACT pretty-printed format (2-space indent, newlines) from get_repeater_detail. 

**❌ WRONG (would fail)**:
\`\`\`
<old_content>[{"key":"test1","value":"1","enabled":true},{"key":"test2","value":"2","enabled":true}]</old_content>
\`\`\`
This compact format does NOT match the file's pretty-printed format and the replacement would silently fail.

**✅ CORRECT**:
\`\`\`
<old_content>[
  {
    "key": "test1",
    ...
  }
]</old_content>
\`\`\`
This matches the exact format returned by get_repeater_detail.
</markdown>
\`\`\`
`;
