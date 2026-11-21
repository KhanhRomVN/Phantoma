# Database Schema

**File:** `~/.phantoma/emulate/emulate.sql` (SQLite, override bằng `EMULATE_DB_PATH`)

Nguồn sự thật: `src/database/migrations/` (`0001_initial_schema.sql`, `0002_rename_targets.sql`, `0003_drop_repeater_tables.sql`), chạy tăng dần theo `PRAGMA user_version` trong `src/database/migration.runner.ts` (version hiện tại = 8). Timestamp là UNIX giây (`strftime('%s','now')`).

---

## Table: `targets`

Bảng lưu các target (mục tiêu) trong feature Emulate.

| Column | Type | Constraint | Description |
|---|---|---|---|
| `id` | TEXT | PK | Mã định danh target (chỉ gồm `[A-Za-z0-9_-]`, dùng làm tên folder) |
| `title` | TEXT | NOT NULL | Tên target |
| `url` | TEXT | | URL của target |
| `icon` | TEXT | | Icon của target |
| `platform` | TEXT | | Nền tảng: `website`, `application`, `terminal` |
| `last_used_at` | INTEGER | | Lần sử dụng cuối |
| `executable_path` | TEXT | | Đường dẫn executable (terminal: toàn bộ command line) |
| `startup_args` | TEXT | | Tham số khởi chạy |
| `environment` | TEXT | | Môi trường |
| `created_at` | INTEGER | DEFAULT now | Thời gian tạo |
| `updated_at` | INTEGER | DEFAULT now | Thời gian cập nhật cuối |

**Indexes:** `idx_targets_updated` — `updated_at`

Ghi chú platform:

- Giá trị cũ `web` / `pc` / `cli` được migration 0002 đổi thành `website` / `application` / `terminal`.
- `android` KHÔNG còn là platform của target (mobile đi theo luồng device). Migration 0003 xoá các target `android` cùng folder file của chúng.

---

## Table: `target_http_filters`

Filter settings cho từng target (mỗi target tối đa 1 filter).

| Column | Type | Constraint | Description |
|---|---|---|---|
| `id` | TEXT | PK | |
| `target_id` | TEXT | NOT NULL, FK → `targets.id` ON DELETE CASCADE | |
| `method` | TEXT | NOT NULL, DEFAULT '' | HTTP method filter |
| `host` | TEXT | NOT NULL, DEFAULT '' | Host filter |
| `status` | TEXT | NOT NULL, DEFAULT '' | Status code filter |
| `type` | TEXT | NOT NULL, DEFAULT '' | Resource type filter |

**Indexes:** `idx_target_http_filters_target` — `target_id` UNIQUE

---

## Reports (không có bảng)

Report lưu hoàn toàn bằng file (markdown + title) theo `targetId` và `reportId` (`src/storage/report-file.storage.ts`). Bảng `emulate_reports` cũ bị `DROP TABLE IF EXISTS` trong migration.

---

## Fuzzers (không có bảng)

Fuzzer lưu hoàn toàn bằng file JSON (`src/storage/fuzzer-file.storage.ts`), thay cho 4 bảng `emulate_repeater_*` đã bị xoá ở migration 0003 (dữ liệu repeater cũ bị bỏ, không chuyển đổi).

Gốc dữ liệu của target: `~/.phantoma/emulate/<targetId>/` (helper `getTargetDir`, fuzzers qua `getFuzzersDir`).

```
~/.phantoma/emulate/<targetId>/fuzzers/<fuzzerId>/
├── fuzzer.json
└── history/<historyId>/
    ├── history.json
    └── runs.json
```

### `fuzzer.json`

| Field | Type | Description |
|---|---|---|
| `id` | string | Mã fuzzer |
| `method` | string | HTTP method |
| `url` | string | URL gốc (chưa có query string) |
| `body` | string | Body request |
| `params` | array | Query params (mảng thật, không phải chuỗi JSON) |
| `headers` | array | Headers (mảng thật) |
| `payloads` | array | Payload của request, xác định qua tên biến `${name}` |
| `created_at` / `updated_at` | number | UNIX giây |

Mỗi phần tử `payloads`: `id`, `name`, `payload_values` (string[]), `enabled` (boolean), `created_at`.

### `history.json`

Một lần chạy (có thể gồm nhiều payload runs): `id`, `fuzzer_id`, `method`, `url`, `status` (status của request đầu tiên, hoặc null), `statuses` (`{"200":3,"404":1}`), `timestamp`, `end_time`, `duration` (ms), `payload_count`, `payload_summary`, `request_headers`, `request_body`, `created_at`.

### `runs.json`

Mảng kết quả chi tiết từng payload value: `id`, `payload_name`, `payload_value`, `status`, `duration`, `method`, `url`, `params`, `request_headers`, `request_body`, `response_headers`, `response_body`, `created_at`.

---

## Ghi chú thiết kế

1. `targets.id` là gốc duy nhất cho dữ liệu file của target (reports, fuzzers). Xoá target phải xoá luôn folder `<targetId>/`.
2. Mọi id dùng làm tên folder (`targetId`, `fuzzerId`, `historyId`) được validate chỉ gồm `[A-Za-z0-9_-]` để chống path traversal.
3. Ghi file là đồng bộ, ghi vào file tạm rồi rename (atomic); mỗi fuzzer giữ tối đa 30 history (`MAX_HISTORY_PER_FUZZER`).
4. Cascade delete chỉ có ở `target_http_filters` (theo target).
5. Cấu trúc code: mỗi bảng có 1 repository trong `src/repositories/`; fuzzer/report đi qua `src/storage/`.
6. API: `/api/v1/targets/**` (target, filter, reports) và `/api/v1/targets/:targetId/fuzzers/**`.