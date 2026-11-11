# Kiến trúc lưu trữ dữ liệu của Phantoma

> **Tài liệu kỹ thuật** · Data Storage Architecture
> Mô tả cấu trúc thư mục, định dạng file và cách quản lý dữ liệu cục bộ của ứng dụng Phantoma.

| Thuộc tính | Giá trị |
|---|---|
| **Thư mục gốc** | `~/.phantoma/` |
| **Cơ sở dữ liệu chính** | SQLite (chế độ WAL) |
| **Định dạng dữ liệu phụ** | JSON, Markdown, TSX |
| **Phạm vi** | Theo module (Emulate, Recon, Code) và toàn cục (Skills) |

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
   - [1.1 Cây thư mục tổng thể](#11-cây-thư-mục-tổng-thể)
   - [1.2 Phạm vi lưu trữ](#12-phạm-vi-lưu-trữ)
   - [1.3 Quy ước đặt tên](#13-quy-ước-đặt-tên)
2. [Cơ sở dữ liệu SQLite](#2-cơ-sở-dữ-liệu-sqlite)
3. [Module Emulate](#3-module-emulate)
   - [3.1 Cấu trúc tổng thể](#31-cấu-trúc-tổng-thể)
   - [3.2 Repeaters](#32-repeaters)
   - [3.3 Reports](#33-reports)
4. [Module Recon](#4-module-recon)
5. [Module Code](#5-module-code)
   - [5.1 Cấu trúc tổng thể](#51-cấu-trúc-tổng-thể)
   - [5.2 Mã hoá đường dẫn project](#52-mã-hoá-đường-dẫn-project)
   - [5.3 Tasks](#53-tasks)
   - [5.4 Workflows](#54-workflows)
   - [5.5 Designs](#55-designs)
6. [Skills (toàn cục)](#6-skills-toàn-cục)
7. [Phụ lục: Bản đồ mã nguồn liên quan](#7-phụ-lục-bản-đồ-mã-nguồn-liên-quan)
8. [Các điểm cần xác nhận](#8-các-điểm-cần-xác-nhận)

---

## 1. Tổng quan

Phantoma lưu toàn bộ dữ liệu người dùng trong một thư mục ẩn duy nhất tại `~/.phantoma/`. Dữ liệu được tổ chức theo **module** (Emulate, Recon, Code) và theo **đối tượng làm việc** (target hoặc project), bên cạnh các tài nguyên **toàn cục** dùng chung (Skills).

### 1.1 Cây thư mục tổng thể

```text
~/.phantoma/
├── phantoma.sql                  # Cơ sở dữ liệu SQLite chính
├── phantoma.sql-shm              # SQLite shared memory
├── phantoma.sql-wal              # SQLite write-ahead log
├── emulate/                      # Dữ liệu module Emulate (theo target)
│   └── {targetId}/
│       ├── conversations/
│       ├── repeaters/
│       └── reports/
├── recon/                        # Dữ liệu module Recon (theo target)
│   └── {targetId}/
│       └── conversations/
├── code/                         # Dữ liệu module Code (theo project)
│   └── {system_path}/
│       ├── tasks.json
│       ├── workflows/
│       ├── worktrees/
│       ├── designs/
│       └── conversations/
└── skills/                       # Skill toàn cục
    ├── groups.json               # Nhóm skill (chỉ quản lý việc gán skill vào nhóm)
    └── {slug}/                   # Mỗi skill một thư mục
        ├── SKILL.md
        └── {slug}.json
```

> **Lưu ý:** thư mục `designs/` được bổ sung vào sơ đồ ở trên để đồng bộ với [mục 5.5](#55-designs); bản gốc chỉ mô tả thư mục này ở phần chi tiết.

### 1.2 Phạm vi lưu trữ

| Thành phần | Phạm vi | Khoá phân vùng |
|---|---|---|
| Cơ sở dữ liệu SQLite | Toàn cục | — |
| Emulate | Theo target | `{targetId}` |
| Recon | Theo target | `{targetId}` |
| Code | Theo project | `{system_path}` (base64url) |
| Skills | Toàn cục | `{slug}` |


### 1.3 Quy ước đặt tên

| Mẫu | Ý nghĩa |
|---|---|
| `emulate/{targetId}` | Thư mục dữ liệu Emulate của một target |
| `recon/{targetId}` | Thư mục dữ liệu Recon của một target |
| `code/{system_path}` | Thư mục dữ liệu Code của một project |
| `repeater_{requestId}` | Một request lặp lại |
| `report:{reportId}` | Một báo cáo |
| `workflow_{taskId}.md` | File workflow của một task |
| `design_{id}` | Một design UI |
| `{conversationId}.json` | Một cuộc hội thoại |

---

## 2. Cơ sở dữ liệu SQLite

Ba file nằm trực tiếp ở thư mục gốc `~/.phantoma/`:

| File | Vai trò |
|---|---|
| `phantoma.sql` | File cơ sở dữ liệu SQLite chính |
| `phantoma.sql-shm` | Vùng nhớ chia sẻ (shared memory) của SQLite |
| `phantoma.sql-wal` | Nhật ký ghi trước (write-ahead log) của SQLite |

> Hai file `-shm` và `-wal` do SQLite tự quản lý khi bật chế độ WAL, **không** chỉnh sửa hoặc xoá thủ công khi ứng dụng đang chạy.

---

## 3. Module Emulate

Lưu trữ dữ liệu phiên emulate: hội thoại, request lặp lại và báo cáo.

### 3.1 Cấu trúc tổng thể

```text
~/.phantoma/emulate/{targetId}/
├── conversations/
├── repeaters/
└── reports/
```

| Thư mục | Nội dung |
|---|---|
| `conversations/` | Hội thoại của phiên emulate |
| `repeaters/` | Các request lặp lại, phân nhóm theo `repeater_{requestId}` |
| `reports/` | Các báo cáo, mỗi báo cáo một thư mục `report:{reportId}` |

### 3.2 Repeaters

Mỗi request lặp lại được lưu trong một thư mục riêng, đặt tên `repeater_{requestId}`, gồm ba file tách biệt theo thành phần của request.

```text
~/.phantoma/emulate/{targetId}/repeaters/
├── repeater_{requestId_1}/
│   ├── params.json
│   ├── headers.json
│   └── body.json
└── repeater_{requestId_2}/
    ├── params.json
    ├── headers.json
    └── body.json
```

| File | Nội dung |
|---|---|
| `params.json` | Tham số của request |
| `headers.json` | Header của request |
| `body.json` | Nội dung body của request |

### 3.3 Reports

Mỗi report gồm một file markdown mô tả báo cáo và một thư mục `code/` chứa các file code đi kèm.

```text
~/.phantoma/emulate/{targetId}/reports/
└── report:{reportId}/
    ├── reportId.md
    └── code/
        ├── index.html
        ├── style.css
        └── script.js
```

| Thành phần | Mô tả |
|---|---|
| `reportId.md` | Báo cáo ở dạng markdown |
| `code/` | Các file code khác (HTML, CSS, JS...) |

---

## 4. Module Recon

Lưu trữ hội thoại của phiên recon.

```text
~/.phantoma/recon/{targetId}/
└── conversations/
    └── {conversationId}.json
```

Mỗi cuộc hội thoại là một file JSON riêng, đặt tên theo `conversationId`.

---

## 5. Module Code

Lưu trữ dữ liệu của module Code **theo từng project**.

### 5.1 Cấu trúc tổng thể

```text
~/.phantoma/code/{system_path}/
├── tasks.json               # Danh sách task của kanban board
├── workflows/               # Workflow của task (mỗi task tối đa 1 file workflow_{taskId}.md)
├── worktrees/               # Git worktree của các branch (mỗi branch một thư mục {branchSlug})
├── designs/                 # Design UI tạm thời (mỗi design một thư mục design_{id})
└── conversations/           # Hội thoại AI assistant
    └── {conversationId}.json
```

### 5.2 Mã hoá đường dẫn project

`{system_path}` là **base64url** của đường dẫn tuyệt đối tới project.

| Đường dẫn project | Giá trị `{system_path}` |
|---|---|
| `/home/user/proj` | `L2hvbWUvdXNlci9wcm9q` |

Thư mục tương ứng: `~/.phantoma/code:L2hvbWUvdXNlci9wcm9q/`

### 5.3 Tasks

#### Tổng quan

`tasks.json` là một **mảng JSON** các task, kiểu `StoredTask` (định nghĩa tại `src/renderer/src/modules/Code/services/task.service.ts`). File được ghi theo kiểu **atomic** bởi `src/main/storage/TaskStorage.ts`.

#### Lược đồ trường

| Trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|:---:|---|---|
| `id` | TEXT (PK) | ✅ | — | Định danh task |
| `title` | TEXT | ✅ | — | Tiêu đề |
| `description` | TEXT | | `''` | Mô tả |
| `status` | TEXT | | `'todo'` | Trạng thái: `todo`, `progress`, `review`, `done` |
| `priority` | TEXT | | `'medium'` | Độ ưu tiên: `low`, `medium`, `high` |
| `session_id` | TEXT | | `NULL` | Khoá ngoại mềm tới conversation/session id |
| `workflow_id` | TEXT | | `NULL` | `workflow_{taskId}`; `NULL` nghĩa là task chưa có workflow |
| `branch_name` | TEXT | | `NULL` | Tên git branch liên kết |
| `due_date` | INTEGER | | `NULL` | Hạn chót, Unix timestamp (ms) |
| `created_at` | INTEGER | ✅ | — | Thời điểm tạo, Unix timestamp (ms) |
| `updated_at` | INTEGER | ✅ | — | Thời điểm cập nhật, Unix timestamp (ms) |

#### Lược đồ SQL tham chiếu

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  status      TEXT CHECK(status IN ('todo','progress','review','done')) DEFAULT 'todo',
  priority    TEXT CHECK(priority IN ('low','medium','high')) DEFAULT 'medium',
  session_id  TEXT DEFAULT NULL,    -- FK mềm tới conversation/session id
  workflow_id TEXT DEFAULT NULL,    -- `workflow_{taskId}`; NULL = task chưa có workflow
  branch_name TEXT DEFAULT NULL,    -- Tên git branch liên kết
  due_date    INTEGER DEFAULT NULL, -- Unix ms timestamp
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_session ON tasks(session_id);
```

#### IPC channels

| Channel | Chức năng |
|---|---|
| `task:list` | Lấy danh sách task |
| `task:get` | Lấy một task |
| `task:create` | Tạo task |
| `task:update` | Cập nhật task |
| `task:delete` | Xoá task |

Handler: `src/main/ipc/task.handlers.ts`.

### 5.4 Workflows

Mỗi task có **tối đa 1 workflow**, lưu thành file Markdown tại `workflows/workflow_{taskId}.md`.

- Trường `workflowId` của task (`workflow_{taskId}`, hoặc `null` nếu chưa có) cho biết task đã có workflow hay chưa.
- File được ghi atomic bởi `src/main/storage/WorkflowStorage.ts`.
- Renderer gọi qua `services/workflow.service.ts`.

| IPC channel | Chức năng |
|---|---|
| `workflow:get` | Đọc workflow của task |
| `workflow:create` | Tạo file workflow và gán `workflowId` cho task |
| `workflow:update` | Cập nhật workflow bằng cách thay thế **exact-match** |

Handler: `src/main/ipc/workflow.handlers.ts`.

### 5.5 Designs

Lưu trữ các design UI **tạm thời** (dùng `mockData`) theo từng project của module Code. Mỗi design là một thư mục `design_{id}` chứa `meta.json` và các file page `.tsx` được tạo từ template.

```text
~/.phantoma/code/{system_path}/designs/
└── design_{id}/
    ├── meta.json
    ├── mockData.ts
    ├── Home.tsx
    └── Profile.tsx
```

#### Cấu trúc `meta.json`

| Trường | Mô tả |
|---|---|
| `id` | Định danh design |
| `name` | Tên design |
| `description` | Mô tả |
| `nodes` | Danh sách node (xem bảng dưới) |
| `createdAt` | Thời điểm tạo |
| `updatedAt` | Thời điểm cập nhật |

Mỗi phần tử trong `nodes` tương ứng **một page** (`file`) và được hiển thị dưới dạng diagram:

| Trường node | Mô tả |
|---|---|
| `id` | Định danh node |
| `name` | Tên page |
| `route` | Route của page |
| `file` | File `.tsx` tương ứng |
| `x`, `y` | Toạ độ node trên diagram |

#### Biên dịch và quản lý

- Page `.tsx` được **biên dịch lúc chạy bằng esbuild** ở main process, sau đó nạp vào `iframe`.
- Lưu trữ: `src/main/storage/DesignStorage.ts`.
- Handler: `src/main/ipc/design.handlers.ts`.

| IPC channel | Chức năng |
|---|---|
| `design:list` | Liệt kê design |
| `design:create` | Tạo design |
| `design:update` | Cập nhật design |
| `design:delete` | Xoá design |
| `design:compile-page` | Biên dịch một page |

---

## 6. Skills (toàn cục)

Skill tải từ **mcp.directory**, lưu **toàn cục** (không theo project hay module) để dùng ở mọi nơi trong Phantoma.

Mỗi skill là một thư mục `{slug}/` chứa toàn bộ gói skill: luôn có `SKILL.md` ở gốc, có thể kèm `scripts/`, `references/`, `assets/`..., cùng metadata `{slug}.json`.

```text
~/.phantoma/skills/
└── {slug}/
    ├── SKILL.md
    ├── {slug}.json
    └── scripts/ references/ assets/ ...
```

### Nhóm skill

Lưu tại `~/.phantoma/skills/groups.json`:


{
  "groups": [
    {
      "name": "string",
      "slugs": ["string"],
      "icon": "string (tuỳ chọn)",
      "color": "string (tuỳ chọn)",
      "description": "string (tuỳ chọn)"
    }
  ]
}


| Trường | Mô tả |
|---|---|
| `groups` | Danh sách nhóm skill (`name`, `slugs`, và tuỳ chọn `icon`, `color`, `description`) |

File chỉ quản lý việc gán skill vào nhóm. Nếu chưa có `groups.json`, app đọc `groups` từ file cũ `~/.phantoma/skill-workspace-state.json` (nếu còn) và lần lưu kế tiếp sẽ ghi sang `groups.json`.
### Cài đặt skill

1. Tải file zip của skill.
2. Giải nén vào thư mục tạm `{slug}.tmp-*`.
3. Đổi tên thành `{slug}` để hoàn tất.

Quy trình này đảm bảo **không để lại skill dở dang** nếu quá trình cài đặt bị gián đoạn.

| Thành phần | Vị trí |
|---|---|
| Lưu trữ | `src/main/storage/SkillStorage.ts` |
| API marketplace | `src/main/services/skill-marketplace.ts` |
| IPC `skill:*` | `src/main/ipc/skill.handlers.ts` |

---

## 7. Phụ lục: Bản đồ mã nguồn liên quan
| Chức năng | Storage | IPC handler | Renderer service |
|---|---|---|---|
| Tasks | `src/main/storage/TaskStorage.ts` | `src/main/ipc/task.handlers.ts` | `src/renderer/src/modules/Code/services/task.service.ts` |
| Workflows | `src/main/storage/WorkflowStorage.ts` | `src/main/ipc/workflow.handlers.ts` | `services/workflow.service.ts` |
| Designs | `src/main/storage/DesignStorage.ts` | `src/main/ipc/design.handlers.ts` | — |
| Skills | `src/main/storage/SkillStorage.ts` | `src/main/ipc/skill.handlers.ts` | — (marketplace: `src/main/services/skill-marketplace.ts`) |

---

## 8. Các điểm cần xác nhận

- [ ] `phantoma.sql`, `phantoma.sql-shm`, `phantoma.sql-wal` vẫn giữ ở thư mục gốc `~/.phantoma/`?
- [ ] Thư mục `conversations/` trong `recon/{targetId}` và `code/{system_path}` dùng số nhiều (`conversations/`) đúng không?
- [ ] File `reportId.md` nằm cùng cấp với `code/` trong `report:{reportId}/`?
- [ ] Mục [5.3](#53-tasks): `tasks.json` lưu dạng mảng JSON nhưng tài liệu gốc mô tả bằng lược đồ SQL (`CREATE TABLE`). Đây chỉ là lược đồ tham chiếu cho các trường, hay `tasks` thực sự còn nằm trong `phantoma.sql`?
- [ ] Tên file `reportId.md` là tên cố định, hay sẽ được thay bằng giá trị `{reportId}` thực tế (ví dụ `{reportId}.md`)?