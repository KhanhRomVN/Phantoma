# Data Storage Architecture — PREVIEW

> ⚠️ Bản nháp xem trước — chưa áp dụng vào `data-storage.md`.

Cấu trúc lưu trữ dữ liệu của Phantoma (đề xuất mới).

---

## 📂 Tổng quan

**Thư mục gốc:** `~/.phantoma/`

- `~/.phantoma/`
  ├── `phantoma.sql`
  ├── `phantoma.sql-shm` — SQLite shared memory
  ├── `phantoma.sql-wal` — SQLite write-ahead log
  ├── [`emulate:{targetId}/`](#emulate-targetid)
  │   ├── `conversations/`
  │   ├── [`repeaters/`](#repeaters)
  │   └── [`reports/`](#reports)
  ├── [`recon:{targetId}/`](#recon-targetid)
  │   └── `conversations/`
  ├── [`code:{system_path}/`](#code-system-path)
  │   └── `conversations/`
  └── [`extensions/`](#extensions)

---

<a name="emulate-targetid"></a>
### Emulate:{targetId}

Lưu trữ dữ liệu phiên emulate: hội thoại, request lặp lại và báo cáo.

```
~/.phantoma/emulate:{targetId}/
├── conversations/
├── repeaters/
└── reports/
```

---

<a name="repeaters"></a>
### Repeaters

Lưu trữ request lặp lại, phân nhóm theo `repeater_{requestId}`.

```
~/.phantoma/emulate:{targetId}/repeaters/
├── repeater_{requestId_1}/
│   ├── params.json
│   ├── headers.json
│   └── body.json
└── repeater_{requestId_2}/
    ├── params.json
    ├── headers.json
    └── body.json
```

---

<a name="reports"></a>
### Reports

Lưu trữ báo cáo. Mỗi report gồm file `reportId.md` (báo cáo dạng markdown) và thư mục `code/` chứa các file code khác.

```
~/.phantoma/emulate:{targetId}/reports/
└── report:{reportId}/
    ├── reportId.md
    └── code/
        ├── index.html
        ├── style.css
        └── script.js
```

---

<a name="recon-targetid"></a>
### Recon:{targetId}

Lưu trữ hội thoại của phiên recon.

```
~/.phantoma/recon:{targetId}/
└── conversations/
    └── {conversationId}.json
```

---

<a name="code-system-path"></a>
### Code:{system_path}

Lưu trữ hội thoại của phiên code.

```
~/.phantoma/code:{system_path}/
└── conversations/
    └── {conversationId}.json
```

---

<a name="extensions"></a>
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

## 📖 Ghi chú cần xác nhận

- `phantoma.sql`, `phantoma.sql-shm`, `phantoma.sql-wal` vẫn giữ ở gốc `~/.phantoma/`?
- `conversations/` trong `recon:{targetId}` và `code:{system_path}` dùng số nhiều `conversations/` đúng không?
- File `reportId.md` nằm cùng cấp với `code/` trong `report:{reportId}/`?