# Data Storage Architecture

Cấu trúc lưu trữ dữ liệu của Phantoma.

---

## 📂 Tổng quan

**Thư mục gốc:** `~/.phantoma/`

- `~/.phantoma/`
  ├── `phantoma.sql`
  ├── `phantoma.sql-shm` — SQLite shared memory
  ├── `phantoma.sql-wal` — SQLite write-ahead log
  ├── [`conversations/`](#conversations)
  ├── [`extensions/`](#extensions)
  ├── [`repeaters/`](#repeaters)
  └── [`reports/`](#reports)

---

### phantoma.sql

Database chính của Phantoma, lưu trữ toàn bộ dữ liệu quan hệ. Xem chi tiết tại [`database-schema.md`](./database-schema.md)

---

### Repeater

Lưu trữ các request đã lặp lại, phân nhóm theo `targetId` và `requestId`.

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

### Report

Lưu trữ các báo cáo đã tạo, mỗi report có thư mục `code` chứa HTML/CSS/JS.

```
~/.phantoma/reports/
├── {reportId_1}/
│   └── code/
│       ├── index.html
│       ├── style.css
│       └── script.js
└── {reportId_2}/
    └── code/
        └── page.html
```

---

### Conversations

Lưu trữ các cuộc hội thoại, phân loại theo loại phiên: `unknown`, `emulate:{targetId}`, `recon:{targetId}`, hoặc `{timestamp}`.

```
~/.phantoma/conversations/
├── unknown/
│   └── {conversationId}.json
├── emulate:{targetId}/
│   └── {conversationId}.json
├── recon:{targetId}/
│   └── {conversationId}.json
└── {timestamp}/
    └── {conversationId}.json
```

---

### Extensions

Lưu trữ các extension đã tải về, mỗi extension có manifest, metadata và mã nguồn.

```
~/.phantoma/extensions/
└── Gydunhn.typescript-essentials/
    ├── extension.vsixmanifest
    ├── metadata.json
    ├── [Content_Types].xml
    └── extension/
        ├── package.json
        ├── README.md
        ├── CHANGELOG.md
        ├── LICENSE.txt
        └── img/
            └── essentials.png
```

---

## 📖 Related

- [`database-schema.md`](./database-schema.md) — Database schema
- [`tool-development-guide.md`](./tool-development-guide.md) — Tool development
- [`README.md`](./README.md) — Project overview