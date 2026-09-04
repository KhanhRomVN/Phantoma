<!--
⚠️ NOTICE: This file is for DOCUMENTATION ONLY (human reference).
This .md file is NOT used as AI prompt.
To update AI tool instructions, edit: tools-reference.ts
-->

# Công Cụ Emulate

## Phần 1: Tool Chủ Động

Các tool này cần được AI gọi bằng lệnh XML tương ứng.

---

### 1. `list_https`
Liệt kê các request HTTPS đã được bắt giữ.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `filter.method` | Không | Lọc theo HTTP method (GET, POST, ...) |
| `filter.host` | Không | Lọc theo host — khớp một phần, không phân biệt hoa thường |
| `filter.path` | Không | Lọc theo path — khớp một phần, không phân biệt hoa thường |
| `filter.status` | Không | Lọc theo status code |
| `limit` | Không | Số lượng request tối đa trả về (mặc định 50) |

Trả về danh sách phẳng, mỗi dòng là `- request_<number> | method | status | host | path | size`. Trong đó `request_<number>` là indexing mapping ổn định (1-indexed) dựa trên thứ tự gốc trước filter, dùng để mapping với `get_https_detail`.
**Ví dụ:**
```
<list_https><limit>5</limit></list_https>
```

**Kết quả:**

[list_https] Total: 142, Filtered: 12, Showing: 5
- request_1 | GET | 200 | api.example.com | /v1/users | 2.3 KB
- request_2 | GET | 200 | api.example.com | /v1/products?page=1 | 1.8 KB
- request_3 | GET | 304 | api.example.com | /v1/categories | 0 B
- request_4 | GET | 200 | api.example.com | /v1/users/42 | 1.2 KB
- request_5 | GET | 401 | api.example.com | /v1/auth/me | 0.5 KB
```

---

### 2. `get_https_detail`
Lấy toàn bộ chi tiết request/response của một request HTTPS đã được bắt giữ.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `index` | **Có** | Indexing mapping từ `list_https` trước đó — chấp nhận số hoặc `request_<number>` (vd `request_4`) |
⚠️ Luôn gọi `list_https` trước khi gọi `get_https_detail`.

Trả về đầy đủ chi tiết: method, URL, request headers, request body, response status, response headers, response body.

**Ví dụ:**
```
<get_https_detail><index>request_4</index></get_https_detail>
```

**Kết quả:**
```
[get_https_detail] Request #4
--- Request ---
Method:  GET
URL:     https://api.example.com/v1/users/42
Headers: {
  "Accept": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
}

Body:    (empty)

--- Response ---
Status:  200
Headers: {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-cache",
  "x-request-id": "req_8f3a2b1c"
}

Body:    {
  "id": 42,
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "role": "admin",
  "created_at": "2025-06-15T08:30:00Z"
}
```

---

### 3. `list_hosts`
Liệt kê tất cả host duy nhất từ traffic HTTPS đã bắt giữ, kèm số lượng request tương ứng.

Không có tham số.

Trả về danh sách phẳng, mỗi dòng là `- host (count)`, sắp xếp theo `count` giảm dần.

**Ví dụ:**
```
<list_hosts />
```

**Kết quả:**

[list_hosts] Total unique hosts: 5
- api.example.com (47)
- cdn.example.com (23)
- analytics.example.com (8)
- fonts.googleapis.com (3)
- js.stripe.com (2)
```

---

### 4. `list_sources`
Liệt kê các file nguồn (scripts, stylesheets) từ traffic đã bắt giữ, dạng danh sách phẳng với đường dẫn đầy đủ.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `filter.host` | Không | Lọc theo tên miền — khớp một phần, không phân biệt hoa thường |
| `filter.type` | Không | Loại tài nguyên: `js`, `css`, `doc`, `other` |

⚠️ Luôn gọi `list_sources` trước khi gọi `get_source_detail`.

Trả về danh sách phẳng: mỗi dòng là `- domain/path/file.js (size)`. Dùng đường dẫn đầy đủ này làm tham số `filepath` cho `get_source_detail`.

**Ví dụ:**
```
<list_sources>
  <filter>
    <host>cdn.example.com</host>
    <type>js</type>
  </filter>
</list_sources>
```

**Kết quả:**
```
[list_sources] Total: 7, Filtered: 7

- cdn.example.com/assets/app.min.js (156.2 KB)
- cdn.example.com/assets/vendor.chunk.js (892.4 KB)
- cdn.example.com/assets/runtime.js (12.1 KB)
- cdn.example.com/static/js/main.js (45.8 KB)
- cdn.example.com/static/js/utils.js (8.3 KB)
- cdn.example.com/third-party/analytics.js (23.7 KB)
- cdn.example.com/third-party/pixel.js (5.0 KB)
```

---

### 5. `get_source_detail`
Lấy toàn bộ mã nguồn của một file cụ thể từ danh sách nguồn.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `filepath` | **Có** | Đường dẫn đầy đủ của file từ kết quả `list_sources` trước đó |

⚠️ Luôn gọi `list_sources` trước khi gọi `get_source_detail`.

Trả về tên file, đường dẫn, URL, kích thước, loại nguồn (unpacked source hoặc original source), và toàn bộ mã nguồn (đã được định dạng lại nếu bị rút gọn). Nếu mã nguồn quá dài (>50000 ký tự), sẽ bị cắt bớt và có ghi chú.

**Ví dụ:**
```
<get_source_detail><filepath>cdn.example.com/static/js/utils.js</filepath></get_source_detail>
```

**Kết quả:**
```
[get_source_detail] File: utils.js
Path: cdn.example.com/static/js/utils.js
URL: https://cdn.example.com/static/js/utils.js
Size: 8.3 KB
Source: unpacked source

/**
 * Utility functions for the application
 * @version 2.1.0
 */
const Utils = (() => {
  function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  return { formatCurrency };
})();
```

---

### 6. `list_resources`
Liệt kê tất cả file resource thu thập được (images, videos, audios, fonts, documents, wasm).

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `filter.type` | Không | Lọc theo loại: `image`, `video`, `audio`, `font`, `document`, `wasm` |

⚠️ Luôn gọi `list_resources` trước khi gọi `get_resource_content`.

Trả về danh sách phẳng: mỗi dòng là `- filename (type, size, content-type)`. Dùng `filename` làm tham số cho `get_resource_content`.

**Ví dụ:**
```
<list_resources>
  <filter>
    <type>image</type>
  </filter>
</list_resources>
```

**Kết quả:**
```
[list_resources] Total: 15, Filtered: 8

- logo.png (image, 45.2 KB, image/png)
- banner.jpg (image, 234.1 KB, image/jpeg)
- avatar.svg (image, 12.8 KB, image/svg+xml)
```

---

### 7. `get_resource_content`
Lấy nội dung của một file resource cụ thể (hỗ trợ line range cho text resource).

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `filename` | **Có** | Tên file từ kết quả `list_resources` trước đó |
| `start_line` | Không | Dòng bắt đầu (1-indexed). Chỉ cho text-based resource. |
| `end_line` | Không | Dòng kết thúc (1-indexed). Chỉ cho text-based resource. |

⚠️ Luôn gọi `list_resources` trước khi gọi `get_resource_content`.

Trả về thông tin file (type, filename, content-type, size, URL) và nội dung (cho text resource) hoặc metadata (cho binary resource). Text resource mặc định giới hạn 1000 dòng đầu.

**Ví dụ:**
```
<get_resource_content>
  <filename>custom-font.woff2</filename>
  <start_line>1</start_line>
  <end_line>50</end_line>
</get_resource_content>
```

**Kết quả:**
```
[get_resource_content] Resource: custom-font.woff2
Type: font
Filename: custom-font.woff2
Content-Type: font/woff2
Size: 87.3 KB
URL: https://cdn.example.com/fonts/custom-font.woff2
Lines: 1-50 of 120

@font-face {
  font-family: 'CustomFont';
  src: url('custom-font.woff2') format('woff2');
}
```

---

### 8. `apply_filter`
Thay đổi filter hiện tại của bảng request. Kiểm tra `<filter_context>` để biết trạng thái hiện tại trước khi gọi.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `methods` | Không | Danh sách method với action: `hide` hoặc `show`. VD: `<methods><method action="hide">OPTIONS</method></methods>` |
| `statuses` | Không | Danh sách status code với action: `hide` hoặc `show`. VD: `<statuses><status action="hide">404</status></statuses>` |
| `types` | Không | Danh sách resource type với action: `hide` hoặc `show`. VD: `<types><type action="hide">css</type></types>` |
| `hosts` | Không | Danh sách host với action: `add` hoặc `remove`. VD: `<hosts><host action="add">api.example.com</host></hosts>` |
| `paths` | Không | Danh sách path với action: `add` hoặc `remove`. VD: `<paths><path action="add">/api/v2</path></paths>` |
| `size` | Không | Khoảng size: `<size min="100" max="5000" />` |
| `time` | Không | Khoảng time: `<time min="0.5" max="3.0" />` |

Có thể gửi nhiều tham số trong cùng 1 lần gọi. Các tham số được áp dụng đồng thời.

**Ví dụ:**
```
<apply_filter>
  <methods><method action="hide">OPTIONS</method></methods>
  <types><type action="hide">css</type></types>
  <hosts><host action="add">api.example.com</host></hosts>
</apply_filter>
```

**Kết quả:**

[apply_filter] Applied: Methods: OPTIONS(hide); Types: css(hide); Hosts: api.example.com(add)


---

### 9. `send_to_repeater`
Thêm một request HTTPS đã bắt giữ vào Repeater.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `index` | **Có** | Indexing mapping từ `list_https` trước đó — chấp nhận số hoặc `request_<number>` (vd `request_4`) |
⚠️ Luôn gọi `list_https` trước khi gọi `send_to_repeater`.

**Ví dụ:**

<send_to_repeater><index>request_4</index></send_to_repeater>


**Kết quả:**

[send_to_repeater] Added request_4 to repeater


---

### 10. `list_repeaters`
Liệt kê tất cả request hiện đang lưu trong Repeater.

Không có tham số.

Trả về danh sách phẳng, mỗi dòng là `- repeater_<number> | method | host | path`. Trong đó `repeater_<number>` là indexing mapping dùng cho `delete_repeater`.

**Ví dụ:**

<list_repeaters />


**Kết quả:**

[list_repeaters] Total: 2
- repeater_0 | POST | api.example.com | /v1/login
- repeater_1 | GET | api.example.com | /v1/users/42


---

### 11. `delete_repeater`
Xóa một request khỏi Repeater.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `repeater_id` | **Có** | Indexing mapping từ kết quả `list_repeaters` trước đó. Format: `repeater_<number>` |

⚠️ Luôn gọi `list_repeaters` trước khi gọi `delete_repeater`.

**Ví dụ:**

<delete_repeater><repeater_id>repeater_1</repeater_id></delete_repeater>


**Kết quả:**

[delete_repeater] Removed repeater_1


---

### 12. `get_repeater_detail`
Lấy param, header và body của một request trong Repeater.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `repeater_id` | **Có** | Indexing mapping từ kết quả `list_repeaters` trước đó. Format: `repeater_<number>` |

⚠️ Luôn gọi `list_repeaters` trước khi gọi `get_repeater_detail`.

**CẤU TRÚC DỮ LIỆU JSON TRẢ VỀ (QUAN TRỌNG — ĐỌC KỸ):**
- **Tool hiển thị NỘI DUNG THẬT của file** — không thêm, bớt, hay giả định gì cả
- **`Params`**: Nội dung thực của file params.json. Thường là mảng `[{key, value, enabled}, ...]` hoặc `[]`. Nếu file rỗng hoàn toàn thì code block sẽ rỗng
- **`Headers`**: Nội dung thực của file headers.json. Thường là mảng `[{id, key, value, enabled}, ...]` hoặc `[]`. Nếu file rỗng hoàn toàn thì code block sẽ rỗng
- **`Body`**: Nội dung thực của file body.json. Có thể là chuỗi rỗng `""`, JSON stringify, hoặc text thô. Nếu file rỗng hoàn toàn thì code block sẽ rỗng
- **Khi dùng `update_repeater_content`**: Copy CHÍNH XÁC nội dung trong code block (có thể là rỗng, `[]`, `""`, hoặc JSON phức tạp)

**Ví dụ:**

<get_repeater_detail><repeater_id>repeater_1</repeater_id></get_repeater_detail>


**Kết quả (khi có dữ liệu):**

[get_repeater_detail] repeater_1 GET https://api.example.com/users

**Params:**
```json
[
  {
    "key": "page",
    "value": "1",
    "enabled": true
  },
  {
    "key": "limit",
    "value": "20",
    "enabled": true
  }
]
```

**Headers:**
```json
[
  {
    "id": "abc-123",
    "key": "Accept",
    "value": "application/json",
    "enabled": true
  },
  {
    "id": "def-456",
    "key": "Authorization",
    "value": "Bearer eyJhbGciOi...",
    "enabled": true
  }
]
```

**Body:** 
```json
{"username": "test"}
```

**Kết quả (khi file rỗng):**

[get_repeater_detail] repeater_0 GET https://chat.deepseek.com/api/v0/users/current

**Params:**
```json
```

**Headers:**
```json
[
  {
    "id": "abc-123",
    "key": "Authorization",
    "value": "Bearer token",
    "enabled": true
  }
]
```

**Body:**
```json
```



---

### 13. `run_repeater`
Chạy một request trong Repeater. Tool hoạt động giống như click button "Send" ở RequestBar:
- Nếu **KHÔNG có payload** enabled → chạy 1 lần đơn giản
- Nếu **CÓ payload** enabled → tự động chạy với cartesian combinations và trả về danh sách kết quả

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `repeater_id` | **Có** | Indexing mapping từ `list_repeaters`. Format: `repeater_<number>` |

⚠️ Luôn gọi `list_repeaters` trước khi gọi `run_repeater`.

**Tự động lưu history:**
- Mỗi lần chạy được tự động lưu vào history
- History giới hạn tối đa 30 entries per repeater (FIFO queue)
- Không cần lưu manually

**Xử lý payload tự động:**
- Tool tự động phát hiện và replace `${tên_biến}` trong params, headers, body
- Nếu có nhiều payload enabled, tự động chạy cartesian product (tất cả combinations)
- Giới hạn tối đa 100 runs để tránh spam

**Kết quả trả về:**
- **1 phiên** (không có payload): Chi tiết đầy đủ response body và response headers
- **Nhiều phiên** (có payload): Danh sách tóm tắt với STT, status, duration, payload values

**Ví dụ (không có payload):**

<run_repeater><repeater_id>repeater_0</repeater_id></run_repeater>


**Kết quả:**

[run_repeater] GET https://api.example.com/users

Status: 200
Duration: 145ms

--- Response Headers ---
{
  "content-type": "application/json",
  "cache-control": "no-cache"
}

--- Response Body ---
{"users": [...]}


**Ví dụ (có payload):**
Giả sử repeater có payload `user_id` với values `[1, 2, 3]` và URL là `https://api.example.com/users/${user_id}`

<run_repeater><repeater_id>repeater_0</repeater_id></run_repeater>


**Kết quả:**

[run_repeater] GET https://api.example.com/users/${user_id}

Total Runs: 3
Success: 3/3
Avg Duration: 152ms

--- Results ---
1. ✓ Status: 200 | Duration: 145ms | Payload: user_id=1
2. ✓ Status: 200 | Duration: 158ms | Payload: user_id=2
3. ✓ Status: 200 | Duration: 149ms | Payload: user_id=3


---

### 14. `update_repeater_content`
Cập nhật nội dung `params`, `headers` hoặc `body` của một request trong Repeater. Cơ chế `old_content`/`new_content` giống `replace_in_file` bên code tools. **Đây là tool DUY NHẤT dùng để thêm payload variable vào request — đồng thời là tool phức tạp và dễ lỗi nhất trong nhóm Repeater.**

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `repeater_id` | **Có** | Indexing mapping từ `list_repeaters`. Format: `repeater_<number>` |
| `target` | **Có** | Thành phần cần cập nhật: `params`, `headers`, hoặc `body` |
| `old_content` | **Có** | Đoạn nội dung cũ — phải khớp chính xác từng ký tự, kể cả khoảng trắng và dấu ngoặc kép |
| `new_content` | **Có** | Đoạn nội dung mới thay thế — có thể chứa payload variable `${tên_biến}` |

⚠️ Thẻ đóng của `new_content` phải là `</new_content>`, không được viết nhầm `</old_content>`.

**CẤU TRÚC DỮ LIỆU JSON (QUAN TRỌNG — ĐỌC KỸ):**
- **`params`**: JSON array có cấu trúc `[{key, value, enabled}, ...]` — mỗi param là 1 object có 3 field
- **`headers`**: JSON array có cấu trúc `[{id, key, value, enabled}, ...]` — mỗi header là 1 object có 4 field
- **`body`**: JSON string (raw text) — có thể là chuỗi rỗng hoặc JSON stringify
- **TẤT CẢ đều dùng JSON format** — KHÔNG BAO GIỜ hỏi user về format, nó luôn là JSON với `{}` hoặc `[]`
- Khi copy từ `get_repeater_detail`, copy CHÍNH XÁC từng ký tự kể cả dấu ngoặc kép, dấu phấy, khoảng trắng

**⚠️ CRITICAL - FORMAT MATCHING RULE:**
- `get_repeater_detail` trả về **PRETTY-PRINTED JSON** (có indent, xuống dòng)
- `old_content` PHẢI MATCH CHÍNH XÁC format đó (bao gồm spaces, newlines, indent)
- `new_content` CŨNG PHẢI dùng **CHÍNH XÁC CÙNG FORMAT** (indent 2 spaces, xuống dòng)
- **KHÔNG ĐƯỢC compact JSON thành 1 dòng** — điều này sẽ làm cho `old_content` không match

**Ví dụ ĐÚNG (pretty-printed matching):**
```xml
<update_repeater_content>
  <repeater_id>repeater_0</repeater_id>
  <target>params</target>
  <old_content>[
  {
    "key": "test1",
    "value": "1",
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
  }
]</new_content>
</update_repeater_content>
```

**Ví dụ SAI (compact format - sẽ không match):**
```xml
<update_repeater_content>
  <repeater_id>repeater_0</repeater_id>
  <target>params</target>
  <old_content>[{"key":"test1","value":"1","enabled":true}]</old_content>
  <new_content>[{"key":"test1","value":"1","enabled":true},{"key":"test2","value":"2","enabled":true}]</new_content>
</update_repeater_content>
```

**Cơ chế replace (quan trọng — dễ hiểu nhầm):**
- Chỉ thay thế **lần xuất hiện ĐẦU TIÊN** của `old_content`. Nếu `old_content` xuất hiện nhiều lần, các lần sau KHÔNG bị thay.
- Nếu `old_content` không khớp chính xác (bao gồm format), replace sẽ THẤT BẠI âm thầm và tool trả về error message.
- Với `target="headers"` hoặc `target="params"`: Sau khi replace, tool tự động validate và format lại JSON. **Nếu `new_content` làm hỏng cấu trúc JSON, tool sẽ trả về error — KHÔNG ghi file.**
- Với `target="body"`: replace trực tiếp trên chuỗi body.

**Payload variable placeholder:**
- `${tên_biến}` là **placeholder** có thể dùng trong request — tại thời điểm chèn, nó chỉ là chuỗi ký tự nằm nguyên trong request.
- Đặt tên biến theo dạng snake_case, có ý nghĩa (vd `${auth_token}`, `${user_id}`).
- Payload variable hiện tại chỉ dùng làm placeholder tĩnh — chức năng gán giá trị động chưa được implement.

**Quy trình bắt buộc — LIST → READ → UPDATE → VERIFY:**
1. `list_repeaters` — lấy `repeater_id` hợp lệ.
2. `get_repeater_detail` — đọc `old_content` CHÍNH XÁC từ dữ liệu thực tế (bao gồm format, không đoán từ trí nhớ).
3. `update_repeater_content` — thực hiện replace với EXACT SAME FORMAT.
4. `get_repeater_detail` lại — xác minh thay đổi đã thực sự diễn ra.

**Xóa payload variable khỏi request:**
Dùng chính `update_repeater_content` để xóa — thay `${tên_biến}` bằng giá trị tĩnh hoặc chuỗi rỗng (nhớ giữ format):

```xml
<update_repeater_content>
  <repeater_id>repeater_1</repeater_id>
  <target>headers</target>
  <old_content>  {
    "id": "abc-123",
    "key": "Authorization",
    "value": "Bearer ${auth_token}",
    "enabled": true
  }</old_content>
  <new_content>  {
    "id": "abc-123",
    "key": "Authorization",
    "value": "Bearer abc",
    "enabled": true
  }</new_content>
</update_repeater_content>
```

**Các lỗi thường gặp:**
- `old_content` không khớp chính xác format (compact vs pretty-printed) → error: "old_content not found".
- `old_content` xuất hiện nhiều lần → chỉ lần đầu bị thay.
- `new_content` làm hỏng JSON của params/headers → error: "Result is not valid JSON".
- Quên `get_repeater_detail` lại sau khi sửa → hành động trên dữ liệu cũ, gây lỗi dây chuyền.

**Ví dụ hoàn chỉnh:**

```xml
<update_repeater_content>
  <repeater_id>repeater_1</repeater_id>
  <target>headers</target>
  <old_content>  {
    "id": "abc-123",
    "key": "Authorization",
    "value": "Bearer abc",
    "enabled": true
  }</old_content>
  <new_content>  {
    "id": "abc-123",
    "key": "Authorization",
    "value": "Bearer ${auth_token}",
    "enabled": true
  }</new_content>
</update_repeater_content>
```

**Kết quả:**
```
[update_repeater_content] Updated repeater_1 headers
```

⚠️ Sau khi nhận kết quả "Updated", bắt buộc gọi lại `get_repeater_detail` để xác minh thay đổi thực sự đã diễn ra.

---

## Phần 2: Tool Bị Động
Các tool này tự động được đính kèm vào mỗi request, không cần AI kích hoạt bằng lệnh.

---

### 1. `get_traffic_summary`
Tự động đính kèm tổng quan distinct values của traffic hiện tại vào mỗi request.

**Không cần gọi** — luôn có sẵn trong context.

Trả về:
- `hosts`: Danh sách host với số lượng request
- `methods`: Danh sách method với số lượng request
- `statuses`: Danh sách status code với số lượng request
- `types`: Danh sách resource type với số lượng request

**Dữ liệu mẫu:**
```
Traffic Summary:
- Hosts: api.example.com (47), cdn.example.com (23), analytics.example.com (8)
- Methods: GET (120), POST (20), OPTIONS (2)
- Statuses: 200 (105), 304 (20), 401 (10), 404 (5)
- Types: fetch (98), xhr (30), image (14)
```

---

### 2. `get_filter` (filter_context)
Tự động đính kèm trạng thái filter hiện tại vào mỗi request dưới dạng `<filter_context>`.

**Không cần gọi** — luôn có sẵn trong context.

Mô tả filter đang áp dụng:
- Methods đang hiển thị (disabled kèm `(hide)`)
- Hosts whitelist
- Paths whitelist
- Statuses đang hiển thị (disabled kèm `(hide)`)
- Types đang hiển thị (disabled kèm `(hide)`)
- Khoảng size và time (nếu có)

**Dữ liệu mẫu:**
```
<filter_context>
Methods: GET, POST, PUT, DELETE, OPTIONS(hide)
Hosts: api.example.com
Statuses: 200, 304, 401, 404(hide)
Types: fetch, xhr, image, css(hide)
</filter_context>
```

---

## Quy Tắc Quan Trọng

1. **Luôn gọi `list_https` trước khi gọi `get_https_detail`**
2. **Luôn gọi `list_sources` trước khi gọi `get_source_detail`**
3. **Luôn gọi `list_resources` trước khi gọi `get_resource_content`**
4. **Kiểm tra `<filter_context>` trước khi gọi `apply_filter`**
5. **Luôn gọi `list_repeaters` trước khi gọi `get_repeater_detail`, `delete_repeater`, `run_repeater`, hoặc `update_repeater_content`**
6. **Sau khi `update_repeater_content`, luôn gọi lại `get_repeater_detail` để xác minh thay đổi — đừng tin message "Updated"**
7. **Tool bị động không cần gọi — chúng luôn có sẵn trong context**