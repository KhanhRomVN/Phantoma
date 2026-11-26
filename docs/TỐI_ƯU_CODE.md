# Kế hoạch Sửa lỗi + Hardening Server (`code/src`)

> Giai đoạn 1 — Lập kế hoạch. File này do Planner tạo; Planner **không** sửa bất kỳ file code nào.
> Phạm vi: `code/src/**` (server). UI chỉ được nhắc ở mục "Ảnh hưởng UI" của từng task (client sửa theo server, xem mục 0).
> Nguồn quét: `code.zip` (77 file, ≈186 KB) đã đọc toàn bộ + 5 thí nghiệm kiểm chứng (đánh dấu ✔). Ngày quét: 2026-11-24.
> Kế hoạch này **độc lập** với kế hoạch Restructure: mã đã quét đã có `http/`, `infra/`, `services/git/`, `services/fs/` nên đường dẫn trong file này khớp với cấu trúc hiện tại.

## 0. Tóm tắt

- **Hiện trạng:** phân tầng `routes → services → repositories` ổn, nhưng còn 21 nhóm vấn đề (mục 1.2): thư mục worktree bị xóa ngoài app mà DB không đổi (S01), `id` project do client gửi được ghép thẳng vào `rmSync` (S02 ✔), `PUT /projects` xóa hàng loạt không sao lưu (S03), auth/CORS mặc định mở (S04), guard đường dẫn không `realpath` (S05), migration không phiên bản + không backup (S06), git đọc sai tên file tiếng Việt và dòng rename (S07 ✔), `/git/remote-diff` luôn trả `{}` (S08 ✔), bug ở search/task/scope/session (S09–S13), process git/gh không timeout (S14), …
- **Mục tiêu:** (1) server **tự đồng bộ** với ổ đĩa và **tự chống** dữ liệu sai từ client; (2) an toàn mặc định, sẵn sàng chế độ remote; (3) không mất dữ liệu (backup + log); (4) sửa bug đã xác nhận. Giữ nguyên hành vi và hợp đồng API khi không cần đổi.
- **Quy mô:** 11 phase, ≈59 task (mỗi task ≤ 5 file ghi, 1 commit, build được).

### Quyết định đã chốt (trả lời của chủ dự án)

| #   | Câu hỏi                       | Quyết định                                                            | Hệ quả trong kế hoạch                                                                                                                                                                                                                                                          |
| --- | ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Worktree bị mất folder        | **Xóa ngay** khỏi DB (không có trạng thái `missing`)                  | Phase 4: `reconcile` xóa hàng + cascade session/panel/scope ngay khi `ENOENT`/`ENOTDIR`. Vì xóa ngay không hoàn tác được nên **Phase 3 (backup + log) phải xong trước Phase 4**. Chỉ xóa khi lỗi là `ENOENT`/`ENOTDIR`; `EACCES`/`EIO`/`ENOTCONN` → bỏ qua + cảnh báo.         |
| 2   | Sự kiện realtime              | **Chấp nhận** SSE `/events`                                           | Task 4.1. Client dùng fetch-stream (như `search/stream`) để gửi được header `Authorization`.                                                                                                                                                                                   |
| 3   | Phạm vi triển khai            | **Sẽ có remote trong tương lai**                                      | Phase 5 thiết kế remote-ready: bind ngoài loopback bắt buộc có token, kiểm tra `Host`/`Origin`, `trusted` gắn token. Phase 9 có endpoint quản lý git worktree phía server (client remote sẽ không còn IPC của Electron). Windows **chưa trả lời** → xử lý có điều kiện (10.4). |
| 4   | Client có gửi `id` đúng không | **Không cần hỏi**: server tự chịu trách nhiệm, client sửa theo server | Phase 6: `syncTags`/`syncChecklist` chấp nhận mọi payload (id lạ/trùng → server cấp id mới và trả id chuẩn). Phase 3: guard chống xóa nhầm do server tự kiểm tra, không dựa vào cờ của client (trừ 3.5, có điều kiện).                                                         |
| 5   | Tương thích API               | **Không ảnh hưởng thì giữ nguyên**                                    | Giữ `{error}` + HTTP 200 của git/pr; giữ `createdAt` dạng số của task; giữ tên route; chỉ thêm field/endpoint (additive). Mọi thay đổi có ảnh hưởng nằm trong bảng 2.4 để client theo.                                                                                         |

- **Điểm cần xác nhận sớm (mục 7):** (1) origin của renderer production (`file://`/`null`?) để chốt allowlist CORS; (2) có hỗ trợ Windows không; (3) hành vi regex của `fs/grep` đổi sang Rust-regex (Task 8.3); (4) Task 3.5 (`confirmDeleteAll`).

## 1. Hiện trạng

### 1.1 Cây thư mục server hiện tại (đọc thật)

```
index.ts                         # bootstrap + cors + health + shutdown
config/server.config.ts
database/{connection,integrity}.ts
domain/{mappers,api-types}.ts
http/{auth,envelope,guard,params,sse}.ts
infra/{process-runner,git-runner,gh-runner}.ts
repositories/ (12 file)
routes/{routes,project,group,scope,session,task,fs,git,search,pull-request}.route.ts
services/
  project/worktree/session/scope/task/workflow/group .service.ts
  fs/{fs-write,fs-query,image}.service.ts
  git/{default-branch,git-status,git-read,git-write,git-branch,git-remote,git-protect,
       git-export,git-explorer,git-history,git-diff,git-repo,language-stats}.ts
  search/search.service.ts
  pull-request/pull-request.service.ts
  git-runner.ts (shim)   ;   utils/{guard,http}.ts (shim)
```

### 1.2 Danh sách vấn đề

Mức: **C** = cao (mất dữ liệu/bảo mật), **T** = trung (bug/độ bền), **Th** = thấp. ✔ = đã chạy thử nghiệm xác nhận.

| ID  | Mức | Vấn đề                                                                                                                                                                                                                                                                                                      | Bằng chứng (file:dòng đã đọc)                                                                                                                                                                                            |
| --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S01 | C   | Xóa folder worktree ngoài app: DB không đổi; `GET /projects` vẫn trả; `git status` báo sai "Git is not installed" ✔ (cwd không tồn tại → `ENOENT`); `fs/write-file` có `mkdir recursive` nên **tạo lại folder rỗng**; metadata worktree của git không được prune; `worktreeService.remove` chỉ xóa hàng DB. | `integrity.ts:33-83` (chỉ FK DB), `git-status.service.ts:54-56`, `fs-write.service.ts:47-52`, `guard.ts:58-76` (root lấy từ DB), `git-branch.service.ts:58` (prune chỉ khi gọi route prune), `worktree.service.ts:60-63` |
| S02 | C   | `id` do client gửi dùng trong `path.join(dataDir, id)` rồi `rmSync(recursive)`: `''` → xóa cả `dataDir` (gồm DB), `'..'` → `~/.phantoma`, `'../..'` → cha nữa ✔.                                                                                                                                            | `project.service.ts:85-87,106,137,144-148`                                                                                                                                                                               |
| S03 | C   | `saveAll` xóa mọi project vắng trong payload; `removeProjectDir` (xóa file thật) chạy **bên trong transaction** (rollback không khôi phục file); `syncWorktrees` xóa worktree vắng → cascade session/panel/scope; không backup, không log.                                                                  | `project.service.ts:80-83,132-151`                                                                                                                                                                                       |
| S04 | C   | `CODE_TOKEN` rỗng → bỏ qua xác thực; CORS mặc định `'*'`; không kiểm tra `Host`/`Origin` → trang web bất kỳ gọi được `127.0.0.1:3055`; `CODE_HOST=0.0.0.0` không token = mở hoàn toàn. `trusted=true` bỏ cả `withinProject` lẫn `allowSensitive`.                                                           | `auth.ts:13`, `index.ts:18-26`, `server.config.ts:28-33`, `fs.route.ts:75-76,86-87`                                                                                                                                      |
| S05 | C   | `isWithin` chỉ so chuỗi (symlink trong worktree trỏ ra `~/.ssh` lọt qua); `PROTECTED_DIRS` thiếu `/bin /lib /var /root`, `~/.ssh`, Windows; pattern nhạy cảm phân biệt hoa/thường và chặn nhầm `.env.example`.                                                                                              | `guard.ts:18-36,52-76`                                                                                                                                                                                                   |
| S06 | C   | Migration rải rác trong `init()`, không `user_version`, không backup; migration sessions **xóa session cũ**; `sweepOrphans` xóa dữ liệu mồ côi **im lặng** (kết quả `OrphanReport` bị bỏ qua).                                                                                                              | `connection.ts:131-189` (đặc biệt `163-179`, `186-187`), `integrity.ts:33-83,89-91`                                                                                                                                      |
| S07 | T   | `git status --porcelain` (không `-z`) quote tên file khác ASCII (`"m\341\273\233i.txt"`) và rename thành `R old -> new` ✔ → map trạng thái sai cho tên file tiếng Việt/khoảng trắng/rename. Lặp ở numstat, ls-files, check-ignore, name-status.                                                             | `git-status.service.ts:11-18,45-51`, `git-explorer.service.ts:6-16`, `git-diff.service.ts:68-107,164-173`, `git-remote.service.ts:62-70`, `git-history.service.ts:69-100`, `git-write.service.ts:74-79`                  |
| S08 | T   | `/git/remote-diff` trả `{ files: Set }` → `JSON.stringify` ra `{}` ✔.                                                                                                                                                                                                                                       | `git.route.ts:83-86`, `git-status.service.ts:121-129`                                                                                                                                                                    |
| S09 | T   | Search cắt ở 10.000 kết quả → `rg.kill()` → `close` với `code=null` ✔ → báo lỗi "exited with code null"; `fileMap.clear()` làm file đếm đôi qua chunk; ghi SSE sau khi client đóng; không `--max-columns`.                                                                                                  | `search.service.ts:65,94-97,105-109,116-127`, `sse.ts:14-17`                                                                                                                                                             |
| S10 | T   | Task: `syncTags` luôn `INSERT` (id đã có → vi phạm PK → 500); `syncChecklist` không lưu `sort_order` cho item cũ + N+1; dependency nuốt mọi lỗi (`catch {}`), không chống vòng/tự phụ thuộc/khác project; `status`/`priority`/`kind` không validate; `get/update/remove` không kiểm task thuộc project.     | `task.service.ts:62-72,74-89,104-109,123-186`, `task-dependency.repository.ts:14-16`                                                                                                                                     |
| S11 | T   | Mã lỗi sai: `throw new Error` → 500 (`scope.service.ts:36-38,66-68`, `workflow.service.ts:15,25-30`, `git-runner.ts:25-28`, `fs-write.service.ts:18-24`); JSON hỏng/body quá lớn → 500 (`envelope.ts:26-38`); `found()` → 404 cho body thiếu field; workflow 404 sai envelope.                              | `project.route.ts:16`, `scope.route.ts:16`, `task.route.ts:43,50`                                                                                                                                                        |
| S12 | T   | `worktrees.branch` là cache không đồng bộ sau `git checkout`; `purgeIfDefaultBranch` so với giá trị cũ → có thể xóa scope nhầm; **`GET` scopes xóa dữ liệu**; biến `removed` không dùng.                                                                                                                    | `scope.service.ts:16-24,27-31`, `git-write.service.ts:9-19`                                                                                                                                                              |
| S13 | T   | `sessionService.create` thay session (id mới) → `tasks.session_id` (không có `REFERENCES`) trỏ vào session đã mất; `sweepOrphans` không dọn vì không khai FK.                                                                                                                                               | `session.service.ts:51-59`, `connection.ts:77`                                                                                                                                                                           |
| S14 | T   | Process không timeout, không `GIT_TERMINAL_PROMPT=0`, không `GIT_OPTIONAL_LOCKS=0` (polling `git status` tranh `index.lock`); fan-out theo số nhánh.                                                                                                                                                        | `process-runner.ts:20-24`, `git-runner.ts:9-10`, `git-status.service.ts:100-105`, `git-diff.service.ts:184-193`, `git-repo.service.ts:95-105`                                                                            |
| S15 | T   | Vòng đời server: không `server.on('error')`, không log địa chỉ, `process.exit(0)` ngay (không chờ request, không kill `rg`/`gh`), thiếu `unhandledRejection`, `/health` không kiểm DB.                                                                                                                      | `index.ts:28-30,37-48`                                                                                                                                                                                                   |
| S16 | T   | FS: `readFile` không giới hạn dung lượng; `tree` sâu 20 không exclude/trần số node; `grep` dùng `new RegExp` đồng bộ (ReDoS); `writeFile` không atomic, không kiểm `mtime`, `content` không phải string → 500; `rename` không xử lý `EXDEV`; `nameMatcher` chỉ escape `.`.                                  | `fs-query.service.ts:66,83-91,134-143,160-167,216`, `fs-write.service.ts:47-52,60-64`                                                                                                                                    |
| S17 | T   | Tải logo: SSRF (URL nội bộ, theo redirect), không timeout, đọc cả body rồi mới kiểm 5 MB.                                                                                                                                                                                                                   | `image.service.ts:268-289`                                                                                                                                                                                               |
| S18 | Th  | Hiệu năng danh sách: `attachSessions` tải toàn bộ session/panel của DB; `listAll` gọi 2 lần; `rootProvider` quét cả bảng `worktrees` mỗi request.                                                                                                                                                           | `project.service.ts:28-38,90-101`, `workspace-panel.repository.ts:21-24`, `index.ts:33`                                                                                                                                  |
| S19 | Th  | Thiếu: `DELETE` workflow (repo đã có `remove`), ghi đè nội dung workflow; scope path không chuẩn hóa/validate; index `task_dependencies(depends_on_id)`; vài field hữu ích.                                                                                                                                 | `workflow.repository.ts:33-34`, `scope.service.ts:42-61`, `connection.ts:89-93,121-126`                                                                                                                                  |
| S20 | Th  | Vệ sinh: `NODE_ENV` (envelope) vs `ENV` (config); `express.json 50mb` toàn cục; không handler 404 JSON; shim `utils/*`, `services/git-runner.ts`; giả định POSIX `startsWith('/')`.                                                                                                                         | `envelope.ts:36`, `server.config.ts:34`, `index.ts:26`, `git-remote.service.ts:55-58`, `git-explorer.service.ts` (nhiều chỗ `${base}/`)                                                                                  |
| S21 | Th  | `commitPushFiles` dùng `git add -f` không kiểm file nhạy cảm → có thể commit/push `.env`.                                                                                                                                                                                                                   | `git-remote.service.ts:62-80`                                                                                                                                                                                            |

## 2. Kiến trúc đích

### 2.1 File mới / đổi chức năng (phần còn lại giữ nguyên)

```
index.ts                         # chỉ bootstrap; thêm lifecycle (2.4)
config/server.config.ts          # + biến môi trường mới (2.5)
database/
  migrations/index.ts   [new]    # danh sách migration có phiên bản + chạy trong transaction
  migrations/0001-legacy.ts [new]# chuyển các bước ad-hoc ở connection.ts:136-184 (idempotent)
  migrations/0002-indexes.ts [new]
  backup.ts             [new]    # db.backup() → dataDir/backups, giữ N bản, throttle
http/
  host-guard.ts         [new]    # kiểm Host + Origin (chống DNS rebinding / drive-by)
infra/
  event-bus.ts          [new]    # EventEmitter có kiểu cho sự kiện nội bộ
  limiter.ts            [new]    # giới hạn song song (mutex/semaphore nhỏ)
  ttl-cache.ts          [new]    # cache TTL + gộp request đang chạy (in-flight)
  git-parse.ts          [new]    # parse NUL-delimited: status -z, numstat -z, name-status -z
  safe-fetch.ts         [new]    # fetch có chặn IP nội bộ, redirect, timeout, trần dung lượng
routes/
  events.route.ts       [new]    # GET /events (SSE)
  system.route.ts       [new]    # GET /system/doctor
services/
  worktree-sync.service.ts [new] # reconcile worktree ↔ ổ đĩa, refresh branch, prune
  system.service.ts     [new]
  git/git-worktree.service.ts [new, Phase 9, có điều kiện]
```

### 2.2 Thuật toán đồng bộ worktree (S01, quyết định #1)

```
reconcileWorktree(w):
  st = fs.stat(w.path)
  nếu ok && st.isDirectory()        → giữ (có thể refresh branch)
  nếu lỗi.code ∈ {ENOENT, ENOTDIR}  → XÓA NGAY
  ngược lại (EACCES, EIO, ENOTCONN…) → bỏ qua + console.warn (không xóa)

XÓA:
  backup.snapshot('worktree-removed')            # throttle ≤ 1 lần / 60 s
  transaction {
    sid = session của worktree (nếu có)
    tasks.session_id = NULL where session_id = sid
    worktreeRepository.remove(id)                # cascade: scopes, sessions, workspace_panels
  }
  console.warn('[worktree-sync] removed …')      # id, projectId, path, lý do
  eventBus.emit('worktree:removed', {…})
  sau vòng lặp: với mỗi project bị ảnh hưởng, chạy `git worktree prune`
                tại worktree anh em còn tồn tại đầu tiên (nếu có)
```

Không xóa project khi mất hết worktree. Thời điểm chạy: khởi động, timer (mặc định 60 s, `unref`), khi `GET /projects[/:id]`, sau `fs/{remove-dir,delete-file,rename}`, và khi `safePath(withinProject)` phát hiện root không còn.

### 2.3 Quy tắc phụ thuộc (giữ như kế hoạch Restructure)

`routes → http, services, domain` · `services → infra, repositories, domain, http (AppError/guard)` · `repositories → database, domain` · `infra` không import `services/routes`. `errorHandler` nhận lỗi có `statusCode`/`status` (duck-typing) nên `infra` không cần import `AppError`.

### 2.4 Vòng đời server (Task 2.4)

Thứ tự khởi động: `initDb` (migrate + backup nếu có migration chờ) → `registerRootProvider` → `listen` → `reconcileAll()` + `purgeAllDefaultBranches()` → bật timer. Tắt: ngừng nhận kết nối → chờ tối đa 5 s → `killAllChildren()` (registry trong `process-runner`) → `closeDb()`.

### 2.5 Biến môi trường mới

| Biến                             | Mặc định           | Ý nghĩa                                                         |
| -------------------------------- | ------------------ | --------------------------------------------------------------- |
| `CODE_ALLOWED_HOSTS`             | (rỗng)             | Host hợp lệ thêm vào ngoài loopback (cho chế độ remote)         |
| `CODE_WORKTREE_SYNC_INTERVAL_MS` | `60000`            | Chu kỳ reconcile; `0` = tắt timer (vẫn chạy lúc khởi động/lazy) |
| `CODE_BACKUP_KEEP`               | `10`               | Số bản backup giữ lại                                           |
| `CODE_BACKUP_INTERVAL_MS`        | `86400000`         | Backup định kỳ; `0` = tắt                                       |
| `CODE_GIT_TIMEOUT_MS`            | `60000`            | Timeout lệnh git cục bộ                                         |
| `CODE_GIT_NETWORK_TIMEOUT_MS`    | `300000`           | Timeout `fetch/push/clone` và `gh`                              |
| `CODE_MAX_READ_BYTES`            | `20971520` (20 MB) | Trần `fs/read-file`                                             |
| `CODE_ALLOW_PRIVATE_LOGO_URLS`   | (tắt)              | `1` = cho phép tải logo từ IP nội bộ                            |

### 2.6 Hợp đồng API thay đổi (client sửa theo server — quyết định #4)

Mọi mục không có trong bảng = giữ nguyên. Cột "Loại": **A** = chỉ thêm (không phá), **B** = sửa lỗi, client có thể cần theo.

| Mã  | Endpoint                               | Thay đổi                                                                                                                                                                                                                               | Loại | Phase |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----- |
| C1  | `GET /events` (mới)                    | SSE: `ready`, `worktree:removed {projectId, worktreeId, path, sessionId\|null, reason}`, `worktree:branch-changed {projectId, worktreeId, branch}`; heartbeat `: ping` mỗi 25 s. Nằm sau `requireToken`.                               | A    | 4     |
| C2  | `GET /projects`, `GET /projects/:id`   | Không trả worktree đã bị xóa trên đĩa (đã được reconcile trước khi trả).                                                                                                                                                               | B    | 4     |
| C3  | `GET /git/remote-diff`                 | `{files: string[]}` (trước: `{files:{}}`).                                                                                                                                                                                             | B    | 1     |
| C4  | `GET /git/status`                      | `files` khóa đúng với tên file đặc biệt/rename; `output` là dạng `XY path` không quote (rename: `R  old -> new`).                                                                                                                      | B    | 7     |
| C5  | `POST /fs/write-file`                  | Thêm `expectedMtime?` (409 nếu lệch), response thêm `mtime`; root worktree không còn → **404** (trước: tạo lại thư mục); `content` không phải string → 400.                                                                            | A+B  | 4, 8  |
| C6  | Lỗi chung                              | JSON hỏng → 400; body quá lớn → 413; `safeRef` → 400; workflow đã tồn tại → 409; `scope/workflow` lỗi nghiệp vụ → 4xx; `GET /tasks/:id/workflow` không có → `{success:false,error}` 404; thiếu field body → 400 (trước: 404/500).      | B    | 1     |
| C7  | `DELETE /tasks/:taskId/workflow` (mới) | Xóa workflow và gỡ `tasks.workflow_id`. `PUT /tasks/:taskId/workflow` chấp nhận thêm `{content}` (ghi đè toàn bộ).                                                                                                                     | A    | 6     |
| C8  | `PUT /projects/:id/tasks/:taskId`      | `tags`/`checklist` chấp nhận id lạ hoặc trùng: server cấp id mới và **trả id chuẩn trong response**; `dependsOn` sai → 400 (id không tồn tại, tự phụ thuộc, vòng, khác project); `status/priority` ngoài tập → 400; sai project → 404. | B    | 6     |
| C9  | `PUT /worktrees/:id/scopes`            | `paths` chuẩn hóa (bỏ `/` cuối, `./`), trùng bị gộp; đường dẫn tuyệt đối hoặc chứa `..` → 400. `GET` không còn xóa dữ liệu nhưng vẫn trả `[]` cho default branch.                                                                      | B    | 4, 6  |
| C10 | `POST /fs/grep`                        | Regex chạy bằng ripgrep (cú pháp Rust: không lookahead/backreference); regex sai → 400.                                                                                                                                                | B    | 8     |
| C11 | CORS / `Host` / `Origin`               | Request mang `Origin` http(s) không phải loopback (khi chưa cấu hình allowlist) bị 403; `Host` lạ bị 403; bind ngoài loopback bắt buộc `CODE_TOKEN`.                                                                                   | B    | 5     |
| C12 | `/health`, `GET /system/doctor` (mới)  | `/health` thêm `db`, `uptime`; `doctor` trả phiên bản git/gh/rg, `dataDir` ghi được, `quick_check`.                                                                                                                                    | A    | 2, 9  |
| C13 | `POST /git/commit-push-files`          | Từ chối file nhạy cảm bằng `{error}` (HTTP 200) trừ khi `allowSensitive:true`.                                                                                                                                                         | B    | 5     |
| C14 | `PUT /projects` (có điều kiện)         | Danh sách rỗng khi DB còn project cần `confirmDeleteAll:true`. **Chỉ làm khi chủ dự án xác nhận** (Task 3.5).                                                                                                                          | B    | 3     |

## 3. Bảng ánh xạ file (mới / sửa)

| Hành động | File                                                                                                                        | Task                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| create    | `infra/{event-bus,limiter,ttl-cache,git-parse,safe-fetch}.ts`                                                               | 4.1, 2.3, 7.7, 7.1, 8.6  |
| create    | `database/{backup.ts, migrations/index.ts, migrations/0001-legacy.ts, migrations/0002-indexes.ts}`                          | 3.1, 3.2                 |
| create    | `http/host-guard.ts`, `routes/{events,system}.route.ts`, `services/{worktree-sync,system}.service.ts`                       | 5.2, 4.1, 9.1, 4.2       |
| edit      | `index.ts`                                                                                                                  | 2.4, 4.3, 5.1, 5.2, 10.2 |
| edit      | `config/server.config.ts`                                                                                                   | 2.1, 3.2, 5.1, 8.1       |
| edit      | `database/{connection,integrity}.ts`                                                                                        | 3.1–3.3, 4.8             |
| edit      | `http/{guard,envelope,sse,params}.ts`                                                                                       | 1.1, 1.3, 1.4, 4.4, 5.4  |
| edit      | `infra/{process-runner,git-runner,gh-runner}.ts`                                                                            | 1.4, 2.1, 2.2, 2.4       |
| edit      | `services/{project,worktree,session,scope,task,workflow,group}.service.ts`                                                  | Phase 1, 3, 4, 6         |
| edit      | `repositories/{task,task-tag,task-checklist,task-dependency,task-attachment,scope,worktree,workspace-panel}.repository.ts`  | Phase 4, 6               |
| edit      | `services/git/*`, `routes/git.route.ts`                                                                                     | Phase 1, 2, 5, 7         |
| edit      | `services/fs/*`, `routes/fs.route.ts`, `services/search/search.service.ts`, `services/pull-request/pull-request.service.ts` | Phase 1, 2, 4, 8         |
| delete    | `utils/guard.ts`, `utils/http.ts`, `services/git-runner.ts` (shim)                                                          | 10.3 (sau khi grep rỗng) |

## 4. Kế hoạch theo phase

**Quy ước chung cho mọi task** (không lặp lại ở từng task):

- **Lệnh kiểm tra chuẩn:** `L1` = `cd code && npx tsc --noEmit` (sạch). Thêm `curl` nêu ở tiêu chí khi task đổi hành vi HTTP.
- **Hoàn tác:** mỗi task = 1 commit; hoàn tác bằng `git revert <commit>`. Rủi ro đặc thù ghi riêng.
- **Giữ nguyên hợp đồng** trừ khi task ghi rõ mã C# ở mục 2.6; khi đổi hợp đồng, ghi "Ảnh hưởng UI" để client theo.
- **Bước 0 cho task sửa file có nhiều chỗ:** đọc lại đúng vùng dòng đã nêu; nếu mã đã khác bản quét, dừng và báo.
- Ràng buộc ≤ 5 file ghi tính cả file tạo mới và file sửa import.
- Không thêm thư viện; không tạo test.

### Phase 1: Sửa gấp (nhỏ, an toàn)

- **Mục tiêu:** bịt lỗ mất dữ liệu và sửa bug đã xác nhận. **Vấn đề:** S02, S08, S09, S11. **Phụ thuộc:** không.

#### Task 1.1 — Chặn path traversal qua `id` (S02)

- File: `http/guard.ts`, `services/project.service.ts`, `services/session.service.ts`, `services/group.service.ts`.
- Hành động: thêm `requireSafeId(value, field)` (chuỗi, `^[A-Za-z0-9_-]{1,128}$`, lỗi 400). `project.service.ts`: áp dụng cho `input.id` ở `create` (L106) và `item.id` ở `saveAll` (L137); `removeProjectDir` (L85-87) phải kiểm `path.resolve(dataDir, id)` nằm **bên trong** `dataDir` (`path.relative` không bắt đầu `..`, khác `''`), sai thì bỏ qua + `console.warn`, **không** ném lỗi (tránh làm hỏng transaction). `session`/`group`: áp dụng cho `input.id`.
- Tiêu chí: `L1`; `curl -X POST .../projects -d '{"id":"","name":"x"}'` → 400; `{"id":"..","name":"x"}` → 400; id UUID vẫn tạo được; thư mục `dataDir` còn nguyên sau khi thử.
- Rủi ro: client dùng id có ký tự khác (vd. `task_…` chứa `_` — đã cho phép; nếu id có `.` hoặc `:`) → nới regex sau khi xác nhận (mục 7). Dữ liệu cũ có id lạ: `removeProjectDir` bỏ qua an toàn.
- Ảnh hưởng UI: không.

#### Task 1.2 — Sửa `/git/remote-diff` trả `{}` (S08, C3)

- File: `routes/git.route.ts`.
- Hành động: route chuyển `Set` thành mảng: `const { files } = await gitService.remoteDiff(...); return { files: [...files] };`. Không đổi `gitService.remoteDiff` (còn được `git-explorer.service.ts:158` dùng).
- Tiêu chí: `L1`; `curl '.../git/remote-diff?root=…&remoteHash=origin/main'` trả `{"files":["/abs/path",…]}`.
- Ảnh hưởng UI: nơi đọc `res.files` (FileExplorer) vốn nhận `{}` → nay nhận mảng; kiểm kiểu ở client.

#### Task 1.3 — Search: cắt kết quả, đếm file, SSE đóng (S09)

- File: `services/search/search.service.ts`, `http/sse.ts`.
- Hành động: (a) khi đạt `MAX_RESULTS` đặt `truncated = true` và dừng xử lý các dòng tiếp (`return` khỏi handler, bỏ qua `data` về sau); ở `close`, nếu `truncated` thì coi `code === null` là hợp lệ (không báo lỗi); (b) `totalFiles` đếm bằng `Set<string>` các file đã thấy (không dùng `fileMap.size`); (c) thêm `--max-columns 500`, `--max-columns-preview`; (d) `sse.send/close` kiểm `res.writableEnded`/`res.destroyed` trước khi ghi.
- Tiêu chí: `L1`; tìm chuỗi có >10.000 kết quả trả `done` với `truncated:true`, không có `error`; một file có kết quả ở 2 chunk chỉ tính 1 file.
- Rủi ro: thấp.

#### Task 1.4 — `errorHandler` nhận lỗi 4xx của thư viện + `safeRef` (S11, C6)

- File: `http/envelope.ts`, `infra/git-runner.ts`.
- Hành động: `errorHandler` (L26-38) lấy `status = err.statusCode ?? err.status` nếu là số nguyên 400–499 thì dùng làm HTTP status với thông điệp `err.message` (JSON hỏng → 400, quá lớn → 413); giữ nhánh `AppError`. `safeRef` (L25-28) ném lỗi có `statusCode = 400` (`Object.assign(new Error(...), { statusCode: 400 })`, `infra` không import `http`).
- Tiêu chí: `L1`; `curl -X POST .../projects -H 'Content-Type: application/json' -d '{bad'` → 400 `{success:false,error}`; `GET /git/commit-body?hash=-x` → 400.
- Ảnh hưởng UI: lỗi trước đây hiện "500" nay là 4xx (client kiểm `success`).

#### Task 1.5 — Lỗi nghiệp vụ thành `AppError` + body thiếu field → 400 (S11, C6)

- File: `services/scope.service.ts`, `services/workflow.service.ts`, `routes/task.route.ts`, `routes/project.route.ts`, `routes/scope.route.ts`.
- Hành động: `scope.service.ts:36-38,66-68` → `AppError('scope not found', 404)`; `workflow.service.ts:15` → 409, `:25-30` → 400 (`old_content` rỗng) và 409 (không tìm thấy / khớp nhiều chỗ); `task.route.ts:43` → dùng `fail(res, 404, 'Workflow not found')`; `found(req.body?.x, 'x')` ở `project.route.ts:16`, `scope.route.ts:16`, `task.route.ts:50,57-58` → helper mới `requireBody` (400, `x is required`) đặt trong `http/guard.ts` (thêm vào task 1.1 nếu muốn gom; ở task này chỉ import).
- Tiêu chí: `L1`; `POST /tasks/:id/workflow` lần 2 → 409; `PUT /worktrees/:id/scopes` thiếu `paths` → 400.
- Rủi ro: client đang nhận `404` cho "thiếu field" sẽ nhận `400` — chấp nhận (mục 0 #5: có ảnh hưởng nhưng là sửa lỗi, ghi ở C6).

#### Task 1.6 — Ánh xạ errno của FS (S11)

- File: `services/fs/fs-write.service.ts`.
- Hành động: `run()` (L18-24) ném `AppError` với status theo `err.code`: `ENOENT`→404, `EACCES|EPERM`→403, `EEXIST|ENOTEMPTY`→409, `ENOTDIR|EISDIR`→400, còn lại 500; giữ thông điệp `Failed to <label>: …`.
- Tiêu chí: `L1`; `DELETE /fs/delete-file?path=<không tồn tại>` → 404.

### Phase 2: Hạ tầng tiến trình & vòng đời server

- **Mục tiêu:** không treo, không tranh khóa, tắt sạch. **Vấn đề:** S14, S15, S01 (thông báo sai). **Phụ thuộc:** Phase 1.

#### Task 2.1 — Timeout + env an toàn cho git/gh (S14)

- File: `infra/process-runner.ts`, `infra/git-runner.ts`, `infra/gh-runner.ts`, `config/server.config.ts`, `services/git/git-remote.service.ts`.
- Hành động: `runProcess` nhận `timeoutMs` (truyền cho `execFile`, khi quá hạn trả `error.killed`); `runGit(args, cwd, opts?: { timeoutMs?; env? })` mặc định `CODE_GIT_TIMEOUT_MS`; env luôn thêm `GIT_TERMINAL_PROMPT=0` và `GIT_OPTIONAL_LOCKS=0`; `runGh` dùng `CODE_GIT_NETWORK_TIMEOUT_MS`. `git-remote.service.ts`: `fetch`, `push`, `commitPushFiles` (push) truyền timeout mạng. Thông điệp khi timeout: `"<bin> timed out after Ns"`.
- Tiêu chí: `L1`; `GIT_OPTIONAL_LOCKS` không làm hỏng `git status`; đặt `CODE_GIT_TIMEOUT_MS=1` thì lệnh trả lỗi timeout (không treo).
- Rủi ro: `fetch` repo rất lớn vượt 5 phút → tăng biến môi trường.

#### Task 2.2 — Phân biệt "thiếu git" và "thiếu thư mục" (S01)

- File: `infra/process-runner.ts`, `services/git/git-status.service.ts`.
- Hành động: khi `execFile` lỗi `ENOENT` và có `cwd`, kiểm `fs.access(cwd)`: nếu thiếu thì gán `error.code = 'ECWD'`, `message = "Working directory not found: <cwd>"`. `git-status.service.ts:54-56` chỉ báo "Git is not installed" khi `code === 'ENOENT'` thật.
- Tiêu chí: `L1`; `GET /git/status?gitRoot=<thư mục không tồn tại>` → thông báo đúng, không còn "Git is not installed".

#### Task 2.3 — Bộ giới hạn song song (S14)

- File: `infra/limiter.ts` (create), `services/git/git-status.service.ts`, `services/git/git-diff.service.ts`, `services/git/git-repo.service.ts`.
- Hành động: `createLimiter(n)` trả `run(fn)`; áp dụng (n = 6) cho `Promise.all` theo nhánh ở `changedInOtherBranches` (L100-105) và `localChanges` (L184-193); `repoInfo` (L95-105) chạy `rev-list` qua limiter thay vì tuần tự. Giữ nguyên thứ tự kết quả.
- Tiêu chí: `L1`; repo ≥ 200 nhánh không sinh > 6 process git đồng thời (quan sát `ps`).

#### Task 2.4 — Khởi động / tắt / health (S15, C12)

- File: `index.ts`, `infra/process-runner.ts`, `services/search/search.service.ts`, `services/pull-request/pull-request.service.ts`.
- Hành động: `process-runner` giữ tập tiến trình con + `killAllChildren()`; `index.ts`: `server.on('error')` (in lỗi rõ cho `EADDRINUSE`, thoát 1), log `listening on host:port`, `shutdown` = `server.close` → chờ ≤ 5 s (`closeIdleConnections`) → `killAllChildren()` + `searchService.cancelAll()` + `prService.cancelLoginWeb()` → `closeDb()` → `exit(0)`; `process.on('unhandledRejection'|'uncaughtException')` ghi log (không thoát với rejection); `/health` thêm `db: boolean` (`SELECT 1`), `uptime`.
- Tiêu chí: `L1`; chiếm cổng 3055 rồi chạy server → thông báo rõ; `kill -TERM` khi đang search không để lại tiến trình `rg`.

### Phase 3: An toàn dữ liệu DB

- **Mục tiêu:** mọi thao tác xóa hàng loạt đều có bản sao lưu và log. **Vấn đề:** S06, S03. **Phụ thuộc:** Phase 1. **Phải xong trước Phase 4.**

#### Task 3.1 — Migration có phiên bản (S06)

- File: `database/migrations/index.ts`, `database/migrations/0001-legacy.ts`, `database/connection.ts`.
- Hành động: `PRAGMA user_version` làm phiên bản; `0001-legacy` chứa nguyên các bước ở `connection.ts:136-184` (idempotent như hiện tại để DB cũ vẫn chạy được); `runMigrations(db)` chạy từng bước **trong transaction**, cập nhật `user_version` sau mỗi bước; `init()` gọi `runMigrations` thay đoạn ad-hoc, rồi `SCHEMA_SQL`.
- Tiêu chí: `L1`; mở DB cũ (có `repo_url`, `sort_order` ở sessions) → migrate đúng, `user_version = 1`; mở lại → không chạy lại.
- Rủi ro: thứ tự (migration chạy **trước** `SCHEMA_SQL`, như hiện tại) — giữ nguyên.

#### Task 3.2 — Backup (S06)

- File: `database/backup.ts`, `database/connection.ts`, `index.ts`, `config/server.config.ts`.
- Hành động: `snapshot(reason)` dùng `db.backup()` của better-sqlite3 ghi `dataDir/backups/code-<ISO>-<reason>.sql`, giữ `CODE_BACKUP_KEEP` bản (xóa cũ nhất), throttle ≤ 1 lần / 60 s cho cùng `reason`; tự động trước khi chạy migration có bước chờ; timer theo `CODE_BACKUP_INTERVAL_MS` (`unref`). Lỗi backup chỉ `console.warn`, không chặn thao tác.
- Tiêu chí: `L1`; sau khi chạy có file trong `backups/`; vượt `KEEP` thì tự xóa bản cũ.

#### Task 3.3 — Log dọn mồ côi + kiểm tra toàn vẹn (S06)

- File: `database/integrity.ts`, `database/connection.ts`.
- Hành động: `sweepOrphans` (và timer ở L89-91) `console.warn` từng `OrphanReport` khi `count > 0`; trước khi xóa lần đầu trong một lượt, gọi `backup.snapshot('orphan-sweep')`; `init()` chạy `PRAGMA quick_check`, nếu khác `ok` → `snapshot('corrupt')` + `console.error`; thêm `PRAGMA busy_timeout = 5000` (không đổi `journal_mode`).
- Tiêu chí: `L1`; tạo mồ côi thủ công → thấy log + backup.

#### Task 3.4 — `saveAll`/`syncWorktrees` an toàn hơn (S03)

- File: `services/project.service.ts`.
- Hành động: (a) trước khi xóa project/worktree vắng trong payload → `backup.snapshot('save-all')` + `console.warn` liệt kê id/tên bị xóa; (b) gom danh sách `removedProjectIds`, **chỉ gọi `removeProjectDir` sau khi transaction commit** (L144-148 hiện gọi trong transaction); (c) `remove()` (L153-158) ghi log tương tự.
- Tiêu chí: `L1`; xóa project qua `PUT /projects` → có backup + log; ép lỗi giữa transaction → thư mục project **không** bị xóa.
- Rủi ro: thấp (không đổi hợp đồng).

#### Task 3.5 — (có điều kiện) `confirmDeleteAll` (S03, C14)

- Điều kiện: chủ dự án xác nhận (mục 7). File: `routes/project.route.ts`, `services/project.service.ts`.
- Hành động: nếu `projects` rỗng mà DB còn ≥ 1 project và thiếu `confirmDeleteAll === true` → 409 `"Refusing to delete all projects"`.
- Ảnh hưởng UI: lúc xóa project cuối cùng, client phải gửi `confirmDeleteAll:true` (hoặc dùng `DELETE /projects/:id`).

### Phase 4: Đồng bộ worktree ↔ ổ đĩa & sự kiện (case chính)

- **Mục tiêu:** xóa thư mục ngoài app → server tự xóa hàng tương ứng ngay, báo cho client. **Vấn đề:** S01, S12, S13. **Phụ thuộc:** Phase 2 (2.2), Phase 3.

#### Task 4.1 — Event bus + `GET /events`

- File: `infra/event-bus.ts`, `http/sse.ts`, `routes/events.route.ts`, `routes/routes.ts`.
- Hành động: `eventBus` có kiểu cho `worktree:removed`, `worktree:branch-changed`; `openSse` thêm `heartbeat(ms)` (ghi `: ping\n\n`, dọn timer khi đóng); `GET /events` gửi `ready` rồi chuyển tiếp sự kiện; dọn listener khi `req.on('close')`. Đăng ký trong `routes.ts` (nằm sau `requireToken` sẵn có).
- Tiêu chí: `L1`; `curl -N .../api/v1/events` giữ kết nối, thấy `ready` và `: ping` mỗi 25 s.

#### Task 4.2 — `worktree-sync.service.ts`

- File: `services/worktree-sync.service.ts`, `repositories/worktree.repository.ts`, `repositories/task.repository.ts`.
- Hành động: cài thuật toán mục 2.2: `reconcileAll()`, `reconcileProject(id)`, `reconcilePath(absPath)` (xử lý mọi worktree có `path` bằng hoặc nằm dưới/trên `absPath`), cờ `running` để không chạy chồng; `worktreeRepository` thêm `listByPathPrefix`; `taskRepository` thêm `clearSession(sessionId)` (`UPDATE tasks SET session_id = NULL WHERE session_id = ?`). Sau xóa: `git worktree prune` qua `runGit` tại worktree anh em còn tồn tại. Phát `worktree:removed`.
- Tiêu chí: `L1`; (1) tạo project + worktree, xóa thư mục bằng `rm -rf`, gọi `reconcileAll()` → hàng biến mất, `sessions/workspace_panels/scopes` tương ứng mất, log + backup; (2) đổi quyền thư mục thành `000` → **không** xóa (EACCES).
- Rủi ro: **mất dữ liệu có chủ đích** (quyết định #1). Giảm thiểu: backup (3.2) + log. Ổ mount trễ lúc khởi động có thể bị xóa nhầm — ghi ở mục 7.

#### Task 4.3 — Điểm kích hoạt

- File: `index.ts`, `services/project.service.ts`, `routes/fs.route.ts`, `config/server.config.ts`.
- Hành động: (a) sau `listen`: `reconcileAll()` rồi `purgeAllDefaultBranches()`; (b) timer `CODE_WORKTREE_SYNC_INTERVAL_MS` (`unref`, dừng khi shutdown); (c) `projectService.list/get`: gọi `reconcileProject` trước khi đọc (chỉ `fs.stat`, rẻ); (d) `fs.route.ts`: sau `remove-dir`, `delete-file`, `rename` thành công → `reconcilePath(oldPath/path)`.
- Tiêu chí: `L1`; xóa thư mục bằng `DELETE /fs/remove-dir` → `GET /projects` không còn worktree đó và client nhận sự kiện `worktree:removed`.
- Ảnh hưởng UI: C1, C2 — client nên lắng nghe `/events` để cập nhật store ngay.

#### Task 4.4 — Không hồi sinh thư mục đã mất (S01, C5)

- File: `http/guard.ts`.
- Hành động: trong `safePath` với `withinProject`, sau khi tìm root chứa `resolved`: nếu `root` không còn trên đĩa (`fs.existsSync` thất bại) → gọi `reconcilePath(root)` (không đồng bộ, không chờ) và ném `AppError('worktree directory not found', 404)`. `fs/mkdir`, `list-dir` (không dùng `withinProject`) không đổi.
- Tiêu chí: `L1`; sau khi xóa thư mục root, `POST /fs/write-file` vào trong đó → 404, thư mục **không** được tạo lại.
- Rủi ro: tạo project mới (root chưa tồn tại) rồi ghi file ngay → 404; luồng tạo project phải `mkdir` trước (hiện đã dùng `fs/mkdir`).

#### Task 4.5 — Đồng bộ `worktrees.branch` (S12)

- File: `services/worktree-sync.service.ts`, `services/scope.service.ts`, `routes/git.route.ts`.
- Hành động: `refreshBranch(worktreeId|path)` chạy `detectBranch` và cập nhật DB khi khác, phát `worktree:branch-changed`; `reconcileAll` gọi nó cho mỗi worktree còn tồn tại (qua limiter); `POST /git/checkout` gọi `refreshBranch(root)` sau khi thành công; `purgeIfDefaultBranch` (scope.service.ts:16-24) gọi `refreshBranch` trước khi so sánh.
- Tiêu chí: `L1`; `git checkout` trong terminal rồi chờ ≤ 1 chu kỳ (hoặc gọi list) → `branch` đúng.

#### Task 4.6 — `GET scopes` không còn xóa dữ liệu (S12, C9)

- File: `services/scope.service.ts`.
- Hành động: `list` (L27-31) trả `[]` nếu là default branch nhưng **không** gọi `removeByWorktree`; việc xóa chỉ diễn ra ở `set`, `purgeAllDefaultBranches` và reconcile; xóa biến `removed` thừa (L21).
- Tiêu chí: `L1`; `GET` scopes của default branch trả `[]` và số hàng `scopes` không đổi.

#### Task 4.7 — Đổi đường dẫn worktree kéo theo đường dẫn phụ thuộc

- File: `services/worktree.service.ts`, `repositories/workspace-panel.repository.ts`, `repositories/task-attachment.repository.ts`.
- Hành động: khi `update()` đổi `path` (L52-58): trong một transaction cập nhật `workspace_panels.cwd/file_path` và `task_attachments.path` bằng thay tiền tố (`rewritePrefix(oldRoot, newRoot)`, chỉ khớp ranh giới thư mục: bằng `oldRoot` hoặc bắt đầu `oldRoot + sep`).
- Tiêu chí: `L1`; đổi path worktree → `cwd`/`file_path` của panel được cập nhật; đường dẫn không liên quan giữ nguyên.

#### Task 4.8 — `tasks.session_id` không còn treo (S13)

- File: `services/session.service.ts`, `repositories/task.repository.ts`, `database/integrity.ts`.
- Hành động: `sessionService.create` (L51-59): trong cùng transaction, nếu có session cũ của worktree thì `UPDATE tasks SET session_id = <id mới> WHERE session_id = <id cũ>`; `remove` → `clearSession`; `integrity.ts` thêm `sweepSoftRefs(db)` (`UPDATE tasks SET session_id = NULL WHERE session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.id = tasks.session_id)`), gọi cùng lúc `sweepOrphans`, có log như 3.3.
- Tiêu chí: `L1`; tạo lại session cho worktree → task cũ trỏ session mới; xóa session → `session_id` về `NULL`.

### Phase 5: Bảo mật mặc định (sẵn sàng remote)

- **Mục tiêu:** local vẫn chạy như cũ, remote an toàn. **Vấn đề:** S04, S05, S21. **Phụ thuộc:** Phase 1.

#### Task 5.1 — Kiểm tra khi khởi động + CORS theo ngữ cảnh (S04)

- File: `config/server.config.ts`, `index.ts`.
- Hành động: nếu `host` không thuộc loopback (`127.0.0.1`, `::1`, `localhost`) mà `token` rỗng → `console.error` + `exit(1)`; nếu `host` ngoài loopback và `allowedOrigins` rỗng → từ chối khởi động (yêu cầu cấu hình rõ, hoặc `CODE_ALLOWED_ORIGINS=*` có chủ đích). Chế độ loopback không allowlist: **giữ hành vi cũ** nhưng `cors` chuyển thành hàm: cho phép request không có `Origin`, `Origin: null`, scheme không phải http(s) (`file://`, `app://`), và origin loopback; **chặn** http(s) không phải loopback (403 `origin not allowed`). In cảnh báo một lần khi chạy không token.
- Tiêu chí: `L1`; `CODE_HOST=0.0.0.0` không token → không khởi động; `curl -H 'Origin: https://evil.com' …` → 403; renderer dev (`http://localhost:5173`) và Electron production (xác nhận ở mục 7) vẫn gọi được.
- Rủi ro: Electron production dùng origin khác dự kiến → thêm vào `CODE_ALLOWED_ORIGINS`.

#### Task 5.2 — Kiểm tra `Host` (chống DNS rebinding) (S04)

- File: `http/host-guard.ts`, `index.ts`, `config/server.config.ts`.
- Hành động: middleware đặt trước routes (kể cả `/health`): `Host` (bỏ cổng) phải thuộc loopback hoặc `CODE_ALLOWED_HOSTS`; sai → 403.
- Tiêu chí: `L1`; `curl -H 'Host: evil.test' http://127.0.0.1:3055/health` → 403; gọi bình thường vẫn 200.

#### Task 5.3 — `trusted` gắn với token (S04)

- File: `routes/fs.route.ts`, `config/server.config.ts`.
- Hành động: `read-file` và `stat` (L75-76, L86-87): nếu `token` đã cấu hình thì `trusted` giữ hiệu lực như cũ; nếu **không** có token (chế độ local không xác thực) thì vẫn giữ (không phá), nhưng ghi `console.warn` một lần/giờ khi dùng `trusted`. Khi host ngoài loopback (đã bắt buộc token ở 5.1) `trusted` chỉ hợp lệ với token hợp lệ — đã được `requireToken` đảm bảo.
- Tiêu chí: `L1`; hành vi local không đổi; ghi log cảnh báo.
- Ghi chú: giảm phạm vi `trusted` (vd. chỉ cho đường dẫn nằm trong `$HOME`) là tùy chọn — hỏi chủ dự án (mục 7).

#### Task 5.4 — Guard đường dẫn: symlink, thư mục hệ thống, file nhạy cảm (S05)

- File: `http/guard.ts`.
- Hành động: (a) `resolveReal(p)`: `realpathSync` của tổ tiên tồn tại sâu nhất + phần còn lại; `withinProject` so sánh với `realpath` của root (root không tồn tại → dùng `path.resolve`); (b) `PROTECTED_DIRS` thêm `/bin /lib /lib64 /var /root /dev /opt`, `~/.ssh`, `~/.gnupg`, và trên Windows `C:\Windows`, `C:\Program Files`; (c) `SENSITIVE_PATTERNS` không phân biệt hoa/thường, loại trừ `.env.example|.env.sample|.env.template`; (d) export `isSensitivePath(p)` để dùng ở 5.5.
- Tiêu chí: `L1`; symlink trong worktree trỏ `~/.ssh/id_rsa` → `read-file` 403; `.env.example` đọc được; `.ENV` bị chặn.
- Rủi ro: chặn nhầm đường dẫn hợp lệ ngoài tưởng tượng (vd. project nằm dưới `/opt`) → `withinProject` vẫn cho phép đọc nhưng **ghi** vào `/opt` bị chặn; kiểm với chủ dự án (mục 7).

#### Task 5.5 — `commit-push-files` không đẩy bí mật (S21, C13)

- File: `services/git/git-remote.service.ts`, `routes/git.route.ts`.
- Hành động: `commitPushFiles` lọc `rels` qua `isSensitivePath`; còn file nhạy cảm và thiếu `allowSensitive` → `{ error: 'Sensitive files selected: …' }` (HTTP 200 theo quy ước hiện tại); route kiểm `files` là mảng chuỗi (không thì 400) và truyền `allowSensitive`.
- Tiêu chí: `L1`; chọn `.env` → bị từ chối; `allowSensitive:true` → qua.

### Phase 6: Task, scope và validation (server tự chịu trách nhiệm)

- **Mục tiêu:** payload sai/lạ từ client không làm hỏng hoặc gây 500. **Vấn đề:** S10, S19. **Phụ thuộc:** Phase 1.

#### Task 6.1 — `syncTags` (S10, C8)

- File: `services/task.service.ts`, `repositories/task-tag.repository.ts`.
- Hành động: nạp `existing = listByTask` một lần; với mỗi item: nếu `item.id` thuộc `existing` → `update(label,color)`; ngược lại → `insert` với id **mới** (không tái dùng id lạ, tránh đụng PK của task khác); xóa phần không còn. Repository thêm `update`.
- Tiêu chí: `L1`; `PUT` task hai lần liên tiếp với cùng `tags` (có `id`) → 200; response trả id chuẩn.

#### Task 6.2 — `syncChecklist` (S10, C8)

- File: `services/task.service.ts`, `repositories/task-checklist.repository.ts`.
- Hành động: nạp `existing` một lần (hết N+1 ở L74-89); cập nhật cả `sort_order = index` cho item cũ (repository `update` nhận `sortOrder`); id lạ/trùng → id mới như 6.1.
- Tiêu chí: `L1`; đổi thứ tự checklist rồi `GET` → đúng thứ tự.

#### Task 6.3 — Dependencies (S10, C8)

- File: `services/task.service.ts`, `repositories/task-dependency.repository.ts`, `repositories/task.repository.ts`.
- Hành động: `syncDependencies` (L104-109) dedupe; từ chối (400) id không tồn tại, trùng `taskId`, khác `project_id`, hoặc tạo vòng (DFS trên đồ thị phụ thuộc hiện có + cạnh mới); `insert` dùng `INSERT OR IGNORE`, **bỏ `catch {}`** (L14-16) để lỗi thật nổi lên; `taskRepository` thêm `getMany(ids)`.
- Tiêu chí: `L1`; A→B rồi B→A → 400; tự phụ thuộc → 400.

#### Task 6.4 — Validate + quyền sở hữu (S10, C8)

- File: `services/task.service.ts`.
- Hành động: `status ∈ {todo,progress,done}`, `priority ∈ {low,medium,high}` (400); `title` không rỗng sau `trim` (đã có `requireString`); `attachments[].kind ∈ {file,folder}`, `path` không rỗng; `get/update/remove` kiểm `task.projectId === projectId` (sai → 404, như `worktreeService.ownedBy`). Không kiểm `endDate >= startDate` (tránh phá luồng hiện có).
- Tiêu chí: `L1`; `PUT /projects/A/tasks/<task của B>` → 404; `status:"x"` → 400.

#### Task 6.5 — Gộp truy vấn khi list task (S10)

- File: `services/task.service.ts`, `repositories/{task-tag,task-checklist,task-attachment,task-dependency}.repository.ts`.
- Hành động: thêm `listByTasks(ids)` (`WHERE task_id IN (...)`, chia lô 500) cho 4 repository; `taskService.list` (L112-121) dùng 4 truy vấn thay vì 4×N.
- Tiêu chí: `L1`; kết quả `GET /projects/:id/tasks` giống hệt trước (so JSON).

#### Task 6.6 — Workflow: xóa và ghi đè (S19, C7)

- File: `services/workflow.service.ts`, `routes/task.route.ts`.
- Hành động: `remove(taskId)` (dùng `workflowRepository.remove`, gỡ `tasks.workflow_id`); `DELETE /tasks/:taskId/workflow`; `PUT` chấp nhận `{content}` (ghi đè) bên cạnh `{oldContent,newContent}`; thiếu cả hai → 400.
- Tiêu chí: `L1`; tạo → ghi đè → xóa → `GET` 404.

#### Task 6.7 — Chuẩn hóa scope (S19, C9)

- File: `services/scope.service.ts`, `repositories/scope.repository.ts`.
- Hành động: `set`: chuẩn hóa mỗi path (bỏ `./`, `/` cuối, gộp `//`), từ chối tuyệt đối hoặc chứa `..` (400), dedupe; chạy trong `scopeRepository.transaction` (thêm), nạp danh sách hiện có **một lần** (hết N+1 ở L48).
- Tiêu chí: `L1`; `["src/","src"]` → một scope `src`; `["../x"]` → 400.
- Rủi ro: client đang gửi đường dẫn tuyệt đối (mục 7).

### Phase 7: Git đúng với tên file đặc biệt + giảm tải

- **Mục tiêu:** tên file tiếng Việt/khoảng trắng/rename đúng ở mọi nơi. **Vấn đề:** S07, S14. **Phụ thuộc:** Phase 2.

#### Task 7.1 — Bộ parse NUL + `status`

- File: `infra/git-parse.ts`, `services/git/git-status.service.ts`.
- Hành động: `splitNul`, `parseStatusZ(stdout)` (bản ghi `XY path\0`, với `R/C` đọc thêm bản ghi `oldPath`), `parseNumstatZ`. `git-status.service.ts`: `status`/`statusFiles` dùng `git status --porcelain=v1 -z --untracked-files=all`; `numstat`, `diff --name-only` dùng `-z`; `ignoredPaths` dùng `ls-files -z`; `output` dựng lại dạng `XY path` (rename: `R  old -> new`); `changedInOtherBranches`/`remoteDiff` dùng `--name-only -z`.
- Tiêu chí: `L1`; trong repo mẫu có `mới.txt`, `a b.txt`, rename `old.ts → new.ts`: `files` có khóa `…/mới.txt`, `…/a b.txt`, `…/new.ts` (không còn `"m\341…"`).
- Ảnh hưởng UI: C4.

#### Task 7.2 — Explorer + remote

- File: `services/git/git-explorer.service.ts`, `services/git/git-remote.service.ts`.
- Hành động: `ignoredRoots` (L6-16) `ls-files -z --others --ignored --exclude-standard --directory`; `commitPushFiles` (`check-ignore -z`, `ls-files -z`, L62-70) và `fileDiffVsRemote` (`ls-files --error-unmatch` giữ nguyên) dùng NUL.
- Tiêu chí: `L1`; `explorer-state` cho đúng `ignoredPaths` với thư mục có tên tiếng Việt.

#### Task 7.3 — Diff, history, scopeTransfer

- File: `services/git/git-diff.service.ts`, `services/git/git-history.service.ts`, `services/git/git-write.service.ts`.
- Hành động: `changedFilesVsOrigin` (`--numstat -z`, `--name-status -z`), `applyWorkingStatus` (`status -z`, rename 2 bản ghi), `localDiff` (`ls-files -z`); `commitFiles` (`show --numstat -z`, `--name-status -z`); `scopeTransfer` (`status --porcelain -z`, L74-79).
- Tiêu chí: `L1`; `/git/local-changes`, `/git/commit-files` đúng với file có dấu.

#### Task 7.4 — Literal pathspec + `checkout` không nhầm file

- File: `services/git/git-write.service.ts`, `services/git/git-remote.service.ts`.
- Hành động: `stage`, `unstage` dùng `git --literal-pathspecs add|restore …` (không áp cho `scopeTransfer` vì đã dùng `:(literal)`); `commitPushFiles` (`add -f`, `commit -m … --`) cũng literal; `checkout` thêm `--` sau tên nhánh (`['checkout', branch, '--']`, với `--track` giữ nguyên).
- Tiêu chí: `L1`; stage file tên `[a].txt` hoặc `*.md` đúng một file; nhánh trùng tên file vẫn checkout nhánh.

#### Task 7.5 — Giới hạn giao thức khi clone

- File: `services/git/git-write.service.ts`.
- Hành động: `clone` truyền `env: { GIT_ALLOW_PROTOCOL: 'https:ssh:git:file' }` qua `runGit` opts (Task 2.1) và timeout mạng.
- Tiêu chí: `L1`; clone `https://…` vẫn chạy; URL `ext::…` bị từ chối.

#### Task 7.6 — Kiểm tra tham số route git

- File: `routes/git.route.ts`.
- Hành động: `limit` của `/git/log` kẹp trong `[1, 5000]` (L105-109); `commit-push-files` dùng `fileList` (đã có) cho `files` và kiểm `message` là chuỗi.
- Tiêu chí: `L1`; `limit=999999999` → bị kẹp; `files` không phải mảng → 400.

#### Task 7.7 — Gộp request đang chạy + cache ngắn

- File: `infra/ttl-cache.ts`, `services/git/git-status.service.ts`, `services/git/git-repo.service.ts`, `services/git/language-stats.ts`.
- Hành động: `coalesce(key, fn)` (cùng key đang chạy thì dùng chung promise, **không** cache sau khi xong); áp dụng cho `gitService.status` theo `gitRoot`. `languageStats` và `repoInfo` cache TTL 15 s theo `root` (không dùng cho `status` để không trả dữ liệu cũ sau commit).
- Tiêu chí: `L1`; 10 request `status` đồng thời chỉ sinh 1 lượt 6 process git.

### Phase 8: FS và tải ảnh an toàn

- **Mục tiêu:** không đứng server, không mất cập nhật khi nhiều bên cùng sửa. **Vấn đề:** S16, S17. **Phụ thuộc:** Phase 1.

#### Task 8.1 — Trần dung lượng `read-file`

- File: `services/fs/fs-query.service.ts`, `config/server.config.ts`.
- Hành động: `readFile` (L134-143) `fs.stat` trước; `size > CODE_MAX_READ_BYTES` → `AppError('File too large', 413)`; phát hiện nhị phân (NUL trong 8 KB đầu) → `AppError('Binary file', 415)`. `readLines` chịu cùng giới hạn.
- Tiêu chí: `L1`; đọc file 100 MB → 413; file văn bản thường không đổi.

#### Task 8.2 — `tree`: trần số node + exclude mặc định

- File: `services/fs/fs-query.service.ts`.
- Hành động: khi client **không** truyền `exclude`, mặc định `['.git', 'node_modules']`; trần 50.000 node (vượt thì dừng mở rộng thêm, `console.warn`); giữ nguyên kiểu trả về `TreeNode[]`.
- Tiêu chí: `L1`; `depth=20` trên repo có `node_modules` hoàn tất < vài giây.

#### Task 8.3 — `grep` bằng ripgrep (C10)

- File: `services/fs/fs-query.service.ts`, `services/search/search.service.ts`.
- Hành động: `grep` (L209-266) chạy `rg --json --ignore-case --max-filesize <maxFileSize> -e <searchTerm>` (không `--no-ignore`) trên `filePath`/`folderPath`, ánh xạ về `GrepData` cũ (`matches[{lineNumber,lineContent}]`, `totalFilesSearched`, `totalMatches`); `exclude` thành `--glob '!x'`; regex sai (rg mã 2) → `AppError(400, 'Invalid regex pattern …')`. Dùng chung `rgPath` (thêm helper `runRg` nhỏ).
- Tiêu chí: `L1`; kết quả khớp bản cũ trên 3 mẫu; `(a+)+$` trên chuỗi dài không đứng server.
- Rủi ro: mẫu dùng lookahead/backreference trả 400 thay vì chạy. Đã nêu ở mục 7; nếu không chấp nhận → bỏ task, thay bằng giới hạn thời gian + độ dài dòng.
- Ảnh hưởng UI: C10.

#### Task 8.4 — `write-file` an toàn (C5)

- File: `services/fs/fs-write.service.ts`, `routes/fs.route.ts`.
- Hành động: ghi vào tệp tạm cùng thư mục rồi `rename` (giữ `mode` của file cũ); `content` phải là chuỗi (400); nhận `expectedMtime?` — nếu file tồn tại và `mtimeMs` khác → 409 `File changed on disk` kèm `mtime`; response thêm `mtime` mới.
- Tiêu chí: `L1`; ghi hai lần với `expectedMtime` cũ → lần hai 409; ngắt tiến trình giữa chừng không để lại file cụt.
- Ảnh hưởng UI: C5 (additive).

#### Task 8.5 — `rename` qua ổ khác + `nameMatcher`

- File: `services/fs/fs-write.service.ts`, `services/fs/fs-query.service.ts`.
- Hành động: `rename` bắt `EXDEV` → `fs.cp` rồi `fs.rm`; `nameMatcher` (L83-91) escape toàn bộ ký tự regex trước khi thay `*`/`?`.
- Tiêu chí: `L1`; `find-files?pattern=a+b*` không còn hiểu `+` là lượng từ.

#### Task 8.6 — Tải logo an toàn (S17)

- File: `infra/safe-fetch.ts`, `services/fs/image.service.ts`.
- Hành động: `safeFetch(url, {timeoutMs:10000, maxBytes:5MB, maxRedirects:3})`: resolve DNS, chặn IP loopback/riêng/link-local (trừ `CODE_ALLOW_PRIVATE_LOGO_URLS=1`), kiểm lại từng bước redirect, đọc stream có trần (kiểm `content-length` trước). `downloadProjectLogo` (L268-289) dùng nó, giữ nguyên kết quả `{success,path|error}`.
- Tiêu chí: `L1`; `http://169.254.169.254/x.png` → `{success:false}`; logo https hợp lệ vẫn tải được.

### Phase 9: Chức năng bổ sung (tùy chọn, ưu tiên khi làm remote)

- **Mục tiêu:** server tự quản worktree thật và dữ liệu hữu ích. **Vấn đề:** S19. **Phụ thuộc:** Phase 4. Toàn bộ phase là **có điều kiện** theo kế hoạch chuyển remote.

#### Task 9.1 — `GET /system/doctor` (C12)

- File: `services/system.service.ts`, `routes/system.route.ts`, `routes/routes.ts`.
- Hành động: trả `git --version`, `gh --version` + `gh auth status` (chỉ cờ), đường dẫn `rg`, `dataDir` ghi được, `PRAGMA quick_check`, `user_version`, số backup. Không tiết lộ token.
- Tiêu chí: `L1`; không có `gh` → `installed:false`, không lỗi 500.

#### Task 9.2 — `git-worktree.service.ts` (có điều kiện)

- File: `services/git/git-worktree.service.ts`.
- Hành động: `add({root, path, branch, base?, createBranch?})` (`git worktree add`), `remove({root, path, force?, deleteBranch?})` (`git worktree remove`, kiểm dirty, tùy chọn `branch -d`), `list(root)` (`worktree list --porcelain`). Mọi tham số qua `safeRef`/`safePath`.
- Tiêu chí: `L1`; tạo/xóa worktree trên repo mẫu.

#### Task 9.3 — Route + đăng ký DB (có điều kiện)

- File: `routes/project.route.ts`, `services/worktree.service.ts`, `services/worktree-sync.service.ts`.
- Hành động: `POST /projects/:id/worktrees/git` (tạo worktree thật rồi `worktreeService.create`), `DELETE /projects/:id/worktrees/:worktreeId?deleteFolder=&deleteBranch=&force=` (gọi `git-worktree.remove` rồi xóa hàng, phát `worktree:removed`), `POST /projects/:id/worktrees/refresh` (đồng bộ hai chiều với `git worktree list`: thêm worktree mới tìm thấy, xóa cái đã mất như mục 2.2).
- Tiêu chí: `L1`; tạo worktree ngoài app → `refresh` thêm vào DB.

#### Task 9.4 — Cột bổ sung (migration 0003, tùy chọn)

- File: `database/migrations/0003-columns.ts`, `database/migrations/index.ts`, `domain/mappers.ts`, `repositories/worktree.repository.ts`, `repositories/task.repository.ts`.
- Hành động: chỉ `ALTER TABLE … ADD COLUMN` (additive, mapper thêm field mới): `worktrees(created_at, updated_at, is_main)`, `tasks(completed_at, pr_number, pr_url)`, `projects(last_opened_at, git_common_dir)`, `sessions(last_active_at)`. `completed_at` đặt khi `status` chuyển `done`. Field mới trong response là additive.
- Tiêu chí: `L1`; DB cũ migrate lên `user_version = 3`, response cũ không mất field.

### Phase 10: Dọn dẹp và hiệu năng

- **Mục tiêu:** bỏ thừa, tối ưu đường nóng. **Vấn đề:** S18, S19, S20. **Phụ thuộc:** các phase trước.

#### Task 10.1 — Danh sách project nhẹ hơn (S18)

- File: `services/project.service.ts`, `http/guard.ts`, `index.ts`.
- Hành động: `attachSessions` chỉ tải session/panel của các worktree trong danh sách (lọc theo `worktree_id IN`), `list` gọi `listAll()` một lần; `rootProvider` có cache có hiệu lực theo phiên bản (tăng `rootsVersion` khi `worktreeRepository` insert/update path/remove). Giữ nguyên nội dung response (kể cả `panels[].content`).
- Tiêu chí: `L1`; `GET /projects` giống hệt trước; số truy vấn giảm.

#### Task 10.2 — Cấu hình chung (S20)

- File: `index.ts`, `http/envelope.ts`, `config/server.config.ts`.
- Hành động: `errorHandler` dùng `cfg.env` (bỏ `NODE_ENV`); thêm handler 404 JSON `{success:false,error:'Not found'}`; `express.json` mặc định 2 MB, riêng `fs/write-file`, `sessions/:id/workspace`, `PUT /projects` giữ 50 MB (đăng ký parser theo route **trước** parser toàn cục).
- Tiêu chí: `L1`; body 5 MB tới endpoint thường → 413; `write-file` 10 MB vẫn qua.

#### Task 10.3 — Xóa mã thừa (S20)

- File: `utils/guard.ts`, `utils/http.ts`, `services/git-runner.ts`, `repositories/group.repository.ts` (+ importer nếu còn).
- Hành động: `grep -rn "utils/guard\|utils/http\|services/git-runner" code/src` — importer còn thì sửa sang `http/*` / `infra/git-runner`, rồi xóa shim; xóa `groupRepository.transaction` nếu không ai dùng.
- Tiêu chí: `L1`; `grep` rỗng.

#### Task 10.4 — (có điều kiện: hỗ trợ Windows) đường dẫn độc lập nền tảng (S20)

- Điều kiện: xác nhận Windows (mục 7). File: `infra/paths.ts` (`isInside(root, p)`, `relPosix(root, p)` dựa `path.relative`), `services/git/git-remote.service.ts`, `services/git/git-status.service.ts`, `services/git/git-explorer.service.ts`.
- Hành động: thay `startsWith(`${base}/`)`/`slice(base.length+1)` bằng helper; chuẩn hóa khóa trả về dạng `/` nếu client đang giả định POSIX.
- Tiêu chí: `L1`; trên Linux không đổi kết quả.

### Phase 11: Rà soát cuối

- **11.1** Chạy lại script kiểm tra (mục 6) và `L1`. **11.2** Đối chiếu bảng 2.6: mọi mã C1–C14 đã triển khai hoặc ghi lý do hoãn; gửi bảng này cho người phụ trách client. **11.3** Smoke thủ công: tạo project + worktree → xóa thư mục ngoài app → worktree biến mất và nhận `worktree:removed`; `git checkout` ngoài app → `branch` cập nhật; sửa file tên tiếng Việt → trạng thái đúng; ngắt server khi đang search → không còn `rg`; khởi động với `CODE_HOST=0.0.0.0` không token → từ chối. **11.4** Cập nhật `AGENTS.md` (nếu có ở repo): biến môi trường mới, quy tắc `Host/Origin`, sự kiện `/events`, quy ước backup.

## 5. Ảnh hưởng ngoài phạm vi (client, main process)

1. **Client lắng nghe `/events`** bằng fetch-stream (có `Authorization`), cập nhật store khi nhận `worktree:removed`/`worktree:branch-changed` (C1). Chưa làm cũng không sao: `GET /projects` đã sạch nhờ reconcile (C2).
2. **`PUT /projects/:id/tasks/:taskId`** (C8): client nên dùng `id` trả về trong response cho tags/checklist (server có thể cấp id mới khi id gửi lên không thuộc task).
3. **`/git/remote-diff`** (C3) trả mảng; chỗ đọc `res.files` kiểm kiểu.
4. **`/git/status`** (C4): `files`/`output` không còn dạng quote; parser text ở UI (`git-status-parser.util.ts`) tiếp tục dùng được vì `output` vẫn là dạng `XY path`.
5. **`/fs/write-file`** (C5): có thể gửi `expectedMtime`, xử lý 409 (file đổi trên đĩa); 404 khi root worktree không còn.
6. **Token/Origin** (C11): main process cấp `CODE_TOKEN`, `CODE_ALLOWED_ORIGINS`, `CODE_HOST` khi khởi động server; renderer gửi `Authorization: Bearer` nếu có token.
7. **IPC `git:*` ở `src/main`** (tạo worktree, xóa nhánh…) vẫn giữ cho bản desktop; Phase 9 cung cấp tương đương phía server cho bản remote.

## 6. Checklist cho Executor

**Cho mọi task**

- Giữ nguyên hành vi/hợp đồng trừ phần nêu ở 2.6; không format lại code giữ nguyên; mỗi task ≤ 5 file ghi, 1 commit, `L1` sạch trước khi báo xong.
- Không thêm thư viện, không tạo test, không `any` mới; lỗi dùng `AppError` (server) hoặc outcome `{error}` đúng quy ước hiện có của service đó.
- Hàm mới ngắn, một mức trừu tượng; không comment trừ chỗ logic khó; không `console.log` thừa (dùng `console.warn/error` có tiền tố `[worktree-sync]`, `[backup]`, …).
- Mọi thao tác xóa dữ liệu thật phải: (1) backup, (2) log có id/path, (3) chạy **sau** commit transaction.
- Khi di chuyển/xóa shim: `grep -rn` toàn `code/src` trước.

**Script kiểm tra sau mỗi phase**

```bash
cd code && npx tsc --noEmit                                        # L1
grep -rn "execFileSync" src                                        # phải rỗng
grep -rn "repositories" src/http src/infra                         # phải rỗng
grep -rn "rmSync\|fs.rm(" src | grep -v "fs-write\|image\|git-write"   # soát nơi xóa file thật
grep -rn "catch {}" src                                            # soát nuốt lỗi
```

**Kịch bản thủ công cho Phase 4**

```bash
# 1) tạo project + worktree qua API, rồi:
rm -rf /path/to/worktree
curl -s http://127.0.0.1:3055/api/v1/projects | jq '.data[].worktrees[].path'   # worktree đã biến mất
ls ~/.phantoma/code/backups                                                     # có bản sao lưu
# 2) đổi quyền để chắc chắn KHÔNG xóa khi EACCES:
chmod 000 /path/to/other-worktree && curl -s .../projects                        # vẫn còn
```

## 7. Giả định / Cần xác nhận

1. **Origin của renderer production** (Electron `file://` → `Origin: null`, hay `app://`, hay `http://localhost:*`): Task 5.1 cho phép `null` và scheme không phải http(s) ở chế độ loopback không allowlist; xác nhận để chốt `CODE_ALLOWED_ORIGINS` cho production.
2. **Xóa ngay có thể xóa nhầm khi ổ/mount tạm vắng:** `ENOENT` khi ổ chưa mount bị coi là đã xóa (quyết định #1). Giảm thiểu bằng backup (Task 3.2) và log; nếu muốn an toàn hơn, thêm điều kiện "thư mục cha của worktree vẫn tồn tại mới xóa" (một dòng ở 4.2) — hỏi lại nếu cần.
3. **Windows:** chưa trả lời; Task 10.4 chỉ làm khi hỗ trợ Windows. Các `startsWith('/')` hiện còn ở `git-remote.service.ts`, `git-explorer.service.ts`, `git-status.service.ts`.
4. **Regex của `fs/grep` đổi sang Rust-regex (Task 8.3):** mẫu dùng lookahead/backreference sẽ trả 400. Nếu agent/UI đang dùng cú pháp JS đặc thù → bỏ task, dùng giới hạn thời gian + độ dài dòng thay thế.
5. **Task 3.5 (`confirmDeleteAll`):** chỉ làm khi chấp nhận client gửi cờ lúc xóa project cuối; nếu không, vẫn an toàn nhờ backup + log (3.4).
6. **Regex id ở Task 1.1** (`^[A-Za-z0-9_-]{1,128}$`): chưa liệt kê định dạng id mà client đang tạo (UUID, `task_…`, id seed). Executor grep dữ liệu thật trước khi chốt.
7. **Scope path tuyệt đối (Task 6.7):** giả định client chỉ gửi đường dẫn tương đối so với worktree (đúng với `inScope` ở `git-explorer.service.ts:48-49`); nếu có đường dẫn tuyệt đối thì chuyển thành tương đối thay vì từ chối.
8. **`PROTECTED_DIRS` mở rộng (Task 5.4):** có thể chặn ghi vào project đặt dưới `/opt` hoặc `/var`; xác nhận vị trí project thực tế.
9. **`journal_mode = DELETE`** (`connection.ts:134`) giữ nguyên (chưa được trả lời). Nếu sau này có nhiều client remote ghi đồng thời, nên xét `WAL` — ngoài phạm vi kế hoạch.
10. **Hạn chế quét:** không có `package.json`, `tsconfig`, test, code client; lệnh `L1` theo quy ước kế hoạch Restructure, chưa chạy được trên gói này. Số dòng lấy từ bản đọc; Executor kiểm lại đúng vùng dòng ở Bước 0.
11. **Thí nghiệm ✔** chạy trên Node/git của sandbox (không phải môi trường người dùng): `ENOENT` khi cwd thiếu, `JSON.stringify(Set)`, `path.join(dataDir, '')`/`'..'`, quote của `git status --porcelain`, `close code=null` khi kill tiến trình con. Kiểm lại một lần trên môi trường thật ở các task tương ứng.
