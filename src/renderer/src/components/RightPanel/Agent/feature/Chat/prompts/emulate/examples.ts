export const EXAMPLES = `# REFERENCE EXAMPLES

## Ex 1: Explore HTTPS Traffic (2-turn)

**Turn 1** — List requests then STOP:
\`\`\`xml
__THINKING_1__
<list_https><limit>20</limit></list_https>
\`\`\`

**Turn 2** — Report results:
\`\`\`xml
__THINKING_2__
<markdown>
Đã capture được **15 HTTPS requests**. Các request nổi bật:
- \`POST /api/auth/login\` — 200 OK (stt=3)
- \`GET /api/user/profile\` — 200 OK (stt=7)
- \`POST /api/data/submit\` — 401 Unauthorized (stt=12)
</markdown>
\`\`\`

---

## Ex 2: Inspect Request Detail (3-turn)

**Turn 1** — List to find target:
\`\`\`xml
__THINKING_3__
<list_https>
  <filter>
    <method>POST</method>
    <path>login</path>
  </filter>
  <limit>10</limit>
</list_https>
\`\`\`

**Turn 2** — Get detail:
\`\`\`xml
__THINKING_4__
<get_https_detail><index>3</index></get_https_detail>
\`\`\`

**Turn 3** — Analyze and report:
\`\`\`xml
__THINKING_5__
<markdown>
**Phân tích \`POST /api/auth/login\` (stt=3):**

Request body gửi lên:
\`\`\`json
{"email": "user@example.com", "password": "***"}
\`\`\`

Response trả về:
\`\`\`json
{"token": "eyJhbGciOi...", "expires_in": 3600}
\`\`\`

API sử dụng JWT authentication, token hết hạn sau 1 giờ.
</markdown>
\`\`\`

---

## Ex 3: File Edit (3-turn)

**Turn 1** — Read then STOP:
\`\`\`xml
__THINKING_6__
<read_file><file_path>src/utils.ts</file_path></read_file>
\`\`\`

**Turn 2** — Edit and STOP:
\`\`\`xml
__THINKING_7__
<replace_in_file>
<file_path>src/utils.ts</file_path>
<diff>
<<<<<<< SEARCH
export function add(a: number, b: number) {
  return a + b;
}
=======
export function add(a: number, b: number) {
  return a + b;
}

export function subtract(a: number, b: number) {
  return a - b;
}
>>>>>>> REPLACE
</diff>
</replace_in_file>
\`\`\`

**Turn 3** — Final Summary:
\`\`\`xml
__THINKING_8__
<markdown>
Đã thêm hàm \`subtract\` vào \`src/utils.ts\`.
</markdown>
\`\`\`

---

## Ex 4: Ambiguous Task — Explore then Ask ✅

**User**: "Phân tích API đăng nhập"

**Turn 1** — Explore HTTPS traffic:
\`\`\`xml
__THINKING_9__
<list_https><limit>50</limit></list_https>
\`\`\`

**Turn 2** — CLARIFY: findings reveal multiple login-related requests, ask structured question:
\`\`\`xml
__THINKING_10__
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
    <option>Viết tài liệu mô tả flow authentication</option>
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

## Ex 5: IMPACT-CONFIRM — Large scope change ✅

**User**: "Đổi tên biến apiUrl thành baseUrl ở tất cả file"

**Turn 1** — Explore scope:
\`\`\`xml
__THINKING_11__
<grep><search_term>apiUrl</search_term><folder_path>src</folder_path></grep>
\`\`\`

**Turn 2** — IMPACT-CONFIRM:
\`\`\`xml
__THINKING_12__
<markdown>
Tìm thấy **8 files** tham chiếu \`apiUrl\`:
- \`src/services/api.ts\`
- \`src/hooks/useApi.ts\`
- \`src/components/Config.tsx\`
- \`src/utils/fetch.ts\`
- \`src/types/config.ts\`
- \`src/main/ipc/config.handlers.ts\`
- \`src/renderer/App.tsx\`
- \`tests/api.test.ts\`
</markdown>
<question>
  <q id="1" type="confirm" label="Đổi apiUrl → baseUrl ở tất cả 8 files?" />
</question>
\`\`\`

---

## Ex 6: Command Execution ✅

**Turn 1** — Offer:
\`\`\`xml
__THINKING_13__
<markdown>Lệnh cần chạy là \`npm run build\`.</markdown>
<question>
  <q id="1" type="confirm" label="Chạy lệnh ngay bây giờ?" />
</question>
\`\`\`

**Turn 2** — Execute:
\`\`\`xml
__THINKING_14__
<run_command><command>cd /path/to/project && npm run build</command></run_command>
\`\`\`

**Turn 3** — Complete:
\`\`\`xml
__THINKING_15__
<markdown>
Lệnh \`npm run build\` đã chạy thành công.
</markdown>
\`\`\`

---

## Ex 7: MID-TASK-CLARIFY — Read reveals contradiction ✅

**User**: "Thêm validation cho hàm login"

**Turn 1** — Read:
\`\`\`xml
__THINKING_16__
<read_file><file_path>src/auth.service.ts</file_path></read_file>
\`\`\`

**Turn 2** — READ reveals existing validation. MID-TASK-CLARIFY:
\`\`\`xml
__THINKING_17__
<markdown>
Hàm \`login\` trong \`auth.service.ts\` đã có Zod validation ở dòng 42. Bạn muốn xử lý thế nào?
</markdown>
<question>
  <q id="1" type="single" label="Validation đã tồn tại. Bạn muốn:">
    <option>Mở rộng Zod schema với rules mới</option>
    <option>Thêm validation layer thủ công trước Zod</option>
    <option>Thay Zod bằng custom validation</option>
    <option>Validation hiện tại chưa đủ — để tôi mô tả thêm</option>
  </q>
</question>
\`\`\`

---

## Ex 8: RE-CLARIFY — 3 consecutive tool turns ✅

*(After 3 tool-call turns with no user message)*

\`\`\`xml
__THINKING_18__
<markdown>
**Progress check** — Đã hoàn thành 3 bước:
1. ✅ \`list_https\` — tìm thấy 15 requests
2. ✅ \`get_https_detail\` stt=3 — đã lấy chi tiết POST /api/auth/login
3. ✅ \`read_file\` auth.service.ts — đã đọc file
</markdown>
<question>
  <q id="1" type="single" label="Bước tiếp theo là phân tích JWT token. Tiếp tục?">
    <option>Có, tiếp tục phân tích</option>
    <option>Cho tôi xem kết quả bước 2 trước</option>
    <option>Dừng — mục tiêu đã thay đổi</option>
  </q>
</question>
\`\`\`
`;