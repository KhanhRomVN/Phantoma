# Công Cụ Repeater (Chủ Động)

Các tool này giúp AI thao tác hoàn toàn với Repeater: quản lý request đã lưu, payload, gửi request, chạy fuzz và xem lịch sử.

Lưu ý: `target_id` được lấy từ context phiên làm việc hiện tại (active target), không cần truyền vào mỗi lần gọi.

---

### 1. `list_repeater_requests`
Liệt kê tất cả repeater request đã lưu trên server cho target hiện tại.

Không có tham số.

Trả về bảng với `stt`, `method`, `url`.

**Ví dụ:**
```
<list_repeater_requests />
```

**Kết quả:**

[list_repeater_requests] Total: 3
1. POST https://api.example.com/login
2. GET https://api.example.com/users/42
3. PUT https://api.example.com/users/42
```

---

### 2. `get_repeater_request`
Lấy toàn bộ chi tiết một repeater request đã lưu (method, URL, params, headers, body, payloads).

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `request_id` | **Có** | ID của request (lấy từ `list_repeater_requests`) |

⚠️ Luôn gọi `list_repeater_requests` trước khi gọi `get_repeater_request`.

**Ví dụ:**
```
<get_repeater_request><request_id>abc-123</request_id></get_repeater_request>
```

**Kết quả:**
```
[get_repeater_request] Request abc-123
Method:  POST
URL:     https://api.example.com/login
Params:  []
Headers: {
  "Content-Type": "application/json"
}
Body:    {"username":"admin","password":"${password}"}
Payloads:
- password (enabled): 3 values
```

---

### 3. `create_repeater_request`
Tạo một repeater request mới trên server cho target hiện tại.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `method` | **Có** | HTTP method: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS |
| `url` | **Có** | URL đầy đủ |
| `params` | Không | Mảng params dạng JSON string, mỗi phần tử `{key, value, enabled}` |
| `headers` | Không | Mảng headers dạng JSON string, mỗi phần tử `{key, value, enabled}` |
| `body` | Không | Nội dung body (string) |

**Ví dụ:**
```
<create_repeater_request>
  <method>POST</method>
  <url>https://api.example.com/login</url>
  <headers>[{"key":"Content-Type","value":"application/json","enabled":true}]</headers>
  <body>{"username":"admin","password":"pass123"}</body>
</create_repeater_request>
```

**Kết quả:**
```
[create_repeater_request] Created request id=abc-456
```

---

### 4. `update_repeater_request`
Cập nhật method/url/params/headers/body của một repeater request.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `request_id` | **Có** | ID request cần cập nhật |
| `method` | Không | HTTP method mới |
| `url` | Không | URL mới |
| `params` | Không | Mảng params dạng JSON string |
| `headers` | Không | Mảng headers dạng JSON string |
| `body` | Không | Body mới |

Chỉ gửi các trường cần thay đổi.

**Ví dụ:**
```
<update_repeater_request>
  <request_id>abc-123</request_id>
  <body>{"username":"admin","password":"newpass"}</body>
</update_repeater_request>
```

**Kết quả:**
```
[update_repeater_request] Updated request abc-123
```

---

### 5. `delete_repeater_request`
Xóa một repeater request khỏi server.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `request_id` | **Có** | ID request cần xóa |

**Ví dụ:**
```
<delete_repeater_request><request_id>abc-123</request_id></delete_repeater_request>
```

**Kết quả:**
```
[delete_repeater_request] Deleted request abc-123
```

---

### 6. `list_repeater_payloads`
Liệt kê tất cả payload của một repeater request.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `request_id` | **Có** | ID request cần xem payload |

**Ví dụ:**
```
<list_repeater_payloads><request_id>abc-123</request_id></list_repeater_payloads>
```

**Kết quả:**

[list_repeater_payloads] Request abc-123 — Total payloads: 2
1. password (enabled) — 3 values
2. user_id (disabled) — 0 values
```

---

### 7. `upsert_repeater_payload`
Tạo mới hoặc cập nhật payload của một repeater request (upsert theo tên).

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `request_id` | **Có** | ID request |
| `name` | **Có** | Tên payload (duy nhất trong request) |
| `values` | Không | Mảng giá trị dạng JSON string, ví dụ `["a","b","c"]` |
| `enabled` | Không | `true` / `false`, mặc định `true` |

**Ví dụ:**
```
<upsert_repeater_payload>
  <request_id>abc-123</request_id>
  <name>password</name>
  <values>["admin","123456","password"]</values>
  <enabled>true</enabled>
</upsert_repeater_payload>
```

**Kết quả:**
```
[upsert_repeater_payload] Upserted payload 'password' for request abc-123
```

---

### 8. `delete_repeater_payload`
Xóa một payload khỏi repeater request.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `request_id` | **Có** | ID request |
| `payload_id` | **Có** | ID payload (lấy từ `list_repeater_payloads`) |

**Ví dụ:**
```
<delete_repeater_payload>
  <request_id>abc-123</request_id>
  <payload_id>payload-1</payload_id>
</delete_repeater_payload>
```

**Kết quả:**
```
[delete_repeater_payload] Deleted payload payload-1
```

---

### 9. `send_repeater_request`
Gửi một request thủ công (single request) và nhận response.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `request_id` | **Có** | ID request muốn gửi |
| `payload_value` | Không | Nếu request chứa biến `${...}`, truyền giá trị thay thế |

**Ví dụ:**
```
<send_repeater_request>
  <request_id>abc-123</request_id>
  <payload_value>admin</payload_value>
</send_repeater_request>
```

**Kết quả:**
```
[send_repeater_request] Status: 200 OK — Duration: 120ms
--- Response Body ---
{"token":"eyJhbGciOi..."}
```

---

### 10. `run_repeater_fuzz`
Chạy fuzz toàn bộ tổ hợp payload (cartesian product) trên một repeater request.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `request_id` | **Có** | ID request cần fuzz |

Trả về danh sách kết quả từng request (payload combination, status, duration).

**Ví dụ:**
```
<run_repeater_fuzz><request_id>abc-123</request_id></run_repeater_fuzz>
```

**Kết quả:**

[run_repeater_fuzz] Request abc-123 — Total: 6 requests
1. password=admin → 200 (110ms)
2. password=123456 → 401 (95ms)
...
```

---

### 11. `list_repeater_history`
Liệt kê lịch sử chạy fuzz/repeater của target hoặc của một request cụ thể.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `request_id` | Không | Nếu có, chỉ liệt kê history của request này; bỏ trống để lấy toàn bộ target |

**Ví dụ:**
```
<list_repeater_history />
```

**Kết quả:**

[list_repeater_history] Total: 5
1. POST /login — 200 — 6 payloads — 2025-01-01 10:30:00
...
```

---

### 12. `get_repeater_history_runs`
Lấy chi tiết từng run (request/response) của một history record.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `history_id` | **Có** | ID history record (từ `list_repeater_history`) |

**Ví dụ:**
```
<get_repeater_history_runs><history_id>hist-001</history_id></get_repeater_history_runs>
```

**Kết quả:**

[get_repeater_history_runs] History hist-001 — 6 runs
1. password=admin → 200 (110ms)
...
```

---

### 13. `delete_repeater_history`
Xóa một history record.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `history_id` | **Có** | ID history record cần xóa |

**Ví dụ:**
```
<delete_repeater_history><history_id>hist-001</history_id></delete_repeater_history>
```

**Kết quả:**
```
[delete_repeater_history] Deleted history hist-001
```

---

## Quy Tắc Quan Trọng

1. **Luôn gọi `list_repeater_requests` trước khi gọi `get_repeater_request` hoặc `update_repeater_request` / `delete_repeater_request`.**
2. **Luôn gọi `list_repeater_payloads` trước khi gọi `upsert_repeater_payload` hoặc `delete_repeater_payload`.**
3. **Luôn gọi `list_repeater_history` trước khi gọi `get_repeater_history_runs`.**
4. Khi dùng biến `${payload_name}` trong body/params/headers, payload tương ứng phải tồn tại và có giá trị.
5. `run_repeater_fuzz` chỉ chạy với payload đang enabled và có values; nếu không có payload, nó sẽ gửi 1 request đơn.
6. Kết quả fuzz có thể được lưu vào history tự động; nếu không muốn lưu, cần chỉ rõ trong tool.