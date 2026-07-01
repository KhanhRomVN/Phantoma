# Database Schema

**File:** `/home/khanhromvn/.phantoma/phantoma.sql`  
**Generated:** 2026-07-01

---

## 📋 Tables

| # | Table Name |
|---|------------|
| 1 | `schema_migrations` |
| 2 | `targets` |

---

## 📄 Table: `targets`

Bảng lưu thông tin các target (mục tiêu) được quản lý trong hệ thống.

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Mã định danh duy nhất của target |
| `title` | TEXT | NOT NULL | Tiêu đề/tên của target |
| `url` | TEXT | - | URL của target |
| `platform` | TEXT | - | Nền tảng (ví dụ: web, mobile, ...) |
| `status` | TEXT | DEFAULT 'stored' | Trạng thái: stored, running, completed, ... |
| `last_used_at` | INTEGER | - | Thời gian sử dụng lần cuối (timestamp) |
| `executable_path` | TEXT | - | Đường dẫn đến executable |
| `startup_args` | TEXT | - | Tham số khởi chạy |
| `environment` | TEXT | - | Môi trường (development, production, ...) |
| `created_at` | INTEGER | DEFAULT (strftime('%s', 'now')) | Thời gian tạo (timestamp) |
| `updated_at` | INTEGER | DEFAULT (strftime('%s', 'now')) | Thời gian cập nhật lần cuối (timestamp) |
| `icon` | TEXT | - | Icon của target |

### Indexes

| Index Name | Columns |
|------------|---------|
| `idx_targets_status` | `status` |
| `idx_targets_platform` | `platform` |
| `idx_targets_updated_at` | `updated_at` |
| `idx_targets_last_used` | `last_used_at` |

---

## 📄 Table: `schema_migrations`

Bảng quản lý phiên bản migration cho database (sử dụng `golang-migrate`).

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `version` | uint64 | - | Số phiên bản migration |
| `dirty` | bool | - | Trạng thái dirty (true nếu migration bị lỗi) |

### Indexes

| Index Name | Columns |
|------------|---------|
| `version_unique` | `version` (UNIQUE) |

---

## 🔗 Relationships

- **targets** ↔ **schema_migrations**: Không có foreign key trực tiếp.

---

## 📝 Notes

- Database sử dụng **SQLite** với WAL mode (`_journal_mode=WAL`).
- Timestamps được lưu dưới dạng UNIX timestamp (seconds).
- Migration được quản lý bằng `golang-migrate` v4.