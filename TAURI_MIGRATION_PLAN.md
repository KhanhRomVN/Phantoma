# Kế hoạch chuyển Phantoma từ Electron sang Tauri (Rust)

> Tài liệu dành cho AI/dev thực thi. Làm tuần tự theo Phase, tick checklist khi xong. Mục đánh dấu **[CẦN XÁC MINH]** là chỗ chưa đọc code thật: phải grep/đọc file trước khi làm, không được đoán.

## 0. Nguyên tắc bắt buộc

1. Làm trên branch riêng (vd `feat/tauri`), giữ Electron chạy song song cho tới Phase 9. Không xoá `src/main`, `src/preload` trước Phase 9.
2. Mục tiêu số 1: **renderer gần như không đổi**. Giữ nguyên tên channel IPC (`fs:read-file`, `git:status`, ...) và giữ `window.api.invoke/on/off` bằng một lớp shim (Phase 2).
3. Tauri **v2**. Frontend vẫn là Vite + React + TS trong `src/renderer`.
4. Mỗi handler port xong phải giữ đúng shape dữ liệu trả về như bản TS (field name, null/undefined, lỗi). Đọc file TS gốc trước khi viết bản Rust.
5. Đọc `AGENTS.md` ở root trước khi làm. Cuối mỗi phase cập nhật AGENTS.md (lệnh build/test mới, cấu trúc `src-tauri`). Không hardcode port: nguồn sự thật là `src/shared/ports.ts` (DEFAULT_SERVER_PORT=8080, DEFAULT_EMULATE_PORT=3002).
6. Type-check hiện có: renderer `npx tsc --noEmit -p tsconfig.web.json` (lỗi cũ `spawnResult` trong `RunCommandExecutor.ts` không liên quan). Rust: `cargo check` trong `src-tauri`.
7. Không lưu secret (sudo password, token) vào log hay file plain text.

## 1. Hiện trạng (đã quét)

### 1.1 Cấu trúc `src/main` (~10k dòng)

- `index.ts` (127): khởi tạo logger, đăng ký handlers, `startShellServer()`, tạo cửa sổ, cleanup khi quit (`stopAllDebug`, `stopServers`, `killAllTerminals`), tạo thư mục cert `process.cwd()/.http-mitm-proxy/certs`.
- `core/window/WindowManager.ts` (165) + `core/config/window.config.ts` (20): nhiều BrowserWindow, frame:false, titleBarStyle hidden, maximize sau 150ms (workaround Linux), zoom Ctrl +/-/0 qua `before-input-event`, `will-prevent-unload` (hộp thoại Unsaved), `render-process-gone`, `setWindowOpenHandler` mở link ngoài, `webviewTag: true`, load dev URL hoặc file, hash `#module=<name>`.
- `services/server-spawner.ts` (123): fork `server/` và `emulate/` bằng `utilityProcess.fork`, port ngẫu nhiên, truyền `PORT`/`EMULATE_PORT`; `resources/<name>/dist/index.js`.
- `shared/state.ts`, `shared/index.ts`.
- `storage/` (7 file): ConversationStorage, DesignStorage, MemoryStorage, ReconStorage, SkillStorage, TaskStorage, WorkflowStorage. Dùng `app.getPath`, lưu ở `~/.phantoma/...` (vd `~/.phantoma/code:{slug}/tasks.json`).
- `utils/`: `logger.ts` (230), `image-scan.ts` (271, dùng `nativeImage`), `net.ts` (46, dùng electron `net`), `commandDisplay.ts` (69).
- `ipc/` 25 file, ~213 `ipcMain.handle/on`.

### 1.2 Bảng ánh xạ file → Rust

| File TS | Dòng | Việc chính | Rust / giải pháp | Độ khó |
|---|---|---|---|---|
| `ipc/fs.handlers.ts` | 749 | read/write/list/stat/copy/find/search, watch (chokidar), shell open, home dir, validate paths, scan ảnh, tải logo, cert TLS | `std::fs`/`tokio::fs`, `walkdir`, `ignore`, `regex`, crate `notify` (+`notify-debouncer-full`), `opener`, `reqwest`, crate `image` | Vừa |
| `ipc/git.handlers.ts` | 2202 | ~45 channel, gọi git CLI bằng `execFile` | `tokio::process::Command` (giữ nguyên gọi git CLI, không dùng libgit2 để giữ hành vi). Phải set `GIT_CEILING_DIRECTORIES` = thư mục cha của cwd (xem AGENTS.md) | Vừa (nhiều nhưng lặp) |
| `ipc/terminal.handlers.ts` | 450 | node-pty, history, kill-foreground, write/resize | crate `portable-pty`, emit event output về đúng window | Vừa-Khó |
| `ipc/debug.handlers.ts` | 567 | js-debug DAP, spawn adapter, run task, stop | `tokio::process`, TCP/stdio client, emit event theo sender | Khó |
| `ipc/agent-tool.handlers.ts` + `agent-tool-run.ts` + `agent-tool-sessions.ts` | 672+306+225 | discover/list-sessions/run/interrupt/resolve-permission, spawn CLI agent | `tokio::process`, map `runId -> Child`, event `agent-tool:permission-request` tới window | Vừa |
| `ipc/dialog.handlers.ts` | 368 | save/open dialog, mở trình duyệt theo profile, list Chromium profiles, system info | `tauri-plugin-dialog`, `tauri-plugin-notification`, `sysinfo`, `std::process` | Vừa |
| `ipc/app.handlers.ts` | 265 | list app đã cài, sudo password bằng `safeStorage` | `keyring` crate (hoặc tauri-plugin-stronghold) thay `safeStorage` | Vừa |
| `ipc/workspace.handlers.ts` | 343 | get/list files, folders, scan git repos, check git ready, open file | Rust thuần | Dễ |
| `ipc/webview.handlers.ts` | 413 | **BrowserView** nhúng, set-bounds, navigate/back/forward/reload, favicon, export PDF (`printToPDF`) | **Điểm bắt buộc làm lại** — xem Phase 6 | Rất khó |
| `ipc/design.handlers.ts` | 206 | CRUD design + `protocol.handle` cho scheme media/design | `register_uri_scheme_protocol` — xem Phase 6 | Vừa-Khó |
| `ipc/recon.handlers.ts` | 216 | targets + `browser:*` gọi recon server | Rust `reqwest` gọi recon server (hoặc để renderer gọi HTTP trực tiếp) | Dễ-Vừa |
| `ipc/puppeteer.handlers.ts` | 1648 | Puppeteer cũ | **Deprecated** (`ipc/index.ts` đã comment export, logic chuyển sang recon server). Không port, xoá ở Phase 9 | Bỏ |
| `ipc/target-lock.handlers.ts` | 123 | claims windowId→module→targetId, focus-owner, close-owner, force-release, broadcast `target:claims-changed` | `Mutex<HashMap>` trong Rust state, `app.emit_to(label,..)` | Dễ-Vừa |
| `ipc/window.handlers.ts` | 74 | minimize/maximize/unmaximize/new/close/isMaximized | Tauri Window API (có thể làm ngay ở JS), `window:new` ở Rust | Dễ |
| `ipc/conversation`, `memory`, `skill`, `task`, `workflow`, `title`, `logger`, `runtime` handlers | 17–119 | CRUD JSON/markdown | Rust thuần (`serde_json`) | Dễ |
| `storage/*` | 85–322 | Đọc/ghi file dưới `~/.phantoma` | Port 1-1 sang module Rust, giữ nguyên đường dẫn và định dạng file | Dễ |
| `utils/image-scan.ts` | 271 | quét ảnh vuông, resize → data URL (`nativeImage`) | crate `image` + `base64` | Vừa |
| `utils/logger.ts` | 230 | file logger | `tracing` + `tracing-appender` | Dễ |

### 1.3 Thứ bắt buộc phải thiết kế lại (không có tương đương trực tiếp)

1. **`BrowserView`** (`webview.handlers.ts`): native layer nằm trên web content, đồng bộ bounds từ renderer. Tauri v2 có multi-webview (`Window::add_child` / `WebviewBuilder`) nhưng nằm sau feature `unstable` và hành vi trên Linux (WebKitGTK) có thể không ổn định. Cần spike (Phase 1.5).
2. **`protocol.handle` + `registerSchemesAsPrivileged`** (`design.handlers.ts`, scheme media/design): chuyển sang `register_uri_scheme_protocol` ở Rust. URL phía renderer khác nhau theo OS (Linux/macOS: `scheme://localhost/...`, Windows: `http://scheme.localhost/...`). Phải sửa chỗ renderer build URL.
3. **`webContents.printToPDF`** (`markdown:export-pdf`): Tauri không có API tương đương. Phương án: (a) sidecar Node dùng puppeteer-core + Chrome hệ thống, (b) `window.print()` trong webview ẩn, (c) crate sinh PDF. Chọn ở spike.
4. **Chromium DevTools Protocol / `--remoteDebuggingPort=9222`** (script `dev`): WebKitGTK không có CDP. Nếu AI agent/tooling hiện đang dùng cổng 9222 để debug renderer thì sẽ mất trên Linux. **[CẦN XÁC MINH]** ai đang dùng cổng này.
5. **Hành vi engine**: Electron = Chromium cố định; Tauri = WebKitGTK (Linux), WKWebView (macOS), WebView2 (Windows). Cần test lại Monaco, xterm, CSS (backdrop-filter, scrollbar), `<webview>`, drag-drop, clipboard.
6. **Node-only runtime**: `server/`, `emulate/`, `recon/` là dự án Node riêng (utilityProcess dùng ABI Electron). Tauri không có Node nên dùng **sidecar** (Phase 5).
7. **`webviewTag: true`**: **[CẦN XÁC MINH]** renderer có dùng thẻ `<webview>` không (`grep -rn "<webview" src/renderer`). Tauri không hỗ trợ thẻ này.

## 2. Các Phase

### Phase 0 — Khảo sát bổ sung (không sửa code)

- [ ] Đọc toàn bộ `src/preload/index.ts` (57), `index.d.ts` (37), `types/index.ts` (19): liệt kê chính xác API `window.api` (invoke, on, off, send?, runtime.getPorts, runtime.startEmulate, ...). Ghi nhận điểm không nhất quán: `file-watcher.service.ts` dùng `const unsubscribe = window.api.on(...)` còn `Log/index.tsx` dùng `off(channel, removeListener)`.
- [ ] Liệt kê mọi channel phía renderer: `grep -rnE "api\.(invoke|send|on|off)\(" src/renderer/src`, đối chiếu với `ipcMain.handle/on` ở main. Lập bảng `docs/ipc-channels.md` gồm: channel, kiểu (handle/on/event main→renderer), file main, file renderer, shape args/return.
- [ ] Liệt kê toàn bộ event main→renderer (`webContents.send`): đã biết `target:claims-changed`, `target:force-release`, `agent-tool:permission-request`, `window:maximized`, `window:unmaximized`, `window:zoom-changed`, `window:renderer-crashed`, `mobile:logcat-output`, và các event của terminal/debug/fs watcher. Tìm đủ bằng `grep -rn "\.send(" src/main`.
- [ ] Xác minh 7 mục **[CẦN XÁC MINH]** ở 1.3 và danh sách trên.
- [ ] Đọc `electron.vite.config.ts`, `electron-builder.yml`, `scripts/build-interactive.js`, `scripts/copy-artifacts.js`, `src/shared/ports.ts`, `src/main/services/server-spawner.ts`.

### Phase 1 — Scaffold Tauri

- [ ] `npm i -D @tauri-apps/cli@^2` và `npm i @tauri-apps/api@^2`; cài prerequisites Linux (webkit2gtk-4.1, libsoup3, build-essential, ...).
- [ ] Tạo `src-tauri/` (Cargo.toml, tauri.conf.json, build.rs, src/main.rs, src/lib.rs, capabilities/default.json, icons từ `images/phantoma-logo.png`).
- [ ] Tạo `vite.config.ts` riêng cho Tauri trỏ root `src/renderer` (giữ alias `@renderer`, `@app` → `src/shared`), cổng dev cố định, `clearScreen:false`. Giữ `electron.vite.config.ts` đến Phase 9.
- [ ] `tauri.conf.json`: window `decorations:false`, minWidth/minHeight lấy từ `window.config.ts`, `devUrl`, `frontendDist`, CSP phù hợp (cho phép `ws://127.0.0.1:*`, `http://127.0.0.1:*` tới server/emulate/recon).
- [ ] Thêm script `tauri:dev`, `tauri:build` vào package.json (không đụng `dev`/`build` cũ).
- [ ] Tiêu chí xong: `npm run tauri:dev` mở cửa sổ hiển thị UI renderer (chưa cần chức năng).

### Phase 1.5 — Spike kỹ thuật (làm TRƯỚC khi port hàng loạt)

Mỗi spike là một nhánh thử nhỏ, kết luận ghi vào `docs/tauri-spikes.md`. Nếu spike thất bại thì dừng và báo người dùng quyết định.

- [ ] **Spike A — Multi-webview thay BrowserView**: bật feature `unstable`, tạo child webview gắn vào cửa sổ, set position/size theo bounds từ renderer, navigate/back/forward/reload, nhận event title/favicon/loading. Thử trên Linux thật. Kết quả: dùng được / chỉ dùng được một phần / phải đổi UX (cửa sổ riêng).
- [ ] **Spike B — Custom scheme**: `register_uri_scheme_protocol` phục vụ file media/design, load được `<img src>` và `<video>` từ renderer.
- [ ] **Spike C — PDF export**: chọn phương án cho `markdown:export-pdf`.
- [ ] **Spike D — Sidecar Node**: chạy được `server/dist/index.js` với Node đóng gói kèm, port ngẫu nhiên, kill sạch khi thoát.
- [ ] **Spike E — PTY**: `portable-pty` chạy bash, stream output, resize, kill foreground.

### Phase 2 — Lớp tương thích IPC (quan trọng nhất)

Mục tiêu: renderer vẫn gọi `window.api.invoke('git:status', path)` như cũ.

- [ ] Rust: một command duy nhất `ipc_invoke(window: tauri::Window, app: AppHandle, state: State<Registry>, channel: String, args: Vec<serde_json::Value>) -> Result<serde_json::Value, String>`; `Registry` là `HashMap<&'static str, Handler>`. Mỗi handler nhận `(ctx: Ctx{app, window}, args: Vec<Value>)` và trả `Result<Value, String>`. Mỗi module Rust có hàm `register(&mut Registry)` tương ứng `setupXxxHandlers()`.
- [ ] Channel kiểu `ipcMain.on` (fire-and-forget) cũng đăng ký vào cùng registry, renderer vẫn gọi và bỏ qua kết quả.
- [ ] Event main→renderer: helper `ctx.emit_to_sender(channel, payload)` dùng `window.emit(...)`; broadcast dùng `app.emit(...)`. Event theo từng cửa sổ phải gửi tới đúng label (thay `event.sender` / `WeakSet<WebContents>` trong terminal/debug/fs watcher).
- [ ] Preload thay thế: tạo `src/renderer/src/tauri-bridge.ts` (import đầu tiên trong entry) gán `window.api = { invoke, on, off, send, runtime:{getPorts,startEmulate} }`. `on(channel, handler)` dùng `listen` từ `@tauri-apps/api/event`, **luôn trả về hàm unsubscribe** và `off(channel, fnOrUnsubscribe)` phải chấp nhận cả hai cách dùng hiện có. Handler giữ chữ ký `(event, ...args)`: bọc payload thành `(_event, ...payload)` để code cũ không phải sửa.
- [ ] Sửa lỗi thông báo: Electron `invoke` reject với Error; Rust trả `Err(String)` → bridge `throw new Error(msg)`. Các service dùng `IpcResult<T>` (`{success, data, error}`) thì giữ nguyên shape từ handler.
- [ ] Giữ `src/preload/index.d.ts` làm nguồn kiểu cho `window.api` (di chuyển sang `src/renderer/src/types/` ở Phase 9).
- [ ] Tiêu chí xong: gọi `fs:get-homedir` và `log:write` từ renderer chạy đúng trên Tauri.

### Phase 3 — Nền tảng Rust

- [ ] Cấu trúc `src-tauri/src/`: `main.rs`, `lib.rs`, `ipc/{mod,registry,ctx}.rs`, `handlers/{fs,git,terminal,debug,agent_tool,dialog,app,workspace,webview,design,recon,target_lock,window,conversation,memory,skill,task,workflow,title,logger,runtime}.rs`, `storage/*.rs`, `services/{server_spawner,paths}.rs`, `utils/{image_scan,logger,net,command_display}.rs`.
- [ ] Crate gợi ý: `serde`, `serde_json`, `tokio` (full), `anyhow`/`thiserror`, `tracing`, `tracing-appender`, `notify`, `portable-pty`, `walkdir`, `ignore`, `regex`, `reqwest`, `image`, `base64`, `keyring`, `sysinfo`, `dirs`, `opener`, `uuid`; plugin: `tauri-plugin-dialog`, `tauri-plugin-notification`, `tauri-plugin-shell` (sidecar), `tauri-plugin-single-instance` (nếu cần).
- [ ] `services/paths.rs`: tái tạo `app.getPath(...)`/`app.isPackaged`/`app.getAppPath()`/`process.resourcesPath`; **giữ nguyên** thư mục dữ liệu `~/.phantoma` và `~/.khanhromvn-zen/memory.md` để dữ liệu cũ dùng lại được.
- [ ] Logger file thay `utils/logger.ts`; `log:write` đi vào `tracing`.
- [ ] Cert dir `.http-mitm-proxy/certs`: hiện dùng `process.cwd()` (rủi ro khi app đóng gói). Chuyển sang thư mục dữ liệu app và sửa chỗ đọc `ca.pem` trong `fs.handlers.ts` (~dòng 294) tương ứng. **[CẦN XÁC MINH]** `server/` hay `recon/` có đọc cùng đường dẫn này không.
- [ ] Tiêu chí xong: `cargo check` sạch, registry chạy.

### Phase 4 — Port handlers theo thứ tự rủi ro tăng dần

Mỗi mục: đọc file TS → viết Rust → test tay từ UI → tick. Không port cùng lúc quá nhiều file.

**4.1 Dễ (CRUD/JSON):** `logger`, `runtime`, `title`, `memory`, `skill`, `conversation`, `task`, `workflow`, các `storage/*`, `workspace.handlers.ts`, `window.handlers.ts`, `target-lock.handlers.ts`.
- Window: minimize/maximize/unmaximize/close dùng Tauri Window API; `window:new` tạo `WebviewWindowBuilder` với label duy nhất (`win-<n>`) và URL `index.html#module=<name>`; emit `window:maximized/unmaximized` từ sự kiện resize; giữ workaround maximize sau 150ms nếu vẫn cần trên Linux.
- Target-lock: claims lưu theo window label; khi cửa sổ reload/đóng thì drop claims (tương đương `did-start-loading` + `closed`).

**4.2 Vừa:** `fs.handlers.ts` (kèm watcher ref-count theo `projectPath` — mỗi `watch-dir` đúng 1 `unwatch-dir`, watcher đóng khi về 0; theo dõi cả thư mục `.git`), `recon.handlers.ts`, `dialog.handlers.ts`, `app.handlers.ts` (keyring thay safeStorage; `sudo password` chỉ trong keyring), `design.handlers.ts` (phần CRUD), `utils/image-scan.ts`.

**4.3 Lớn nhưng lặp:** `git.handlers.ts` (2202 dòng). Chia module nhỏ (`git/{status,log,branch,diff,worktree,stats}.rs`), một hàm `run_git(cwd, args)` chung có `GIT_CEILING_DIRECTORIES`, parse output giống hệt bản TS. Có `git:worktree-preview-cancel` (requestId) → cần map huỷ tiến trình.

**4.4 Khó:** `terminal.handlers.ts` (portable-pty, lưu history `terminal:history-save/load/delete`, shell mặc định bash/powershell, interactive non-login để giữ cwd, kill-foreground), `debug.handlers.ts` (DAP: bắt buộc giữ quy tắc `__workspaceFolder`; `preLaunchTask` chạy ở Rust, tee log `/tmp/phantoma-task-*.log`; bỏ env `ELECTRON_*`, `VSCODE_*`, `NODE_ENV`, `NODE_OPTIONS`; `launchVSCode` spawn ngầm không mở terminal), `agent-tool*.ts`.

- [ ] Tiêu chí xong mỗi nhóm: chức năng tương ứng trên UI chạy đúng như bản Electron (so sánh song song).

### Phase 5 — Sidecar & server con

- [ ] Quyết định runtime Node: (a) đóng gói binary Node theo target triple làm sidecar (`externalBin`), hoặc (b) đóng gói server bằng `pkg`/Node SEA thành binary đơn. Ưu tiên (a) vì `server/`, `emulate/`, `recon/` có `node_modules` native. **[CẦN XÁC MINH]** các server có native addon cần build lại cho Node thường (trước đây build theo ABI Electron).
- [ ] Port `server-spawner.ts` sang `services/server_spawner.rs`: tìm cổng trống ngẫu nhiên, spawn bằng `tauri-plugin-shell` sidecar hoặc `tokio::process`, truyền env `PORT`/`EMULATE_PORT`, kill khi thoát. Shell server spawn khi app ready; **emulate spawn on-demand** qua `runtime:start-emulate` (idempotent). `runtime:get-ports` trả cổng đang dùng.
- [ ] Dev mode: KHÔNG spawn, dùng `DEV_PORTS` từ `src/shared/ports.ts` (giữ nguyên hành vi hiện tại).
- [ ] `tauri.conf.json` `bundle.resources`: copy `server/{dist,package.json,node_modules}`, `emulate/{dist,package.json,node_modules}`, `images/`. **[CẦN XÁC MINH]** `recon/` có được đóng gói không.
- [ ] Cleanup: trên sự kiện `RunEvent::ExitRequested`: dừng debug, dừng server con, kill mọi terminal (tương đương `before-quit` hiện tại).

### Phase 6 — Phần bắt buộc thiết kế lại

**6.1 Browser nhúng (thay BrowserView)** — dựa kết luận Spike A:
- Nếu multi-webview ổn: port `browser:create/destroy/set-bounds/navigate/go-back/go-forward/reload/open-external/force-repaint` sang child webview; map `browserId → Webview`; bounds từ renderer (CSS px) đổi sang toạ độ cửa sổ theo scale factor; ẩn/hiện khi mở dropdown (renderer đang tự xử lý do BrowserView nằm trên web content — giữ logic đó). Dùng `on_navigation`/`on_page_load`/`document-title-changed` để emit `page-title-updated`, `did-navigate`, loading state, canGoBack/canGoForward (có thể phải tự theo dõi history phía Rust/JS init script).
- Nếu không ổn: đổi UX sang cửa sổ browser riêng hoặc dùng recon server (Chromium thật) cho tính năng browser; báo người dùng trước khi chọn.

**6.2 Custom scheme media/design:** `register_uri_scheme_protocol` cho từng scheme, tái hiện logic `protocol.handle` (kiểm tra đường dẫn, chống path traversal, MIME, range request cho video). Sửa chỗ renderer sinh URL theo OS (Windows dùng `http://<scheme>.localhost`). Dùng `convertFileSrc` nếu hợp.

**6.3 Export PDF:** triển khai theo kết luận Spike C.

**6.4 Hành vi cửa sổ cũ cần dựng lại ở renderer/Rust:**
- Zoom Ctrl +/-/0 (`applyZoom`, clamp -3..5, bước 0.5, emit `window:zoom-changed` = round(1.2^level*100)): dùng `webview.set_zoom` + phím tắt ở renderer; Tauri không có `before-input-event` nên bắt `keydown` trong JS.
- Ctrl/Cmd+Shift+N mở cửa sổ mới (module `settings`).
- Unsaved changes: `will-prevent-unload` → dùng sự kiện `CloseRequested` của window + `UnsavedGuard` đã có (`shared/unsaved/UnsavedGuard.tsx`); gọi dialog xác nhận (`Leave`/`Stay`). Không thêm modal riêng theo module (quy ước AGENTS.md).
- `render-process-gone` → Tauri không có tương đương rõ ràng: bỏ hoặc phát hiện qua heartbeat. **[CẦN XÁC MINH]** renderer có hiển thị UI crash dựa vào event `window:renderer-crashed` không.
- Link ngoài (`setWindowOpenHandler`) → chặn điều hướng/`window.open` và mở bằng plugin opener.
- Icon cửa sổ: `images/phantoma-logo.png`.

### Phase 7 — Renderer cleanup nhỏ

- [ ] Thay mọi chỗ dùng đối tượng Electron trực tiếp (nếu có) và `process.platform`/`require` trong renderer. **[CẦN XÁC MINH]** `grep -rnE "from 'electron'|require\('electron'\)" src/renderer`.
- [ ] Kiểm tra clipboard, drag-drop file (Tauri dùng event `tauri://drag-drop`, không có `file.path` như Electron — **[CẦN XÁC MINH]** renderer có dùng `File.path` không).
- [ ] Kiểm tra `fetch`/WebSocket tới `127.0.0.1:<port>` không bị CSP/mixed-content chặn (WS bridge của module Emulate).
- [ ] Kiểm tra Monaco (Ctrl+Click definition tự viết trong `definition-navigation.ts`), xterm, ResizableSplit trên WebKitGTK.

### Phase 8 — Build & phát hành

- [ ] Thay `scripts/build-interactive.js`: giữ menu chọn target, nhưng build server/emulate (`scripts/build-server.js`) → `tauri build --target ...` → copy artifact (`.AppImage/.deb/.rpm/.msi/.exe/.dmg`) sang `release/v${version}` (giữ hành vi `copy-artifacts.js`, bỏ file không cần upload).
- [ ] Thay `npm run test:build`/`test:latest` bằng bản Tauri (`tauri build --debug` hoặc `--no-bundle` rồi chạy binary). Không còn cần `delete ELECTRON_RUN_AS_NODE`.
- [ ] Cấu hình bundle trong `tauri.conf.json` (`bundle.targets`, `resources`, `externalBin`, icon, category, version đồng bộ package.json).
- [ ] Ký/cập nhật tự động (tuỳ chọn): `tauri-plugin-updater`. Không bắt buộc ở bản đầu.

### Phase 9 — Gỡ Electron

- [ ] Chỉ làm sau khi người dùng xác nhận Tauri đạt tính năng tương đương (checklist mục 3).
- [ ] Xoá `src/main/`, `src/preload/`, `electron.vite.config.ts`, `electron-builder.yml`, `ipc/puppeteer.handlers.ts`; gỡ dependency: `electron`, `electron-builder`, `electron-vite`, `@electron-toolkit/*`, `node-pty`, `chokidar` (và `puppeteer` nếu chỉ dùng ở main). Hỏi xác nhận trước khi chạy lệnh xoá (lệnh phá huỷ).
- [ ] Chuyển `index.d.ts` của `window.api` sang renderer, đổi `tsconfig.node.json`/`tsconfig.web.json` cho phù hợp.
- [ ] Cập nhật AGENTS.md: mục Runtime servers & ports, Test bản packaged, Dev environment tips (type-check Rust: `cargo check`; type-check renderer giữ nguyên), Multi-window & target lock, Run & Debug, Widgets folder (nếu đổi), cùng quy ước Module Code: chỉ `modules/Code/handler/**` được gọi IPC.

## 3. Checklist nghiệm thu (so sánh Electron vs Tauri)

- [ ] Mở app, cửa sổ frameless + title bar tuỳ biến, maximize/restore hoạt động; Ctrl+Shift+N mở cửa sổ thứ hai; zoom hoạt động.
- [ ] Target lock: hai cửa sổ cùng chọn một branch → hiện `ProjectConflictModal`; force-release hoạt động; badge `busyElsewhere`.
- [ ] FileExplore: đọc/ghi/xoá/copy file, watch thay đổi (ref-count đúng), scope filter.
- [ ] Git: status, diff, commit, stage/unstage, branch, log, worktree preview + cancel, language stats.
- [ ] Terminal: nhiều tab, resize, lịch sử, kill foreground, đóng app không để lại tiến trình mồ côi.
- [ ] Debug (js-debug): chạy launch config, preLaunchTask, attach extension host, stop.
- [ ] Agent tools: discover, list sessions, run, interrupt, duyệt quyền.
- [ ] Task/Workflow/Conversation/Memory/Skill/Design: dữ liệu cũ dưới `~/.phantoma` đọc được nguyên vẹn.
- [ ] Recon + browser nhúng (theo kết luận Phase 6.1), Emulate (server spawn on-demand, logcat event).
- [ ] Sudo password lưu/lấy qua keyring.
- [ ] Export markdown → PDF, media/design scheme hiển thị ảnh/video.
- [ ] Bản packaged: server/emulate spawn cổng ngẫu nhiên, thoát app dọn sạch tiến trình, logo/icon đúng.
- [ ] Unsaved changes: đóng/reload cửa sổ hiện hộp thoại.

## 4. Rủi ro & quyết định cần người dùng chốt

1. Multi-webview unstable trên Linux → có thể phải đổi UX browser nhúng (Spike A).
2. Mất CDP/9222 trên WebKitGTK → ảnh hưởng quy trình debug renderer bằng tool ngoài.
3. Chênh lệch engine (WebKit vs Chromium) → cần vòng test UI toàn bộ.
4. Kích thước bundle: vẫn phải kèm Node sidecar + `node_modules` của server/emulate/recon nên lợi ích dung lượng của Tauri bị giảm.
5. Khối lượng: ~10k dòng TS → Rust; `git.handlers.ts` (2202 dòng) và `debug.handlers.ts` là phần tốn công nhất.
6. Có thể dùng chiến lược trung gian: ban đầu để Rust chỉ làm vỏ (window, dialog, keyring, protocol) và chạy các handler nặng (git, debug, agent-tool) trong một Node sidecar qua WebSocket/stdio, rồi port dần sang Rust. Ưu: ra bản chạy được sớm; nhược: vẫn phụ thuộc Node.

## 5. Quy ước cho AI thực thi

- Mỗi lượt: đọc file TS gốc → port → `cargo check` → test tay → tick checklist trong file này. Không đoán shape dữ liệu; đối chiếu renderer đang gọi.
- Không refactor ngoài phạm vi, không đổi tên channel.
- Gặp mục **[CẦN XÁC MINH]**: grep/đọc code, ghi kết quả vào `docs/ipc-channels.md` hoặc `docs/tauri-spikes.md` rồi mới làm tiếp.
- Thao tác phá huỷ (xoá thư mục, gỡ dependency, `git reset`) phải hỏi người dùng xác nhận.
- Cuối mỗi Phase: cập nhật AGENTS.md với lệnh/cấu trúc thật đã dùng.