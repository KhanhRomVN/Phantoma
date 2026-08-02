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
