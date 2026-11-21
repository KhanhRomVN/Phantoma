# Code — SCHEMA

---

# code.sql

Lưu ở: `<codeDir>/code.sql`

## projects

| Cột          | Ghi chú                                                                                 |
| ------------ | --------------------------------------------------------------------------------------- |
| `id`         | uuid, PK                                                                                |
| `logo`       | optional (NULL nếu không có), chứa path tới ảnh hoặc cả nội dung ảnh (png, jpg, svg...) |
| `name`       | tên hiển thị                                                                            |
| `repository_url` | optional (NULL nếu không có), URL của git repository (vd: https://github.com/user/repo) |
| `group_id`   | optional FK → `groups.id` ON DELETE SET NULL, project thuộc group nào (group chỉ áp dụng ở cấp project) |
| `sort_order` | thứ tự hiển thị, mặc định 0                                                             |
| `created_at` |                                                                                         |
| `updated_at` |                                                                                         |

## groups

| Cột          | Ghi chú                                                   |
| ------------ | --------------------------------------------------------- |
| `id`         | uuid, PK                                                  |
| `name`       | tên group hiển thị                                        |
| `icon_id`    | optional (NULL nếu không có), id của icon từ GROUP_ICONS  |
| `sort_order` | thứ tự hiển thị, mặc định 0                               |
| `is_open`    | BOOLEAN (SQLite lưu 1/0, công cụ xem DB hiện true/false), mặc định true, group có đang expand hay collapse        |
| `created_at` |                                                           |
| `updated_at` |                                                           |

## worktrees

| Cột           | Ghi chú                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------- |
| `id`          | uuid, PK                                                                                          |
| `project_id`  | FK → `projects.id` ON DELETE CASCADE                                                              |
| `path`        | đường dẫn tuyệt đối đã `path.resolve`, UNIQUE                                                     |
| `branch`      | branch của worktree                                                                               |
| `visible`     | 0/1, mặc định 1, worktree có hiển thị trong UI hay không                                          |
| `search_term` | từ khóa ở searchbar của `ActivityPanel/Search` (`useSearch.ts`), lưu theo worktree, mặc định rỗng |


## sessions

| Cột           | Ghi chú                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------- |
| `id`          | uuid, PK                                                                                     |
| `worktree_id` | FK → `worktrees.id` ON DELETE CASCADE, UNIQUE — mỗi worktree chỉ có 1 session               |
| `title`       | tiêu đề session, mặc định `New session`                                                      |
| `layout`      | optional (NULL), JSON layout Workspace `{ paneTabs, paneActive, focusedPane, sizes }`        |
| `active_panel_id` | optional (NULL), id tab đang active của session                                          |
| `created_at`  |                                                                                              |
| `updated_at`  |                                                                                              |

- `status`, `agents`, `procs`, `summary` là dữ liệu runtime, KHÔNG lưu DB. `tasks.session_id` trỏ tới `sessions.id` (chưa có FK).
- `POST /sessions` thay thế session cũ của worktree (body: `projectId` + `worktreePath` hoặc `worktreeId`, `title?`).
- API: `GET/POST /sessions`, `GET/PUT/DELETE /sessions/:id`; `GET /projects` trả kèm `worktrees[].session` (hoặc `null`).

## workspace_panels

Các tab đang mở trong Workspace của một session. Xóa session → xóa hết tab (ON DELETE CASCADE).

| Cột                      | Ghi chú                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `id`                     | id panel, PK                                                              |
| `session_id`             | FK → `sessions.id` ON DELETE CASCADE                                      |
| `type`                   | `terminal` \| `website` \| `emulator` \| `file` \| `agent` \| `agenttools` \| `design` |
| `title`                  | tiêu đề tab                                                               |
| `content`                | optional, nội dung/url tùy loại panel                                     |
| `file_path`              | optional, đường dẫn file khi `type = file`                                |
| `cwd`                    | optional, working directory của terminal                                  |
| `provider_id`            | optional, AI provider đã detect                                           |
| `zencli_conversation_id` | optional, conversation ZenCLI đang bind                                   |
| `zencli_last_active_at`  | optional, timestamp tương tác cuối                                        |
| `agent_conversation_id`  | optional, conversation của Agent panel                                    |
| `agent_title`            | optional, title conversation của Agent panel                              |
| `workflow_agent_id`      | optional, workflow agent liên kết với Zen tab                             |
| `pinned`                 | 0/1, tab được ghim                                                        |
| `sort_order`             | thứ tự tab trong session                                                  |

- Dữ liệu runtime (`terminalRunning`, `browserTitle`, `initialCommand`, `preview`...) KHÔNG lưu DB.
- API: `PUT /sessions/:id/workspace` với body `{ panels, layout, activePanelId }` ghi đè toàn bộ; `GET /projects` trả `worktrees[].session.panels`.

## scopes

| Cột           | Ghi chú                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------- |
| `id`          | uuid, PK                                                                                     |
| `worktree_id` | FK → `worktrees.id` ON DELETE CASCADE                                                        |
| `path`        | đường dẫn tương đối trong worktree (vd: `src/components`, `README.md`)                      |
| `created_at`  |                                                                                              |

- Index: `(worktree_id, path)` UNIQUE — mỗi worktree không được phép có path trùng lặp
- Scope rỗng (không có row nào) = worktree có toàn quyền truy cập (full access)
- Scope được set qua `BranchScopeModal` / API `PUT /worktrees/:id/scopes` với body `{ paths: string[] }`

## tasks

| Cột           | Ghi chú                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------- |
| `id`          | uuid, PK (format: `task_<timestamp>_<random>`)                                                    |
| `project_id`  | FK → `projects.id` ON DELETE CASCADE, task thuộc về project                                       |
| `title`       | tiêu đề task (required)                                                                           |
| `description` | mô tả chi tiết, mặc định rỗng                                                                     |
| `status`      | enum: 'todo' \| 'progress' \| 'done', mặc định 'todo'                                            |
| `priority`    | enum: 'low' \| 'medium' \| 'high', mặc định 'medium'                                             |
| `session_id`  | optional (NULL), ID của session đang thực hiện task                                               |
| `branch_name` | optional (NULL), tên branch đang làm task                                                         |
| `start_date`  | optional (NULL), timestamp (ms) ngày bắt đầu                                                      |
| `start_time`  | optional (NULL), thời gian bắt đầu dạng `HH:MM`                                                   |
| `end_date`    | optional (NULL), timestamp (ms) ngày kết thúc (deadline)                                          |
| `end_time`    | optional (NULL), thời gian kết thúc dạng `HH:MM`                                                  |
| `archived`    | 0/1, mặc định 0, task có bị archive không                                                         |
| `workflow_id` | optional (NULL), ID của workflow liên kết (format: `workflow_<task_id>`)                          |
| `order`       | thứ tự sắp xếp, mặc định = created_at                                                             |
| `created_at`  | timestamp (ms)                                                                                    |
| `updated_at`  | timestamp (ms)                                                                                    |

## task_dependencies

| Cột               | Ghi chú                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `task_id`         | FK → `tasks.id` ON DELETE CASCADE                                    |
| `depends_on_id`   | FK → `tasks.id` ON DELETE CASCADE, task phải chờ task này hoàn thành |

- Index: `(task_id, depends_on_id)` UNIQUE
- Dùng để biểu diễn dependency graph: task A depends on task B → task A chỉ bắt đầu khi task B done

## task_tags

| Cột       | Ghi chú                                                      |
| --------- | ------------------------------------------------------------ |
| `id`      | uuid, PK                                                     |
| `task_id` | FK → `tasks.id` ON DELETE CASCADE                            |
| `label`   | nhãn tag (vd: "bug", "feature", "urgent")                   |
| `color`   | CSS var color (vd: "--blue", "--red", "--green")            |

- Index: `task_id`

## task_checklist

| Cót       | Ghi chú                                     |
| --------- | ------------------------------------------- |
| `id`      | uuid, PK                                    |
| `task_id` | FK → `tasks.id` ON DELETE CASCADE           |
| `text`    | nội dung checklist item                     |
| `done`    | 0/1, item đã hoàn thành chưa                |
| `order`   | thứ tự hiển thị trong danh sách checklist   |

- Index: `task_id`

## task_attachments

| Cột       | Ghi chú                                                      |
| --------- | ------------------------------------------------------------ |
| `id`      | uuid, PK                                                     |
| `task_id` | FK → `tasks.id` ON DELETE CASCADE                            |
| `path`    | đường dẫn tuyệt đối tới file/folder đính kèm                |
| `kind`    | enum: 'file' \| 'folder'                                     |
| `order`   | thứ tự hiển thị                                              |

- Index: `task_id`

## workflows

| Cột           | Ghi chú                                                                         |
| ------------- | ------------------------------------------------------------------------------- |
| `id`          | uuid, PK (format: `workflow_<task_id>`)                                         |
| `task_id`     | FK → `tasks.id` ON DELETE CASCADE, UNIQUE (mỗi task chỉ có 1 workflow)         |
| `content`     | nội dung markdown của workflow                                                  |
| `created_at`  | timestamp (ms)                                                                  |
| `updated_at`  | timestamp (ms)                                                                  |

- Workflow là tài liệu markdown mô tả chi tiết flow thực hiện task (dùng cho multi-agent orchestrator)
- API: `GET/POST /tasks/:taskId/workflow`, `PUT /tasks/:taskId/workflow` (replace pattern old_content → new_content)

---

## Notes

- `ActivityPanel/Skill` và `ActivityPanel/Account.tsx`: giữ nguyên, không thuộc project nên không có bảng ở đây (Skill vẫn là dữ liệu toàn cục của `SkillStorage`).
- `ConversationStorage` (lịch sử chat), `MemoryStorage` vẫn là dữ liệu toàn cục/khác, chưa thiết kế ở đây. Có thể thêm bảng `conversations` vào `code.sql` ở bước sau nếu muốn gom theo project.
- Task hiện tại lưu JSON ở `~/.phantoma/code/<slug>/tasks.json`, migration sang SQLite sẽ cần script convert.
- Workflow hiện tại lưu riêng file markdown ở `~/.phantoma/code/<slug>/workflows/workflow_<task_id>.md`, có thể gộp vào bảng `workflows` hoặc giữ nguyên file system.