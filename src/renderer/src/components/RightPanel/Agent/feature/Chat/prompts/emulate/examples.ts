export const EXAMPLES = `# REFERENCE PATTERNS

## Ex 1: Clear Request — Filter and view details ✅

**User**: "View details of the POST request to api.example.com that returned 500"

**Turn 1** — EXPLORE:
\`\`\`xml
<thinking>
Pass 1 (Plan): The user wants to see a specific request. I need to filter list_https by method, host, and status.
Pass 2 (Verify): No assumptions — I will run list_https and STOP.
</thinking>
<list_https>
  <filter>
    <method>POST</method>
    <host>api.example.com</host>
    <status>500</status>
  </filter>
</list_https>
\`\`\`

**Turn 2** — Result returns a single request (stt=7) → READ:
\`\`\`xml
<thinking>
Pass 1 (Plan): Only one request matched. I will get its detail.
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
Pass 1 (Plan): Search for requests with "/upload" in the path.
Pass 2 (Verify): No assumptions — run list_https and STOP.
</thinking>
<list_https>
  <filter>
    <path>/upload</path>
  </filter>
</list_https>
\`\`\`

**Turn 2** — Results show multiple matches → CLARIFY:
\`\`\`xml
<thinking>
Pass 1 (Plan): 4 requests match. Need to ask the user which ones to inspect.
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
    <option>POST /api/upload/video (stt=5) — status 413, suspicious</option>
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
Pass 1 (Plan): Filter by host payment-gateway.internal.
Pass 2 (Verify): No assumptions — run list_https and STOP.
</thinking>
<list_https>
  <filter>
    <host>payment-gateway.internal</host>
  </filter>
</list_https>
\`\`\`

**Turn 2** — No results, try broader filter:
\`\`\`xml
<thinking>
Pass 1 (Plan): First filter returned nothing. Try partial match "payment".
Pass 2 (Verify): This is the second attempt — if it fails, I must stop and ask per MAX-2-FILTER.
</thinking>
<list_https>
  <filter>
    <host>payment</host>
  </filter>
</list_https>
\`\`\`

**Turn 3** — Still no results after 2 filters → stop and ask:
\`\`\`xml
<thinking>
Pass 1 (Plan): Two filters failed. Per MAX-2-FILTER, must ask the user.
Pass 2 (Verify): No more tool attempts. Output question.
</thinking>
<markdown>
Tried filtering by host \`payment-gateway.internal\` and \`payment\` — no matching requests found in captured data.
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
Pass 2 (Verify): No assumptions — run list_https and STOP.
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
    <option>View request/response details of each API</option>
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
Pass 1 (Plan): User wants full checkout flow. Need to find all related requests via list_https with multiple filters.
Pass 2 (Verify): Two independent filters — batch them in one message.
</thinking>
<list_https>
  <filter>
    <path>/checkout</path>
  </filter>
</list_https>
<list_https>
  <filter>
    <path>/payment</path>
  </filter>
</list_https>
\`\`\`

**Turn 2** — IMPACT-CONFIRM because >5 requests across multiple steps:
\`\`\`xml
<thinking>
Pass 1 (Plan): Found 7 requests in the payment flow. Per IMPACT-CONFIRM, must confirm with user before proceeding.
Pass 2 (Verify): >5 requests affected. Scope is large. Ask for confirmation.
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
Pass 1 (Plan): Find login requests.
Pass 2 (Verify): No assumptions — run list_https and STOP.
</thinking>
<list_https>
  <filter>
    <path>/login</path>
    <method>POST</method>
  </filter>
</list_https>
\`\`\`

**Turn 2** — READ:
\`\`\`xml
<thinking>
Pass 1 (Plan): One request matched. Get its detail.
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
    <option>Analyze the security of this session cookie instead</option>
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

## Ex 8: RE-CLARIFY — 3 consecutive tool turns with no user message ✅

*(After 3 consecutive tool-call turns with no new user message)*

\`\`\`xml
<thinking>
Pass 1 (Plan): 3 tool turns completed. Per RE-CLARIFY, pause and re-confirm direction.
Pass 2 (Verify): No user message since the last turn. Must ask before continuing.
</thinking>
<markdown>
**Progress so far** — completed 3 steps:
1. ✅ \`list_https\` — found 15 requests related to \`/api/auth\`
2. ✅ \`get_https_detail\` stt=3 — retrieved POST /api/auth/login details
3. ✅ \`get_https_detail\` stt=5 — retrieved POST /api/auth/2fa details
</markdown>
<question>
  <q id="1" type="single" label="Next step is to analyze the token refresh detail (stt=8). Continue?">
    <option>Yes, continue analyzing</option>
    <option>Show me a summary of the previous 2 steps first</option>
    <option>Stop — the goal has changed</option>
  </q>
</question>
\`\`\`
`;