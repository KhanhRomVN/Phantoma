# Data Storage Architecture

Cấu trúc lưu trữ dữ liệu của Phantoma.

---

## 📂 Tổng quan

**Thư mục gốc:** `~/.phantoma/`

Phantoma sử dụng:
- **SQLite Database** — Metadata và quan hệ
- **File System** — Nội dung repeater requests

---

## 🗄️ SQLite Database

**Path:** `~/.phantoma/phantoma.sql`

### Nội dung

- Metadata của entities (targets, requests, history, payloads, filters)
- Quan hệ giữa entities (foreign keys)
- Timestamps và trạng thái

### Bảng chính

Xem chi tiết tại [`database-schema.md`](./database-schema.md)

**Emulate Module:**
- `emulate_targets`
- `emulate_target_filters`
- `emulate_repeater_requests` — Metadata only (params/headers/body deprecated)
- `emulate_repeater_payloads`
- `emulate_repeater_history`
- `emulate_repeater_history_runs`

---

## 📁 File System

### Repeater Content

**Path:** `~/.phantoma/repeaters/{targetId}/repeater_{requestId}/`

Mỗi repeater có 3 files JSON:

```
~/.phantoma/repeaters/
├── {targetId}/
│   ├── repeater_{requestId_1}/
│   │   ├── params.json
│   │   ├── headers.json
│   │   └── body.json
│   ├── repeater_{requestId_2}/
│   │   ├── params.json
│   │   ├── headers.json
│   │   └── body.json
│   └── ...
└── {targetId_2}/
    └── ...
```

### File Format

**`params.json` và `headers.json`:**
```json
[
  {
    "id": "1",
    "key": "test1",
    "value": "1",
    "enabled": true
  },
  {
    "id": "2",
    "key": "x-api-key",
    "value": "abc123",
    "enabled": true
  }
]
```

**`body.json`:**
```json
{
  "target_path": "/api/v0/chat/completion",
  "model": "gpt-4"
}
```

Hoặc raw text (khi không phải JSON):
```json
{
  "content": "username=test&password=123",
  "contentType": "application/x-www-form-urlencoded"
}
```
---

## 📊 Certificates & Proxy

**Path:** `.http-mitm-proxy/`

Generated tự động bởi http-mitm-proxy package:

```
.http-mitm-proxy/
├── certs/      # SSL certificates
└── keys/       # Private keys
```

**Location:** Project workspace (không phải `~/.phantoma/`)

---

## � Security

### File Permissions

```bash
chmod 700 ~/.phantoma
chmod 600 ~/.phantoma/*.sql
chmod 600 ~/.phantoma/repeaters/**/*.json
```

### Backup

```bash
# Backup
tar -czf phantoma-backup-$(date +%Y%m%d).tar.gz ~/.phantoma/

# Restore
tar -xzf phantoma-backup-20240101.tar.gz -C ~/
```

---

## 📖 Related

- [`database-schema.md`](./database-schema.md) — Database schema
- [`tool-development-guide.md`](./tool-development-guide.md) — Tool development
- [`README.md`](./README.md) — Project overview
