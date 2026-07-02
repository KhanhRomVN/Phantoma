export const EXAMPLES = `# REFERENCE PATTERNS

## Ex 1: Yêu cầu rõ ràng — Lọc và xem chi tiết ✅

**User**: "Xem chi tiết request POST tới api.example.com bị lỗi 500"

**Turn 1** — EXPLORE:
\`\`\`xml
__THINKING_4__
<list_https>
  <filter>
    <method>POST</method>
    <host>api.example.com</host>
    <status>500</status>
  </filter>
</list_https>
\`\`\`

**Turn 2** — kết quả trả về 1 request duy nhất (stt=7) → READ:
\`\`\`xml
__THINKING_5__
<get_https_detail><index>7</index></get_https_detail>
\`\`\`

**Turn 3** — REPORT:
\`\`\`xml
__THINKING_6__
<markdown>
Request \`POST /api/orders\` (stt=7) trả về **500 Internal Server Error**.
Body response chứa thông báo lỗi: \`{"error": "DB connection timeout"}\`.
Header request thiếu \`Idempotency-Key\`, có thể liên quan đến race condition khi retry.
</markdown>
\`\`\`

---

## Ex 2: Nhiều request khớp — CLARIFY trước khi xem chi tiết ✅

**User**: "Kiểm tra API upload file có lỗi gì không"

**Turn 1** — EXPLORE:
\`\`\`xml
__THINKING_7__
<list_https>
  <filter>
    <path>/upload</path>
  </filter>
</list_https>
\`\`\`

**Turn 2** — kết quả trả về nhiều request khớp → CLARIFY:
\`\`\`xml
__THINKING_8__
<markdown>
Tìm thấy **4 request** liên quan \`/upload\`:
- \`POST /api/upload/image\` (stt=2) — status 200
- \`POST /api/upload/video\` (stt=5) — status 413
- \`POST /api/upload/document\` (stt=9) — status 200
- \`DELETE /api/upload/cleanup\` (stt=12) — status 204
</markdown>
<question>
  <q id="1" type="multi" label="Chọn request cần xem chi tiết:">
    <option>POST /api/upload/image (stt=2)</option>
    <option>POST /api/upload/video (stt=5) — status 413, khả nghi</option>
    <option>POST /api/upload/document (stt=9)</option>
    <option>Tất cả</option>
  </q>
</question>
\`\`\`

---

## Ex 3: Không tìm thấy request phù hợp — MAX-2-FILTER ✅

**User**: "Xem request gọi tới payment-gateway.internal"

**Turn 1** — EXPLORE:
\`\`\`xml
__THINKING_9__
<list_https>
  <filter>
    <host>payment-gateway.internal</host>
  </filter>
</list_https>
\`\`\`

**Turn 2** — không có kết quả, thử lọc rộng hơn:
\`\`\`xml
__THINKING_10__
<list_https>
  <filter>
    <host>payment</host>
  </filter>
</list_https>
\`\`\`

**Turn 3** — vẫn không có kết quả sau 2 lần lọc → dừng, hỏi người dùng:
\`\`\`xml
__THINKING_11__
<markdown>
Đã thử lọc theo host \`payment-gateway.internal\` và \`payment\` nhưng không tìm thấy request nào phù hợp trong dữ liệu đã capture.
</markdown>
<question>
  <q id="1" type="text" label="Bạn có thể xác nhận lại chính xác host/domain, hoặc mô tả thêm về request cần tìm (method, path gần đúng)?" />
</question>
\`\`\`

---

## Ex 4: Ambiguous Task — Explore rồi Hỏi ✅

**User**: "Phân tích API đăng nhập"

**Turn 1** — Explore HTTPS traffic:
\`\`\`xml
__THINKING_12__
<list_https><limit>50</limit></list_https>
\`\`\`

**Turn 2** — CLARIFY: kết quả cho thấy nhiều request liên quan auth, đặt câu hỏi có cấu trúc:
\`\`\`xml
__THINKING_13__
<markdown>
Tìm thấy **3 request** liên quan đến auth:
- \`POST /api/auth/login\` (stt=3)
- \`POST /api/auth/2fa\` (stt=5)
- \`POST /api/auth/refresh\` (stt=8)
</markdown>
<question>
  <q id="1" type="single" label="Bạn muốn phân tích gì?">
    <option>Xem chi tiết request/response của từng API</option>
    <option>Kiểm tra lỗ hổng bảo mật (thiếu rate limit, token leak,...)</option>
    <option>Mô tả flow authentication end-to-end</option>
    <option>Khác — tôi sẽ mô tả bên dưới</option>
  </q>
  <q id="2" type="multi" label="Chọn API cần phân tích:">
    <option>POST /api/auth/login (stt=3)</option>
    <option>POST /api/auth/2fa (stt=5)</option>
    <option>POST /api/auth/refresh (stt=8)</option>
    <option>Tất cả</option>
  </q>
</question>
\`\`\`

---

## Ex 5: IMPACT-CONFIRM — Phân tích cả một flow lớn ✅

**User**: "Phân tích toàn bộ flow thanh toán, từ giỏ hàng đến khi thanh toán xong"

**Turn 1** — Explore scope:
\`\`\`xml
__THINKING_14__
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

**Turn 2** — IMPACT-CONFIRM vì liên quan >5 request thuộc nhiều bước:
\`\`\`xml
__THINKING_15__
<markdown>
Tìm thấy **7 request** thuộc flow thanh toán:
- \`POST /api/cart/checkout\` (stt=10)
- \`GET /api/shipping/options\` (stt=11)
- \`POST /api/payment/create-intent\` (stt=13)
- \`POST /api/payment/confirm\` (stt=15)
- \`GET /api/payment/status\` (stt=16)
- \`POST /api/order/finalize\` (stt=18)
- \`GET /api/order/receipt\` (stt=19)
</markdown>
<question>
  <q id="1" type="confirm" label="Phân tích chi tiết cả 7 request trong flow này (có thể tốn nhiều tool call)?" />
</question>
\`\`\`

**Turn 3** (sau khi user xác nhận Yes) — READ theo batch tối đa 3:
\`\`\`xml
__THINKING_16__
<get_https_detail><index>10</index></get_https_detail>
<get_https_detail><index>11</index></get_https_detail>
<get_https_detail><index>13</index></get_https_detail>
\`\`\`

---

## Ex 6: MID-TASK-CLARIFY — Chi tiết request mâu thuẫn với kỳ vọng ✅

**User**: "Kiểm tra API login có trả JWT token đúng chuẩn không"

**Turn 1** — EXPLORE:
\`\`\`xml
__THINKING_17__
<list_https>
  <filter>
    <path>/login</path>
    <method>POST</method>
  </filter>
</list_https>
\`\`\`

**Turn 2** — READ:
\`\`\`xml
__THINKING_18__
<get_https_detail><index>4</index></get_https_detail>
\`\`\`

**Turn 3** — kết quả cho thấy response KHÔNG trả JWT mà là session cookie → MID-TASK-CLARIFY:
\`\`\`xml
__THINKING_19__
<markdown>
Request \`POST /api/login\` (stt=4) không trả JWT token trong body như giả định ban đầu — thay vào đó server set cookie \`session_id\` (HttpOnly, Secure).
</markdown>
<question>
  <q id="1" type="single" label="Cơ chế xác thực thực tế là session cookie, không phải JWT. Bạn muốn tiếp tục thế nào?">
    <option>Phân tích độ an toàn của session cookie này thay vì JWT</option>
    <option>Kiểm tra xem có endpoint nào khác trả JWT không (ví dụ /api/auth/token)</option>
    <option>Dừng — tôi cần xác nhận lại kiến trúc auth trước</option>
  </q>
</question>
\`\`\`

---

## Ex 7: TOOL-BATCH-LIMIT — Nhiều request cần xem chi tiết ✅

**User**: "Xem chi tiết cả 6 request GET /api/products đã tìm được"

**Turn 1** — Batch đầu tiên (tối đa 3):
\`\`\`xml
__THINKING_20__
<get_https_detail><index>20</index></get_https_detail>
<get_https_detail><index>21</index></get_https_detail>
<get_https_detail><index>22</index></get_https_detail>
\`\`\`

**Turn 2** — sau khi có kết quả batch 1, kiểm tra đã đủ thông tin chưa; nếu chưa, tiếp batch 2:
\`\`\`xml
__THINKING_21__
<get_https_detail><index>23</index></get_https_detail>
<get_https_detail><index>24</index></get_https_detail>
<get_https_detail><index>25</index></get_https_detail>
\`\`\`

---

## Ex 8: RE-CLARIFY — 3 lượt tool liên tiếp không có tin nhắn từ user ✅

*(Sau 3 lượt gọi tool liên tiếp không có tin nhắn mới từ người dùng)*

\`\`\`xml
__THINKING_22__
<markdown>
**Tiến độ hiện tại** — đã hoàn thành 3 bước:
1. ✅ \`list_https\` — tìm thấy 15 request liên quan đến \`/api/auth\`
2. ✅ \`get_https_detail\` stt=3 — đã lấy chi tiết POST /api/auth/login
3. ✅ \`get_https_detail\` stt=5 — đã lấy chi tiết POST /api/auth/2fa
</markdown>
<question>
  <q id="1" type="single" label="Bước tiếp theo là phân tích chi tiết token refresh (stt=8). Tiếp tục?">
    <option>Có, tiếp tục phân tích</option>
    <option>Cho tôi xem tóm tắt 2 bước trước đó trước</option>
    <option>Dừng — mục tiêu phân tích đã thay đổi</option>
  </q>
</question>
\`\`\`
`;
