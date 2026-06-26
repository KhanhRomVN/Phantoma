# Emulate Module - Database Schema

## Table: targets

Lưu thông tin toàn bộ target trong hệ thống.

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `TEXT` | Required | Primary key, định danh duy nhất của target |
| `title` | `TEXT` | Required | Tên hiển thị của target |
| `url` | `TEXT` | `NULL` | URL của target (dùng cho platform web) |
| `platform` | `TEXT` | `NULL` | Loại platform: `web`, `pc`, `android`, `cli` |
| `status` | `TEXT` | `'stored'` | Trạng thái: `stored` (lưu trữ), `staged` (đưa lên kệ), `active` (đang hoạt động) |
| `last_used_at` | `INTEGER` | `NULL` | Thời điểm last active (Unix timestamp) |
| `executable_path` | `TEXT` | `NULL` | Đường dẫn executable cho platform `pc` hoặc `cli` |
| `startup_args` | `TEXT` | `NULL` | Arguments khi launch target |
| `environment` | `TEXT` | `NULL` | Environment variables (lưu dạng JSON) |
| `created_at` | `INTEGER` | `unixepoch()` | Thời điểm tạo (Unix timestamp) |
| `updated_at` | `INTEGER` | `unixepoch()` | Thời điểm cập nhật lần cuối (Unix timestamp) |

### Status Flow

| Status | Ý nghĩa |
|--------|---------|
| `stored` | Đang lưu trữ, chưa sẵn sàng sử dụng |
| `staged` | Đã đưa lên kệ, sẵn sàng để dùng |
| `active` | Đang được sử dụng / hoạt động |

### Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_targets_status` | `status` | Truy vấn theo trạng thái |
| `idx_targets_platform` | `platform` | Lọc theo platform |
| `idx_targets_updated_at` | `updated_at` | Sắp xếp theo thời gian cập nhật |
| `idx_targets_last_used` | `last_used_at` | Truy vấn theo thời gian sử dụng |