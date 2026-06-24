# 🤝 Phantoma COLAB — Tài Liệu Module Cộng Tác Nhóm

> **Phiên bản:** 1.0.0  
> **Module:** Team Collaboration, Real‑time Chat & Knowledge Base  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Real‑time Chat — Trò Chuyện Nhóm](#2-real-time-chat--trò-chuyện-nhóm)
- [3. Knowledge Base — Kho Tài Liệu](#3-knowledge-base--kho-tài-liệu)
- [4. Activity Feed — Nhật Ký Hoạt Động](#4-activity-feed--nhật-ký-hoạt-động)
- [5. Tích Hợp Bot & Thông Báo](#5-tích-hợp-bot--thông-báo)
- [6. Cơ Chế An Toàn & Giới Hạn](#6-cơ-chế-an-toàn--giới-hạn)
- [7. Luồng Dữ Liệu & API](#7-luồng-dữ-liệu--api)
- [8. Hướng Dẫn Phát Triển](#8-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **COLAB** cung cấp nền tảng cộng tác thời gian thực cho nhóm kiểm thử bảo mật, bao gồm chat theo workspace, thư viện tài liệu Markdown, và nhật ký hoạt động. Module hoạt động như lớp keo kết nối tất cả các module khác.

```
COLAB/
├── COLAB.md                     ← Tài liệu này
├── index.tsx                    ← Component chính (sidebar: Chat | Docs | Activity)
├── Chat/                        ← Trò chuyện thời gian thực
│   ├── ChannelList.tsx
│   ├── ChannelView.tsx
│   ├── DirectMessage.tsx
│   ├── MessageComposer.tsx
│   ├── FileShare.tsx
│   ├── MessageSearch.tsx
│   └── ReactionPicker.tsx
├── Docs/                        ← Kho tài liệu
│   ├── DocBrowser.tsx
│   ├── DocEditor.tsx
│   ├── DocViewer.tsx
│   ├── DocHistory.tsx
│   ├── TemplateLibrary.tsx
│   ├── TagManager.tsx
│   └── SearchPanel.tsx
├── Activity/                    ← Nhật ký team
│   ├── ActivityFeed.tsx
│   ├── EventFilter.tsx
│   └── AuditExporter.tsx
├── Bot/                         ← Bot tự động
│   ├── BotManager.tsx
│   ├── NotificationBot.tsx
│   └── CommandBot.tsx
├── services/
│   ├── websocket.ts
│   ├── chatStore.ts
│   ├── docStore.ts
│   ├── activityLogger.ts
│   └── botEngine.ts
├── types/
├── constants/
└── utils/
```

### 🎯 Các chức năng chính

| # | Chức năng | Mô tả |
|---|-----------|-------|
| 1 | Real‑time Chat | Kênh theo workspace, direct message, chia sẻ file |
| 2 | Knowledge Base | Wiki Markdown, version history, template, tìm kiếm |
| 3 | Activity Feed | Nhật ký mọi hành động của team, có filter |
| 4 | Bot Integration | Bot thông báo từ module khác (SCAN xong, ATTACK thành công) |
| 5 | File Sharing | Kéo thả file, ảnh, log, pcap vào chat hoặc docs |

---

## 2. Real‑time Chat — Trò Chuyện Nhóm

### 2.1 Channels & Direct Messages

| Loại | Mô tả | Phạm vi |
|------|-------|---------|
| **Workspace Channel** | Mỗi workspace tự động có 1 kênh chat | Tất cả thành viên trong workspace |
| **Custom Channel** | Người dùng tạo kênh theo chủ đề (ví dụ: `#web-attack`, `#privesc`) | Thành viên được mời |
| **Direct Message** | Chat 1‑1 giữa hai thành viên | Chỉ 2 người |
| **Group DM** | Chat nhóm nhỏ (tối đa 10 người) | Thành viên được thêm |

**Component:** `Chat/ChannelList.tsx` – sidebar hiển thị danh sách kênh, có badge số tin nhắn chưa đọc.

### 2.2 Tin Nhắn

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | `string` | UUID của tin nhắn |
| `channelId` | `string` | Kênh chứa tin |
| `sender` | `{ id, name, avatar }` | Người gửi |
| `content` | `string` | Nội dung (Markdown) |
| `attachments` | `Attachment[]` | File đính kèm |
| `replyTo` | `string?` | ID tin nhắn được trả lời (thread) |
| `reactions` | `{ emoji, userId }[]` | Cảm xúc |
| `editedAt` | `string?` | Thời gian chỉnh sửa |
| `createdAt` | `string` | Thời gian gửi |

**Hỗ trợ Markdown:** Bold, italic, code block (có syntax highlight cho bash, python, powershell, json), link, image.

**Component:** `Chat/ChannelView.tsx` – hiển thị danh sách tin nhắn dạng thread, tự động scroll xuống cuối, load thêm khi kéo lên.

### 2.3 File Sharing

| Loại file hỗ trợ | Cách hiển thị |
|------------------|---------------|
| Ảnh (png, jpg, gif, webp) | Hiển thị trực tiếp trong chat |
| Log (txt, log, csv) | Preview nội dung, có syntax highlight |
| PCAP (pcap, pcapng) | Hiển thị metadata, link tải |
| Code (py, sh, ps1, js, ts) | Code block với syntax highlight |
| PDF, DOCX | Link tải + preview trang đầu |
| Bất kỳ file khác | Link tải với tên + kích thước |

**Component:** `Chat/FileShare.tsx` – hỗ trợ drag & drop, paste từ clipboard, upload nhiều file.

### 2.4 Tìm Kiếm Tin Nhắn

- Tìm theo từ khóa trong nội dung.
- Lọc theo kênh, người gửi, khoảng thời gian.
- Có thể jump đến vị trí tin nhắn trong kênh.

---

## 3. Knowledge Base — Kho Tài Liệu

### 3.1 Cấu Trúc Tài Liệu

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | `string` | UUID tài liệu |
| `title` | `string` | Tiêu đề |
| `content` | `string` | Nội dung Markdown |
| `category` | `'sop' \| 'methodology' \| 'cheatsheet' \| 'writeup' \| 'general'` | Phân loại |
| `tags` | `string[]` | Nhãn (ví dụ: `#windows`, `#privesc`, `#sql`) |
| `workspaceId` | `string?` | Gắn với workspace (null = toàn cục) |
| `author` | `{ id, name }` | Người tạo |
| `contributors` | `{ id, name }[]` | Người chỉnh sửa |
| `version` | `number` | Phiên bản hiện tại |
| `createdAt` | `string` | Ngày tạo |
| `updatedAt` | `string` | Ngày cập nhật cuối |
| `isPinned` | `boolean` | Ghim lên đầu danh sách |
| `isTemplate` | `boolean` | Là template (có thể clone) |

### 3.2 Trình Soạn Thảo Markdown

| Tính năng | Mô tả |
|-----------|-------|
| Live Preview | Chia đôi màn hình: editor bên trái, preview bên phải |
| Toolbar | Nút chèn bold, italic, heading, table, code block, image |
| Image Upload | Kéo thả ảnh vào editor, tự động upload và chèn link |
| Code Block | Syntax highlight cho 20+ ngôn ngữ |
| Table Editor | Hỗ trợ kéo thả chỉnh sửa bảng |
| Shortcuts | `Ctrl+S` lưu, `Ctrl+B` bold, `Ctrl+K` chèn link |

**Component:** `Docs/DocEditor.tsx` – dùng Monaco Editor hoặc CodeMirror cho Markdown, có preview pane.

### 3.3 Version History

| Thông tin mỗi phiên bản | Mô tả |
|--------------------------|-------|
| `versionNumber` | Số phiên bản (tự động tăng) |
| `author` | Người thực hiện thay đổi |
| `timestamp` | Thời gian |
| `diff` | Khác biệt so với phiên bản trước (dạng unified diff) |
| `message` | Mô tả thay đổi (commit message) |

**Component:** `Docs/DocHistory.tsx` – danh sách phiên bản, click vào xem diff, có nút "Restore".

### 3.4 Template Library

Các template có sẵn:

| Template | Mô tả |
|----------|-------|
| **Pentest SOP** | Quy trình kiểm thử chuẩn (Recon → Scan → Attack → Report) |
| **Web App Methodology** | Checklist kiểm thử web (OWASP Top 10) |
| **Network Pentest Checklist** | Checklist kiểm thử mạng nội bộ |
| **AD Attack Playbook** | Kịch bản tấn công Active Directory |
| **Cloud Security Review** | Checklist đánh giá AWS/Azure/GCP |
| **Incident Response Runbook** | Quy trình ứng phó sự cố |
| **Write‑up Template** | Mẫu viết báo cáo lỗ hổng (cho bug bounty) |
| **Blank** | Trang trắng |

Người dùng có thể tạo template riêng bằng cách đánh dấu `isTemplate: true`.

### 3.5 Tìm Kiếm & Tổ Chức

- **Tìm kiếm full‑text**: trong tiêu đề và nội dung tất cả tài liệu.
- **Lọc**: theo category, tags, workspace, author.
- **Sắp xếp**: theo ngày cập nhật, tiêu đề, số lần xem.
- **Ghim**: tài liệu quan trọng lên đầu danh sách.

**Component:** `Docs/DocBrowser.tsx` – grid hoặc list view, sidebar filter.

---

## 4. Activity Feed — Nhật Ký Hoạt Động

### 4.1 Các Sự Kiện Được Ghi

| Sự kiện | Module nguồn | Thông tin ghi |
|---------|-------------|---------------|
| `scan.started` | SCAN | User, target, loại scan, thời gian |
| `scan.completed` | SCAN | Kết quả (số port mở, vuln tìm thấy) |
| `attack.executed` | ATTACK | User, target, exploit, kết quả |
| `attack.succeeded` | ATTACK | Shell obtained, credential |
| `intel.collected` | INTEL | Domain/person, nguồn dữ liệu |
| `doc.created` | COLAB | User, tiêu đề tài liệu |
| `doc.updated` | COLAB | User, tiêu đề, version |
| `chat.message` | COLAB | (chỉ log metadata: kênh, user, thời gian, không log nội dung) |
| `report.exported` | REPORT | User, workspace, định dạng |
| `post.privesc` | POST | User, target, kỹ thuật, kết quả |

**Component:** `Activity/ActivityFeed.tsx` – timeline dạng dọc, có avatar, màu theo loại sự kiện, filter theo module.

### 4.2 Export Audit Log

- Xuất toàn bộ activity log ra JSON hoặc CSV.
- Dùng cho audit trail hoặc tích hợp SIEM.

---

## 5. Tích Hợp Bot & Thông Báo

### 5.1 Notification Bot

Bot tự động gửi tin nhắn vào kênh workspace khi:

| Trigger | Tin nhắn mẫu |
|---------|-------------|
| SCAN hoàn thành | `🔍 Scan hoàn thành trên 192.168.1.0/24: 12 host up, 45 port mở` |
| ATTACK thành công | `💥 Khai thác thành công SQLi trên admin.example.com — đã có shell` |
| Phát hiện Critical | `🚨 Phát hiện CVE-2024-xxxx (CRITICAL) trên target app.example.com` |
| REPORT xuất xong | `📄 Báo cáo PDF "Pentest_ClientX_2025.pdf" đã sẵn sàng` |
| Thành viên mới | `👤 @khanhromvn đã tham gia workspace` |

**Component:** `Bot/NotificationBot.tsx` – cấu hình kênh nhận thông báo, bật/tắt từng loại.

### 5.2 Command Bot

Người dùng có thể gõ lệnh trong chat để tương tác nhanh:

| Lệnh | Mô tả |
|------|-------|
| `/scan quick <target>` | Chạy quick scan (port top 100) |
| `/intel domain <domain>` | Tra cứu nhanh thông tin domain |
| `/doc find <keyword>` | Tìm tài liệu trong Knowledge Base |
| `/report status` | Xem tiến độ workspace hiện tại |
| `/help` | Hiển thị danh sách lệnh |

---

## 6. Cơ Chế An Toàn & Giới Hạn

### 6.1 Phân Quyền

| Vai trò | Quyền hạn |
|---------|-----------|
| **Admin** | Tạo/xóa kênh, quản lý thành viên, xóa tin nhắn, xóa tài liệu, cấu hình bot |
| **Member** | Gửi tin nhắn, tạo/sửa tài liệu, xem activity, upload file |
| **Viewer** | Chỉ xem chat + docs, không gửi/sửa (cho khách hoặc auditor) |

### 6.2 Bảo Mật Dữ Liệu

- **Mã hóa end‑to‑end (tùy chọn)**: Cho direct message nhạy cảm.
- **File upload**: Quét virus (ClamAV) trước khi lưu, giới hạn 50MB/file.
- **Xóa mềm**: Tin nhắn/tài liệu bị xóa vẫn lưu 30 ngày trước khi xóa vĩnh viễn.
- **Log chat**: Không lưu nội dung tin nhắn trong activity log, chỉ lưu metadata.

### 6.3 Giới Hạn

| Tài nguyên | Giới hạn mặc định |
|------------|-------------------|
| File upload | 50MB/file, tổng 1GB/workspace |
| Tin nhắn lịch sử | Lưu vĩnh viễn, load 100 tin/lần |
| Tài liệu | Không giới hạn số lượng |
| Phiên bản tài liệu | Giữ 50 phiên bản gần nhất |
| Thành viên/workspace | 50 (có thể tăng) |

---

## 7. Luồng Dữ Liệu & API

```
User A → gửi tin nhắn → WebSocket → Server → broadcast đến User B, C...
   ↓
Lưu vào database (chatStore) → index để tìm kiếm
   ↓
Bot engine → kiểm tra trigger → gửi thông báo tự động (nếu có)

User → tạo/sửa tài liệu → docStore.save()
   ↓
Tạo version mới → lưu diff → activityLogger ghi sự kiện
   ↓
Các thành viên khác thấy cập nhật real‑time (qua WebSocket)
```

### Endpoints dự kiến

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| GET | `/api/colab/channels` | `{ workspaceId }` | Lấy danh sách kênh |
| POST | `/api/colab/channels` | `{ workspaceId, name, type }` | Tạo kênh mới |
| GET | `/api/colab/messages` | `{ channelId, before?, limit }` | Lấy tin nhắn (pagination) |
| POST | `/api/colab/messages` | `{ channelId, content, replyTo?, attachments? }` | Gửi tin nhắn |
| PUT | `/api/colab/messages/:id` | `{ content }` | Sửa tin nhắn |
| DELETE | `/api/colab/messages/:id` | - | Xóa tin nhắn |
| POST | `/api/colab/messages/:id/reaction` | `{ emoji }` | Thêm cảm xúc |
| GET | `/api/colab/docs` | `{ workspaceId?, category?, tags?, search? }` | Danh sách tài liệu |
| POST | `/api/colab/docs` | `{ title, content, category, tags, workspaceId }` | Tạo tài liệu |
| PUT | `/api/colab/docs/:id` | `{ title?, content?, category?, tags? }` | Cập nhật |
| GET | `/api/colab/docs/:id/history` | - | Lấy lịch sử phiên bản |
| POST | `/api/colab/docs/:id/restore` | `{ versionNumber }` | Khôi phục phiên bản |
| GET | `/api/colab/activity` | `{ workspaceId, module?, type?, limit }` | Lấy activity feed |
| POST | `/api/colab/upload` | `multipart/form-data` | Upload file đính kèm |

Tất cả endpoint yêu cầu authentication qua CORE session.

### WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `message:new` | Server → Client | `{ channelId, message }` |
| `message:edit` | Server → Client | `{ channelId, messageId, content }` |
| `message:delete` | Server → Client | `{ channelId, messageId }` |
| `message:reaction` | Server → Client | `{ channelId, messageId, emoji, userId }` |
| `doc:updated` | Server → Client | `{ docId, title, version, author }` |
| `activity:new` | Server → Client | `{ event }` |
| `bot:notification` | Server → Client | `{ channelId, message }` |
| `typing` | Client → Server | `{ channelId, userId }` |
| `presence` | Bidirectional | `{ userId, status }` |

---

## 8. Hướng Dẫn Phát Triển

### 8.1 Thư Viện Cần Dùng

| Mục đích | Thư viện |
|----------|----------|
| WebSocket | `socket.io` (Server + Client) |
| Chat UI | `@chatscope/chat-ui-kit-react` hoặc tự build |
| Markdown Editor | `@monaco-editor/react` hoặc `codemirror` |
| Markdown Render | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| Diff Viewer | `react-diff-viewer` |
| File Upload | `react-dropzone` |
| Search | `fuse.js` (client‑side) + full‑text search backend (SQLite FTS5 / PostgreSQL) |
| Bot Engine | Rule‑based (tự implement) |
| Activity Feed | Tự build timeline component |

### 8.2 Các Service Cần Viết

| File | Mô tả |
|------|-------|
| `services/websocket.ts` | Quản lý kết nối Socket.IO, xác thực, join channel |
| `services/chatStore.ts` | Lưu tin nhắn (SQLite/PostgreSQL), index tìm kiếm |
| `services/docStore.ts` | CRUD tài liệu, versioning, diff calculation |
| `services/activityLogger.ts` | Ghi sự kiện, cung cấp API query |
| `services/botEngine.ts` | Lắng nghe event từ module khác, gửi tin nhắn tự động |
| `services/fileManager.ts` | Upload, lưu trữ file, quét virus, sinh thumbnail |

### 8.3 UI Components

- **ChatLayout**: Chia 3 cột: danh sách kênh | tin nhắn | thread reply (nếu có).
- **DocLayout**: Chia 2 phần: browser bên trái, editor/viewer bên phải.
- **ActivityTimeline**: Dạng timeline dọc với icon theo loại sự kiện.
- **BotCommandPalette**: `Ctrl+K` mở palette, gõ lệnh `/`.
- **PresenceIndicator**: Chấm xanh/lá/vàng/xám cạnh avatar.

### 8.4 Tích Hợp Với Module Khác

| Module | Cách tích hợp |
|--------|---------------|
| **CORE** | Dùng `useCoreConfig()` lấy user info, workspace context. Gọi `audit()` cho hành động nhạy cảm. |
| **INTEL** | Command bot `/intel domain <d>` gọi INTEL API, trả kết quả vào chat. |
| **SCAN** | Command bot `/scan quick <t>` + notification bot gửi kết quả. |
| **ATTACK** | Notification bot gửi alert khi exploit thành công. |
| **REPORT** | Từ write‑up trong Docs → "Export to REPORT" tạo section báo cáo. |
| **Tất cả module** | Activity Logger gọi từ mọi module qua `services/activityLogger.ts`. |

### 8.5 Database Schema Gợi Ý

```sql
-- Channels
CREATE TABLE channels (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('workspace','custom','dm','group_dm')) NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Messages
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id),
  sender_id TEXT NOT NULL,
  content TEXT,
  reply_to TEXT REFERENCES messages(id),
  edited_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Attachments
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT REFERENCES messages(id),
  doc_id TEXT REFERENCES documents(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Reactions
CREATE TABLE reactions (
  message_id TEXT NOT NULL REFERENCES messages(id),
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);

-- Documents
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT CHECK(category IN ('sop','methodology','cheatsheet','writeup','general')),
  author_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_template INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Document Versions
CREATE TABLE doc_versions (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES documents(id),
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  diff TEXT,
  message TEXT,
  author_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Document Tags
CREATE TABLE doc_tags (
  doc_id TEXT NOT NULL REFERENCES documents(id),
  tag TEXT NOT NULL,
  PRIMARY KEY (doc_id, tag)
);

-- Activity Log
CREATE TABLE activity_log (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  module TEXT NOT NULL,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số chức năng chính** | 5 (Chat, Docs, Activity, Bot, File Sharing) |
| **Loại kênh** | 4 (workspace, custom, DM, group DM) |
| **Loại tài liệu** | 5 (sop, methodology, cheatsheet, writeup, general) |
| **Template có sẵn** | 8 |
| **Bot commands** | 5+ |
| **Giao thức real‑time** | WebSocket (Socket.IO) |
| **Hỗ trợ Markdown** | Đầy đủ (syntax highlight, table, image, link) |
| **Version history** | Có (diff, restore) |
| **Phân quyền** | 3 vai trò (admin, member, viewer) |

> **Phantoma COLAB v1.0.0** — *"Sức mạnh của đội nhóm, kết tinh trong từng dòng chat và trang tài liệu"* 🤝