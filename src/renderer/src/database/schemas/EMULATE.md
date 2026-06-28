# Emulate Module - Database Schema

## Table: targets

Lưu thông tin toàn bộ target trong hệ thống.

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `TEXT` | Required | Primary key, định danh duy nhất của target |
| `title` | `TEXT` | Required | Tên hiển thị của target |
| `url` | `TEXT` | `NULL` | URL của target (dùng cho platform `web`) |
| `icon` | `TEXT` | `NULL` | Path app icon (dùng cho platform `pc`, hiển thị qua `media://`) |
| `platform` | `TEXT` | `NULL` | Loại platform: `web`, `pc`, `android`, `cli` |
| `last_used_at` | `INTEGER` | `NULL` | Thời điểm last active (Unix timestamp) |
| `executable_path` | `TEXT` | `NULL` | Đường dẫn executable cho platform `pc` hoặc `cli` |
| `startup_args` | `TEXT` | `NULL` | Arguments khi launch target |
| `environment` | `TEXT` | `NULL` | Environment variables (lưu dạng JSON) |
| `created_at` | `INTEGER` | `unixepoch()` | Thời điểm tạo (Unix timestamp) |
| `updated_at` | `INTEGER` | `unixepoch()` | Thời điểm cập nhật lần cuối (Unix timestamp) |

### Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_targets_platform` | `platform` | Lọc theo platform |
| `idx_targets_updated_at` | `updated_at` | Sắp xếp theo thời gian cập nhật |
| `idx_targets_last_used` | `last_used_at` | Truy vấn theo thời gian sử dụng |