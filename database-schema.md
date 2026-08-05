# Database Schema

**File:** `/home/khanhromvn/.phantoma/phantoma.sql`  

---

## Table: `emulate_targets`

Bảng lưu thông tin các target (mục tiêu) trong feature Emulate.

### Columns

- **`id`** (TEXT, PRIMARY KEY) — Mã định danh duy nhất của target
- **`title`** (TEXT, NOT NULL) — Tiêu đề/tên của target
- **`url`** (TEXT) — URL của target
- **`platform`** (TEXT) — Nền tảng (ví dụ: web, mobile, ...)
- **`status`** (TEXT, DEFAULT 'stored') — Trạng thái: stored, running, completed, ...
- **`last_used_at`** (INTEGER) — Thời gian sử dụng lần cuối (timestamp)
- **`executable_path`** (TEXT) — Đường dẫn đến executable
- **`startup_args`** (TEXT) — Tham số khởi chạy
- **`environment`** (TEXT) — Môi trường (development, production, ...)
- **`created_at`** (INTEGER, DEFAULT (strftime('%s', 'now'))) — Thời gian tạo (timestamp)
- **`updated_at`** (INTEGER, DEFAULT (strftime('%s', 'now'))) — Thời gian cập nhật lần cuối (timestamp)
- **`icon`** (TEXT) — Icon của target

### Indexes

- **`idx_emulate_targets_status`** — `status`
- **`idx_emulate_targets_platform`** — `platform`
- **`idx_emulate_targets_updated_at`** — `updated_at`
- **`idx_emulate_targets_last_used`** — `last_used_at`

---

## Table: `emulate_target_filters`

Bảng lưu filter settings cho từng emulate target (dùng cho Filter.tsx).

### Columns

- **`id`** (TEXT, PRIMARY KEY) — Mã định danh duy nhất của filter
- **`emulate_target_id`** (TEXT, NOT NULL) — FK đến `emulate_targets.id`
- **`method`** (TEXT) — HTTP method filter (GET, POST, PUT, DELETE...)
- **`host`** (TEXT) — Host filter
- **`status`** (TEXT) — Status code filter
- **`type`** (TEXT) — Resource type filter (xhr, js, css, img, doc, fetch...)

### Indexes

- **`idx_emulate_target_filters_target_id`** — `emulate_target_id`

---

## Repeater Tables (Preview — chưa code)

Các bảng dưới đây lưu dữ liệu Repeater.  
Thiết kế dùng **JSON columns** cho params, headers, values để tránh tách quá nhiều bảng con (SQLite hỗ trợ `json_extract`, `json_array_length`).

### ER Diagram (khái niệm)

```
emulate_targets (1)──< (N) emulate_repeater_requests
                              │
                              ├──< (N) emulate_repeater_payloads
                              │
                              └──< (N) emulate_repeater_history──< (N) emulate_repeater_history_runs
```

> **Lưu ý:** Chỉ `emulate_repeater_requests` mới có FK `emulate_target_id`. Các bảng còn lại truy ngược target qua `emulate_repeater_request_id → emulate_repeater_requests.emulate_target_id`.

---

### Table: `emulate_repeater_requests`

Lưu cấu hình request (method, url, body, params, headers) cho từng target.

| # | Column | Type | Constraint | Description |
|---|---|---|---|---|
| 1 | `id` | TEXT | PK | UUID |
| 2 | `emulate_target_id` | TEXT | NOT NULL, FK → `emulate_targets.id` | Thuộc target nào |
| 3 | `method` | TEXT | NOT NULL, DEFAULT 'GET' | GET, POST, PUT, DELETE... |
| 4 | `url` | TEXT | NOT NULL | URL gốc (chưa có query string) |
| 5 | `body` | TEXT | DEFAULT '' | Request body (JSON / raw text) |
| 6 | `params` | TEXT (JSON) | DEFAULT '[]' | Mảng ParamItem: `[{"key":"q","value":"test","enabled":true}]` |
| 7 | `headers` | TEXT (JSON) | DEFAULT '[]' | Mảng HeaderItem: `[{"key":"Authorization","value":"Bearer ...","enabled":true}]` |
| 8 | `created_at` | INTEGER | DEFAULT (strftime('%s','now')) | Thời gian tạo |
| 9 | `updated_at` | INTEGER | DEFAULT (strftime('%s','now')) | Thời gian cập nhật cuối |

**Indexes:**
- `idx_emulate_repeater_requests_target` — `emulate_target_id`
- `idx_emulate_repeater_requests_updated` — `updated_at`

---

### Table: `emulate_repeater_payloads`

Lưu danh sách payload. Mỗi payload thuộc về 1 request, được xác định qua tên biến (vd: `test1` cho `${test1}` trong params/headers/body).

| # | Column | Type | Constraint | Description |
|---|---|---|---|---|
| 1 | `id` | TEXT | PK | UUID |
| 2 | `emulate_repeater_request_id` | TEXT | NOT NULL, FK → `emulate_repeater_requests.id` | Thuộc request nào |
| 3 | `name` | TEXT | NOT NULL | Tên biến payload (vd: `test1` cho `${test1}`) |
| 4 | `payload_values` | TEXT (JSON) | NOT NULL, DEFAULT '[]' | Mảng giá trị: `["val1","val2","val3"]` |
| 5 | `enabled` | INTEGER | NOT NULL, DEFAULT 1 | 0 = tắt, 1 = bật |
| 6 | `created_at` | INTEGER | DEFAULT (strftime('%s','now')) | |

**Indexes:**
- `idx_emulate_repeater_payloads_request` — `emulate_repeater_request_id`
- `idx_emulate_repeater_payloads_name_request` — `(emulate_repeater_request_id, name)` UNIQUE

---

### Table: `emulate_repeater_history`

Lưu lịch sử mỗi lần chạy (một lần chạy có thể gồm nhiều payload runs).

| # | Column | Type | Constraint | Description |
|---|---|---|---|---|
| 1 | `id` | TEXT | PK | UUID |
| 2 | `emulate_repeater_request_id` | TEXT | NULLABLE, FK → `emulate_repeater_requests.id` | Request được chạy (NULL nếu request đã bị xóa) |
| 3 | `method` | TEXT | NOT NULL | Phương thức lúc chạy |
| 4 | `url` | TEXT | NOT NULL | URL gốc lúc chạy |
| 5 | `status` | INTEGER | | Status code của request đầu tiên (đại diện) |
| 6 | `statuses` | TEXT (JSON) | DEFAULT '{}' | Thống kê: `{"200":3,"404":1}` |
| 7 | `timestamp` | INTEGER | NOT NULL | Thời điểm bắt đầu chạy |
| 8 | `end_time` | INTEGER | | Thời điểm kết thúc |
| 9 | `duration` | INTEGER | DEFAULT 0 | Tổng thời gian chạy (ms) |
| 10 | `payload_count` | INTEGER | DEFAULT 0 | Tổng số payload đã chạy |
| 11 | `payload_summary` | TEXT | DEFAULT '' | Chuỗi tóm tắt payload values (vd: `"1, 2, 3"`) |
| 12 | `request_headers` | TEXT (JSON) | DEFAULT '{}' | Headers request lúc chạy: `{"Authorization":"..."}` |
| 13 | `request_body` | TEXT | DEFAULT '' | Body request lúc chạy |
| 14 | `created_at` | INTEGER | DEFAULT (strftime('%s','now')) | |

**Indexes:**
- `idx_emulate_repeater_history_request` — `emulate_repeater_request_id`
- `idx_emulate_repeater_history_timestamp` — `timestamp DESC`

---

### Table: `emulate_repeater_history_runs`

Lưu kết quả chi tiết từng payload value trong một lần chạy history.

| # | Column | Type | Constraint | Description |
|---|---|---|---|---|
| 1 | `id` | TEXT | PK | UUID |
| 2 | `history_id` | TEXT | NOT NULL, FK → `emulate_repeater_history.id` ON DELETE CASCADE | Thuộc history nào |
| 3 | `payload_name` | TEXT | NOT NULL | Tên payload |
| 4 | `payload_value` | TEXT | NOT NULL | Giá trị payload đã substitute |
| 5 | `status` | INTEGER | | HTTP status code |
| 6 | `duration` | INTEGER | | Thời gian request (ms) |
| 7 | `method` | TEXT | | Phương thức |
| 8 | `url` | TEXT | | URL thực tế đã gửi (đã build query string) |
| 9 | `params` | TEXT (JSON) | DEFAULT '{}' | Params lúc chạy (đã substitute): `{"q":"test"}` |
| 10 | `request_headers` | TEXT (JSON) | DEFAULT '{}' | Headers request lúc chạy (đã substitute) |
| 11 | `request_body` | TEXT | DEFAULT '' | Body request lúc chạy (đã substitute) |
| 12 | `response_headers` | TEXT (JSON) | DEFAULT '{}' | Headers response |
| 13 | `response_body` | TEXT | DEFAULT '' | Body response |
| 14 | `created_at` | INTEGER | DEFAULT (strftime('%s','now')) | |

**Indexes:**
- `idx_emulate_repeater_history_runs_history` — `history_id`
- `idx_emulate_repeater_history_runs_payload` — `(history_id, payload_name)`

---

### Ghi chú thiết kế

1. **`emulate_target_id` chỉ có trong `emulate_repeater_requests`**. Các bảng `emulate_repeater_payloads`, `emulate_repeater_history`, `emulate_repeater_history_runs` đều truy ngược target qua chuỗi FK: `... → emulate_repeater_request_id → emulate_repeater_requests.emulate_target_id`. Không cần lặp lại `emulate_target_id` ở các bảng con.

2. **JSON columns** (`params`, `headers`, `values`, `statuses`, `request_headers`, `response_headers`): chọn JSON thay vì bảng con riêng vì:
   - Repeater không cần query/sort/filter theo từng param/header riêng lẻ.
   - Giảm số lượng JOIN, code persistence đơn giản hơn.
   - SQLite có `json_extract()` nếu sau này cần query sâu.

3. **`emulate_repeater_payloads`**: mỗi payload luôn thuộc về 1 request (`emulate_repeater_request_id` NOT NULL). Tên payload (`name`) là tên biến xuất hiện trong params/headers/body dưới dạng `${name}`. Unique constraint `(emulate_repeater_request_id, name)` đảm bảo mỗi request chỉ có 1 payload cho mỗi biến.

4. **Cascade delete**: `emulate_repeater_history_runs.history_id` có `ON DELETE CASCADE` để tự động xóa runs khi xóa history. Các FK khác không cascade để tránh mất dữ liệu khi xóa target/request.

5. **Timestamp**: dùng UNIX timestamp (giây) qua `strftime('%s','now')` của SQLite, đồng bộ với `Date.now() / 1000` ở frontend.
