# Kế hoạch migration IPC sang API endpoint (code/src)

Phạm vi: `src/renderer/src/modules/Code`, server `code/src`, main `src/main/ipc/*`. Chỉ các mục ĐÃ xác minh nằm trong các phase. Mục chưa xác minh nằm riêng ở cuối, chưa được đưa vào phase.

Quy ước chung cho mọi phase:

- Mỗi endpoint mới: `repositories` (nếu có DB) → `services/*.service.ts` → `routes/*.route.ts`, đăng ký ở `routes/routes.ts`.
- Mở rộng `codeApi` trong `services/code-api.service.ts`, sau đó đổi nơi gọi ở renderer.
- Điều kiện hoàn thành mỗi phase: `cd code && npx tsc --noEmit` và `npx tsc --noEmit -p tsconfig.web.json` không phát sinh lỗi mới; người dùng test lại các màn hình bị ảnh hưởng.
- Chưa xóa IPC cũ ở main cho đến khi hết nơi gọi (grep `window.api` xác nhận), rồi mới xóa ở phase 8.

---

## Phase 0 - Nền server (bắt buộc làm trước)

Mục tiêu: server đủ an toàn và không chặn event loop trước khi nhận thêm fs/git.

| #   | Việc                                                                                                                                                                                                                                                                                          | File                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 0.1 | Port `SecurityValidator` (chặn `.env`, `.pem`, `.key`, `id_rsa`, `credentials.json`, `secrets.*`... và ghi vào `/etc /usr /sbin /boot /sys /proc`) sang server; thêm `path.resolve` và kiểm tra path nằm trong project/worktree đã đăng ký (renderer hiện chỉ so chuỗi, `../` chưa chuẩn hóa) | `utils/guard.ts`                                                                                                               |
| 0.2 | Đổi `fs.service.ts` từ `*Sync` sang `fs.promises` (`listDir` stat từng entry, `copy` đệ quy đang chặn event loop)                                                                                                                                                                             | `services/fs.service.ts`, `routes/fs.route.ts`                                                                                 |
| 0.3 | Gom hai bản `runGit` (sync ở `git-extra.service.ts`, async ở `git-remote.service.ts`) về một helper async `execFile`, giữ `GIT_CEILING_DIRECTORIES`                                                                                                                                           | `services/git-extra.service.ts`, `services/git-remote.service.ts`, `services/git.service.ts` (chưa đọc, cần xem trước khi sửa) |
| 0.4 | Thống nhất format thư mục: IPC `fs:read-dir` trả `{ name, type, size }`, API `/fs/list-dir` trả `{ name, path, isDirectory, size, mtime }`. Chọn một format, thêm adapter trong `codeApi.fs` cho nơi gọi cũ (`ListFilesHandler`, `BranchScopeModal`)                                          | `services/code-api.service.ts`                                                                                                 |
| 0.5 | Thống nhất `git:status`: IPC nhận `projectPath` tùy chọn, API bắt buộc `gitRoot`. Đọc `git.handlers.ts:853` để so format với `{ files: Record }` trước khi đổi nơi gọi                                                                                                                        | `git.handlers.ts`, `code/src/services/git.service.ts`                                                                          |
| 0.6 | Sửa `SCHEMA.md`: workflow là `/tasks/:taskId/workflow` (không phải `/workflows/:taskId`)                                                                                                                                                                                                      | `code/SCHEMA.md`                                                                                                               |
| 0.7 | Quyết định số phận `code/src/services/api.service.ts` (trùng `codeApi`, hardcode `CODE_PORT                                                                                                                                                                                                   |                                                                                                                                | 3055`); grep nơi import rồi xóa nếu không dùng | `code/src/services/api.service.ts` |
| 0.8 | Kiểm tra `fs:write-file` ở main có tạo thư mục cha không; nếu có thì `fsService.writeFile` phải `mkdir -p` để giữ hành vi                                                                                                                                                                     | `fs.handlers.ts:338`, `fs.service.ts`                                                                                          |

---

## Phase 1 - Đổi nơi gọi cho endpoint đã có

Không cần viết endpoint mới (sau khi xong 0.2, 0.4, 0.5).

| IPC                  | Endpoint có sẵn           | Nơi gọi                                                                                                                                                                                             |
| -------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fs:list-dir`        | `GET /fs/list-dir`        | `Workspace/FileBreadcrumb.tsx:23`, `Code.tsx:56`, `utils/detectStack.ts:133`                                                                                                                        |
| `fs:write-file`      | `POST /fs/write-file`     | `services/unsaved.service.ts:36`, `hooks/useCodeStore.ts:1008`, `Workspace/File.tsx:53`, `Code.tsx:192`, `WriteToFileHandler`, `ReplaceInFileHandler`                                               |
| `fs:delete-file`     | `DELETE /fs/delete-file`  | `DeleteFileHandler`                                                                                                                                                                                 |
| `fs:rename`          | `POST /fs/rename`         | `MoveFileHandler`                                                                                                                                                                                   |
| `git:ignored-paths`  | `GET /git/ignored-paths`  | `ProjectPanel/BranchScopeModal.tsx:185`                                                                                                                                                             |
| `git:default-branch` | `GET /git/default-branch` | `Git/index.tsx:252`, `PullRequest/index.tsx:39`                                                                                                                                                     |
| `git:status`         | `GET /git/status`         | `hooks/useGitFileStatus.ts:45`, `FooterBar.tsx:160`, `CommitMessageRenderer.tsx:88`, `CreateBranchModal.tsx:131`, `SyncBranchModal.tsx:605`, `ProjectPanel/SessionCard.tsx:545`, `GitStatusHandler` |

Ghi chú: `git:status` chỉ đổi sau khi 0.5 xong. `fs:write-file` ở `WriteToFileHandler` giữ nguyên `SecurityValidator` phía renderer.

---

## Phase 2 - Endpoint fs còn thiếu (chỉ đọc)

Đã xác nhận handler tồn tại ở `src/main/ipc/fs.handlers.ts` và `workspace.handlers.ts`, có thể port logic.

| Endpoint đề xuất                                  | Thay IPC                   | Nơi gọi                                                                                                                                                                 |
| ------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /fs/read-file?path=`                         | `fs:read-file`             | `file-watcher.service.ts:162`, `Headerbar.tsx:109`, `ContentPanel/index.tsx:276,374`, `Workspace/File.tsx:32`, `ReadFileHandler`, `GrepHandler`, `ReplaceInFileHandler` |
| `GET /fs/stat?path=`                              | `fs:stat`                  | `ContentPanel/index.tsx:262,362,383`, `GrepHandler`                                                                                                                     |
| `GET /fs/tree?path=&depth=`                       | `fs:read-dir`              | `ListFilesHandler`, `BranchScopeModal.tsx:202`                                                                                                                          |
| `GET /fs/find-files?root=&pattern=&max=&exclude=` | `fs:find-files`            | `GrepHandler`, `FindFilesHandler`                                                                                                                                       |
| `GET /fs/list-project-files?root=`                | `workspace:list-files`     | `modal/QuickOpenModal.tsx:126`                                                                                                                                          |
| `GET /fs/scan-square-images?root=`                | `fs:scan-square-images`    | `OpenProjectModal.tsx:1038`, `LogoTab.tsx:37`                                                                                                                           |
| `GET /fs/image?path=&side=`                       | `fs:read-image-data-url`   | `ProjectLogo.tsx:13`                                                                                                                                                    |
| `POST /projects/logo/download`                    | `fs:download-project-logo` | `LogoTab.tsx:68`                                                                                                                                                        |

Lưu ý: handler main của `fs:find-files` chỉ nhận `(dirPath, pattern)` (`fs.handlers.ts:450`), nên endpoint mới phải hỗ trợ `max` và `exclude` thật sự (xem Phase 5, lỗi `GrepHandler`). `fs:validate-paths`, `fs:get-homedir`, `workspace:get-files|get-folders|scan-git-repos|check-git-ready` đã xác nhận tồn tại nhưng chưa xác định nơi gọi trong module Code, nên chưa đưa vào phase này.

---

## Phase 3 - Endpoint git (đọc)

Đã xác nhận handler ở `git.handlers.ts`.

| Endpoint đề xuất                                | Thay IPC                                      | Nơi gọi                                                                      |
| ----------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| `GET /git/log?root=&limit=&ref=`                | `git:log`                                     | `Git/index.tsx:275`, `PullRequest/index.tsx:43`, `CreateBranchModal.tsx:156` |
| `GET /git/branches`                             | `git:list-branches`                           | `Git/index.tsx:276`                                                          |
| `GET /git/tags`                                 | `git:list-tags`                               | `Git/index.tsx:278`                                                          |
| `GET /git/local-changes`                        | `git:local-changes`                           | `Git/index.tsx:277`                                                          |
| `GET /git/resolve-ref`                          | `git:resolve-ref`                             | `Git/index.tsx:447`                                                          |
| `GET /git/is-repo`                              | `git:is-repo`                                 | `BranchScopeButton.tsx:44`, `ProjectPanel.tsx:805,1935`                      |
| `GET /git/repo-identity`                        | `git:repo-identity`                           | `OpenProjectModal.tsx:1124,1128,1209`                                        |
| `GET /git/commit-diff`, `GET /git/local-diff`   | `git:commit-diff`, `git:local-diff`           | `Git/DiffView.tsx:52`                                                        |
| `GET /git/commit-body`                          | `git:commit-body`                             | `Git/CommitDetail.tsx:56`, `Git/CommitContextMenu.tsx:80`                    |
| `GET /git/commit-files`                         | `git:commit-files`                            | `Git/index.tsx:318`                                                          |
| `GET /git/remote-url`                           | `git:remote-url`                              | `Git/CommitContextMenu.tsx:57`                                               |
| `GET /git/file-diff`                            | `git:file-diff`                               | `GitDiffHandler`                                                             |
| `GET /git/language-stats`, `GET /git/repo-info` | `git:get-language-stats`, `git:get-repo-info` | `utils/detectStack.ts:241,251`                                               |

Nhóm `git:diff-vs-remote`, `git:branch-sync-file-diff`, `git:remote-branch-exists`, `git:worktree-preview`, `git:unpushed-files`, `git:sync-info` có nơi gọi đã biết (`SyncFileDiffModal`, `SyncBranchModal`, `ProjectPanel.tsx:1331`, `CreateBranchModal.tsx:135`) nhưng chưa xác minh chữ ký/handler, nên chuyển sang mục chưa xác minh.

---

## Phase 4 - Endpoint git (ghi)

Làm sau Phase 3 vì rủi ro cao hơn; mỗi endpoint cần xác nhận ở UI.

| Endpoint đề xuất                                                        | Thay IPC                                                       | Nơi gọi                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| `POST /git/checkout`                                                    | `git:checkout`                                                 | `Git/index.tsx:469`                                         |
| `POST /git/commit`                                                      | `git:commit`                                                   | `GitCommitHandler`                                          |
| `POST /git/stage`, `/git/stage-all`, `/git/unstage`, `/git/unstage-all` | `git:stage`, `git:stage-all`, `git:unstage`, `git:unstage-all` | chưa grep nơi gọi trong module Code, cần grep trước khi làm |
| `POST /git/prune-orphan-branches`                                       | `git:prune-orphan-branches`                                    | `SyncBranchModal.tsx:474`                                   |
| `POST /git/clone` (tiến trình qua SSE)                                  | `git:clone`                                                    | `OpenProjectModal.tsx:1182`                                 |
| `git:protect-status\|enable\|disable`, `git:check-ready`                | cùng tên                                                       | chưa grep nơi gọi                                           |

---

## Phase 5 - Chuyển code nặng và sửa lỗi đã xác minh

Sau Phase 2 và 3. Mỗi mục: chuyển logic sang server, handler ở renderer chỉ còn gọi `codeApi`.

### 5.1. `GrepHandler`

- Vấn đề: N+1 IPC (tối đa 500 file, mỗi file `fs:stat` + `fs:read-file`), regex chạy ở renderer.
- Lỗi: truyền `{ maxFiles: 500, exclude: [...] }` cho `fs:find-files` nhưng main chỉ nhận `(dirPath, pattern)`; `node_modules`, `.git`, `dist` có thể chưa bị loại, giới hạn 500 chưa chắc có hiệu lực. Cần test thực tế trước và sau.
- Làm: `POST /fs/grep`, tái dùng `search.service.ts`; giữ flag `i` và shape `{ results, totalFilesSearched, totalMatches, filesSkippedSize }`.

### 5.2. `ListFilesHandler.buildTree`

- Vấn đề: đệ quy, mỗi thư mục một IPC; `depth: max` = 999 rất chậm.
- Làm: dùng `GET /fs/tree` (Phase 2), duyệt một lần ở server, giữ luật bỏ `node_modules` và file bắt đầu bằng `.`, sắp xếp folder trước.

### 5.3. `FindFilesHandler`

- Làm: gọi `GET /fs/find-files`, giữ `resolveWorkspacePath` ở renderer.

### 5.4. `ReadFileHandler`

- Vấn đề: đọc cả file rồi cắt dòng ở renderer.
- Làm: server cắt theo `start_line`/`end_line`.
- Cần đối chiếu: code hiện dùng `lines.slice(startLine || 0, endLine + 1)` (0-based, end inclusive); kiểm tra với mô tả tool trong prompt (1-based hay 0-based) vì có thể lệch một dòng. Không đổi hành vi nếu chưa chốt.

### 5.5. `ReplaceInFileHandler` + `FuzzyMatcher` + `FileLockManager`

- Vấn đề race: đọc file nằm NGOÀI lock, chỉ ghi nằm trong `fileLockManager.acquire`; ghi từ `unsaved.service`/`useCodeStore` không qua queue của handler.
- Lỗi: `content.replace(target, replaceArgs)` diễn giải `$&`, `$1`, `$$` trong `new_str`. Sửa bằng `content.replace(target, () => replaceArgs)` hoặc cắt chuỗi theo index. Có thể sửa ngay ở renderer, không cần chờ migration.
- Hiệu năng: `getCharacterIndex` `split` lại toàn nội dung mỗi lần gọi; vòng lặp 20 candidate x `max(searchLines*5, 20)` cửa sổ, mỗi vòng tạo bigram Set.
- Làm: `POST /fs/replace-in-file` đọc, khớp (exact rồi fuzzy, ngưỡng score 0.3), ghi trong một mutex theo path ở server, trả `{ success, content }`. Chuyển `FuzzyMatcher` và `FileLockManager` sang server.
- `handleValidateFuzzy` chạy lúc streaming UI, cần độ trễ thấp: giữ bản client, đo rồi mới quyết định thêm `POST /fs/validate-fuzzy`.

### 5.6. `detectStack.ts`

- Vấn đề: `detectRemoteStack`/`detectRemoteLogos` gọi GitHub API thẳng từ renderer (4 request song song, không token, dễ dính rate limit); `detectFromManifest` đoán theo tên file; `sizeBytes` là ước lượng `files.length * 50KB`.
- Làm: `GET /projects/detect-stack?path=`, `GET /projects/detect-remote-stack?url=`, `GET /projects/detect-remote-logos?url=`; server đọc `package.json`, `go.mod`, `Cargo.toml`, `requirements.txt`, `pyproject.toml` thật và tính size thật.

### 5.7. Handler mỏng đổi theo

`WriteToFileHandler`, `DeleteFileHandler`, `MoveFileHandler` (hiện `fs:rename` không tạo thư mục đích nếu chưa có), `GitStatusHandler`, `GitDiffHandler`, `GitCommitHandler`: chỉ thay lời gọi IPC bằng `codeApi`.

---

## Phase 6 - PR, design, terminal history

| Nhóm                                     | Mục đã xác minh                                                                                                                                                      | Ghi chú                                                                                                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pull request (`pullrequest.handlers.ts`) | `pr:status`, `pr:login-token`, `pr:login-web`, `pr:login-web-cancel`, `pr:view`, `pr:diff`                                                                           | thêm `routes/pr.route.ts` + `services/pr.service.ts`; `pr:login-web` có callback/cancel nên dùng SSE hoặc polling                                               |
| PR action động                           | `pr:review`, `pr:merge`, `pr:close`, `pr:comment` qua `runAction(channel, ...)` (`PullRequestPanel.tsx:149`, `PrDetail.tsx:192,210,218`, `PullRequestPanel.tsx:167`) | đổi `runAction` thành gọi `POST /pr/:number/{review\|merge\|close\|comment}`; `pr:list`, `pr:create` renderer gọi nhưng chưa thấy ở main, xem mục chưa xác minh |
| Design (`design.handlers.ts`)            | `design:list`, `design:list-files`, `design:delete`                                                                                                                  | `routes/design.route.ts`; dữ liệu file trong `<project>/design/<name>/`; `useDesignStore.ts:68,86,101,118`                                                      |
| Terminal history                         | `terminal:history-save`, `terminal:history-load`, `terminal:history-delete` (`Terminal.tsx:128,382`, `Workspace/index.tsx:707`)                                      | chỉ là lưu trữ, không gắn PTY; lưu theo `workspace_panels.id` ở server                                                                                          |

---

## Phase 7 - Watcher qua SSE

Phần khó nhất, làm sau cùng khi các phase trên ổn định.

- Thay: `fs:watch-dir`, `fs:unwatch-dir`, `fs:watch-file`, event `fs:dir-changed`, `git:index-changed`.
- Nơi dùng: `FooterBar.tsx:219-232`, `FileExplore/index.tsx:1677-1698,2153-2159`, `services/file-watcher.service.ts:145-231`.
- Làm: `GET /fs/watch?path=` (SSE) hoặc WebSocket; giữ ref-count theo `projectPath` (mỗi watch đúng một unwatch, watcher đóng khi về 0); phát `dir-changed` và `git-index-changed`.
- Điều kiện trước: đọc `fs.handlers.ts` (watch) để biết payload và cách phát cho từng window.

---

## Phase 8 - Dọn dẹp

- Grep `window.api` trong `modules/Code` để xác nhận các channel đã chuyển không còn nơi gọi, rồi xóa handler IPC tương ứng ở main.
- Theo `AGENTS.md`, chỉ `modules/Code/handler/**` được gọi IPC; hiện khoảng 30 component/hook/service gọi `window.api` trực tiếp. Sau migration, các lời gọi còn lại (dialog, shell, browser, terminal, debug) gom về handler.
- Xóa `services/git-status-parser.ts` nếu không còn nơi truyền output thô (cần grep trước).
- Cập nhật `AGENTS.md` (route mới, quy ước `codeApi`) và `code/SCHEMA.md`.

---

## IPC giữ lại (cần API Electron, không migrate)

| IPC                                                                                                        | Lý do                                  |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `dialog:select-paths`, `dialog:show-save`                                                                  | hộp thoại native                       |
| `openFolder`, `shell:open-path`, `shell:open-external`, `pr:open-external`, `browser:open-external`        | mở app/URL ngoài                       |
| `browser:*` (create, set-bounds, navigate, go-back, reload, destroy, event)                                | BrowserView của Electron               |
| `terminal:spawn\|write\|resize\|kill\|kill-foreground` + event `data/exit/process-info/foreground-process` | node-pty gắn vòng đời app, nhạy độ trễ |
| `debug:spawn` và nhóm `debug:*`                                                                            | spawn process/DAP ở main               |

Giữ ở renderer: `SecurityValidator` (phản hồi nhanh cho UI, nhưng server phải có bản bắt buộc ở Phase 0), `RunCommandExecutor` (phụ thuộc terminal IPC), `diffUtils.parseDiff` (chạy theo từng token khi streaming), `tree-builder.buildTreeFromPaths` (thuần UI), `parsers/`, `renderers/`, `prompts/`.

---

## Chưa xác minh (chưa đưa vào phase)

- Handler main chưa thấy ở grep một dòng: `fs:rename`, `fs:mkdir`, `dialog:select-paths` (đã chắc là native), `design:create`, `design:update`, `pr:list`, `pr:create`, `pr:review`, `pr:merge`, `pr:close`, `pr:comment`, `git:remote-branch-exists`, `git:diff-vs-remote`, `git:branch-sync-file-diff`, `git:worktree-preview`, `terminal:history-*`, `openFolder`. Cần đọc `git.handlers.ts`, `pullrequest.handlers.ts`, `design.handlers.ts`, `fs.handlers.ts` để lấy chữ ký và format thật.
- Payload event `fs:dir-changed`, `git:index-changed`.
- Format trả về `git:status` (IPC) so với `/git/status` (đã đưa thành việc 0.5).
- Nơi gọi trong module Code của `git:stage*`, `git:unstage*`, `git:protect-*`, `git:check-ready`, `fs:validate-paths`, `fs:get-homedir`, `workspace:get-*`, `workspace:scan-git-repos`, `workspace:check-git-ready`.
- Các file lớn chưa đọc: `useCodeStore.ts` (1451 dòng), `ProjectPanel.tsx` (3442), `FileExplore/index.tsx` (2529), `SyncBranchModal.tsx` (1549), `OpenProjectModal.tsx` (1639), `TaskModal.tsx` (1328), `workspaceLayout.ts` (435); chưa thể kết luận có logic nặng cần chuyển hay không.
- `code/src/services/git.service.ts`, `search.service.ts`, `project.service.ts` chưa đọc nội dung; cần đọc trước khi tái dùng ở Phase 0 và 5.
- Một số lời gọi `window.api` nhiều dòng chưa lộ channel; cần grep pattern nhiều dòng.
