# AGENTS.md

## UI conventions

- `@renderer/components/ui/Button` has no `variant` prop (only `size`, `fullWidth`, `asChild`); style everything via `className`. Modal footer confirm action (e.g. Create group) uses the soft look in every state: `bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30`. Do not use solid or outline looks for it.
- Modal footer Cancel button must NOT use the `variant` prop. Style it only via `className` with the soft look and secondary text: `bg-primary/10 text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30 disabled:hover:bg-primary/10`.

## Design module

- Design files lưu trong `<project>/design/<design-name>/` (không còn lưu ở `~/.phantoma`). Mỗi design folder chứa `meta.json`, `README.md` (platform marker), và các file `.tsx`/`.ts`.
- Design tab (ActivityPanel) CHỈ hiển thị danh sách DesignCard. KHÔNG có activeDesign state, KHÔNG có Zen agent panel. Khi click Open hoặc Create, design mở trong Workspace dưới dạng panel type `'design'` (không còn `contentViewMode: 'design'`).
- ActivityPanel có chế độ collapse (state `autoCollapse` trong `ActivityPanel/index.tsx`, toggle bằng nút ở ActivityBar hoặc Ctrl/Cmd+B): bật thì panel thu thành rail 44px (icon expand ở trên cùng, danh sách icon tab xếp dọc bên dưới), hover vào panel thì mở, rời đi thì đóng lại (delay 300ms); tắt thì luôn mở dù không hover. Không còn tự bật theo Design tab.
- Design component trong Workspace (`ContentPanel/Workspace/Design.tsx`) gộp DesignCanvas + DesignViewer thành 1 file duy nhất, nhận `designId` từ `panel.content`.
- DesignModal có 2 platform: `website` (desktop) và `mobile`. Template tách thành 2 folder: `template/website/` và `template/mobile/`. Graph khác nhau: website layout ngang, mobile layout dọc. Mobile template có UI tối ưu cho touch (spacing lớn hơn, text nhỏ hơn).
- Event `workspace:open-design` (detail: `{ designId }`) trigger mở/focus design panel trong Workspace.

## Prompt capabilities (per system prompt)

- Mỗi `prompts/<name>/config.ts` export `CAPABILITIES: ZenModuleCapabilities` — nguồn sự thật cho toolbar và build prompt của prompt đó.
- `promptLength` / `styleCode`: `false` hoặc bỏ trống = tắt; `true` = bộ mặc định; `{ options: [...], default }` = tập riêng (1 phần tử = cố định, UI ẩn selector). Giá trị chọn được chuẩn hoá bằng `resolvePromptLength` / `resolveStyleCode` trong `ModuleRegistry.ts` (dùng ở `PromptBuilder` và `MessageInput`), không so sánh trực tiếp state settings.
- Với prompt `code`, `config.ts` chứa luôn `SystemPromptMode`, `MODE_BEHAVIORS` (sub-config của styleCode) và `MAX_READ_LINES_PER_TURN`; `styleCode.options` lấy từ `Object.keys(MODE_BEHAVIORS)`. File `code-style.ts` đã bị xoá.
- `toolFormats`: cần ≥ 1 phần tử (bỏ trống = `['xml', 'json']`), không có cờ `toolFormat`; 1 phần tử thì UI ẩn toggle.
- `features: { commitMessage?: boolean }`: nhóm các feature riêng của prompt; chưa có nơi nào đọc `features.commitMessage`.

## Tool format parser architecture

- **Module structure**: `src/renderer/src/components/Widgets/Zen/feature/Chat/services/tool-formats/` contains 3 self-contained format files + registry:
  - `XMLFormat.ts` (444 lines) — XML tag scanner + serializer
  - `JSONFormat.ts` (320 lines) — JSON fenced block scanner + normalizer
  - `DSMLFormat.ts` (127 lines) — DSML calls block parser + foreign converter
  - `index.ts` (68 lines) — central registry
  - `types.ts` (29 lines) — `ToolFormatDefinition` interface
- **Format definition**: Each `<Format>.ts` file exports a `ToolFormatDefinition` with:
  - `id`, `label`, `description`, `colorVar` — metadata
  - `normalize?: (content) => string` — pre-process before parsing (e.g. `wrapBareJsonObjects` for JSON)
  - `parse?: (content, base, feature?) => ParsedResponse` — main parser logic (embedded in same file)
  - `serializeCall?: (call) => string` — tool call → format string (for foreign conversion)
  - `detectForeign?: (content) => boolean` — detect this format in content
  - `convertForeign?: (content, serialize) => ForeignConversion` — convert to target format
  - `foreignNotice?: string` — warning message when foreign format detected
- **Parser scope**: Format parsers (`XMLFormat.ts`, `JSONFormat.ts`, `DSMLFormat.ts`) handle **format-level parsing** (XML tags, JSON fences, DSML blocks). They delegate **content parsing** to:
  - `services/parsers/` — UI/display tag content (conversation_title, markdown, question, thinking)
  - `modules/Code/parsers/` — Tool-specific params (read_file, write_to_file, grep, etc.)
- **ResponseParser.ts** (144 lines) — thin dispatcher: `getToolFormat(id).parse(content, base, feature)` — NO inline parsing logic.
- **Foreign format conversion**: `convertForeignToolCalls(content, targetFormat)` from registry handles DSML → XML/JSON uniformly, NOT per-provider hardcoded logic.
- **System prompt integration**: System prompts in `src/renderer/src/modules/Code/prompts/` declare supported formats via `config.ts` → `CAPABILITIES.toolFormats` (default `['xml', 'json']`). Workflow agents may support only a subset (e.g. orchestrator/planner/executor/reviewer/tester support `['xml', 'json']`, main `code` prompt supports all three `['xml', 'json', 'dsml']`).
- **UI integration**: `ModuleRegistry.ts` exposes `getPromptCapabilities(moduleId, promptId?)` to query which formats a given prompt supports; UI uses this to populate the tool-format dropdown per active system prompt.
- **Adding a new format**: (1) Create `<Format>.ts` file with `parse(content, base, feature?)` function embedded. (2) Export `ToolFormatDefinition` with `parse`, `normalize`, `serializeCall`, etc. (3) Add to registry in `index.ts`. (4) Update `TOOL_FORMAT_IDS` in `types.ts`. NO changes to `ResponseParser.ts` needed.

## FileExplore scope filter

- Tooltip hover file/folder đã bị xóa hoàn toàn (không còn `FileHoverTooltip.tsx`).
- Filter scope: `stores/useScopeStatsStore.ts` (`stats` primary/warn/error + `filter` theo project), `ScopeFilterButton` ở toolbar (đang lọc thì chỉ hiện dot viền dashed, click để hủy), `TreeNodeGate` ẩn node không khớp filter. UI FileExplore dùng tiếng Anh.

## TaskManager

- `ContentPanel/TaskManager` chỉ còn layout Table (`table/TaskTable.tsx`, menu chuột phải: Edit/Move to/Archive/Delete); Kanban, Timeline và drag-drop đã bị xóa. `statusMeta.ts` giữ `STATUS_META` dùng chung, `taskDrag.ts` giữ `TASK_DRAG_TYPE` (SessionCard kéo session thành task).

## Zen feature panel layout

- Nội dung các panel Zen (Home, Chat, Account) giới hạn `maxWidth: 680px` và căn giữa (`margin: 0 auto`). Account áp dụng cho action bar, tiêu đề danh sách, `DrawerBody` và header qua prop `maxWidth` của `NavPanelHeader`. Panel mới nên dùng cùng giá trị 680.

## Skills (toàn cục)

- Skill lưu toàn cục ở `~/.phantoma/skills/{slug}/` (SKILL.md + `{slug}.json`), state group/toggle ở `~/.phantoma/skill-workspace-state.json` — dùng chung mọi module, không theo project. Logic ở `src/main/storage/SkillStorage.ts` + `src/main/services/skill-marketplace.ts`, IPC `skill:*` ở `src/main/ipc/skill.handlers.ts`.
- UI/hook/service nằm ở `components/Widgets/Zen/feature/Marketplace` (`SkillPanel`); tab Skills của module Code (`ActivityPanel/Skill`) chỉ bọc lại `SkillPanel`.

## UITest module

- `modules/UITest/` là trang test component `components/ui` (module id `'uitest'`, đăng ký ở `PhantomModule`, `ViewContainer.tsx`, quickNav trong `MainLayout.tsx`): sidebar + nội dung demo từng component. Demo nằm ở `sections/{Basic,Feedback,Dropdown,Data}.tsx`, helper `Section`/`Demo` ở `shared.tsx`. Thêm component UI mới thì thêm demo vào `ITEMS` ở `index.tsx`.
- Class Tailwind không có trong `tailwind.config.js` (vd `bg-background-strong`, `text-text-tertiary`, `border-hover`, `bg-muted`, `bg-secondary`, `text-foreground`) là lỗi style; `ResizableSplit` dùng đơn vị `%` cho `initialSize/minSize/maxSize`.

## Profile module

- `modules/Profile/` là fake UI + mock data (chưa nối IPC/store): `Profile.tsx` chỉ ghép layout; `types.ts`, `mock/mockData.ts` (seed cố định), `utils/{query,filter,security,format}.ts`, `components/` (SourceSwitcher, FilterBar, QueryBuilder, StatsBar, ProfileTable, ProfileDetail, `detail/*Tab.tsx`).
- Truy vấn nâng cao dùng parser SQL-like tự viết ở `utils/query.ts` (`compileQuery`; trường khai báo trong `QUERY_FIELDS`/`GETTERS`); điểm bảo mật tính ở `utils/security.ts`. lucide-react bản đang dùng KHÔNG có icon `Chrome`.
- Profile: cột phải `aside` luôn hiện (border-l) trong `Profile.tsx`, chứa `ProfileDetail` hoặc `QueryDrawer` (query builder dạng form, helper ở `utils/queryBuilder.ts` sinh text cho `compileQuery`); `QueryBuilder.tsx` cũ đã xóa; toolbar (saved queries dropdown, Sync, More→Import, Add profile) ở `ProfileToolbar.tsx` đặt cạnh searchbar; group lọc bằng dropdown GroupCard trong `FilterBar`.
- Profile KHÔNG có category/tags (chỉ có `group`); source có `browsers: BrowserEngine[]` (chrome/chromium) hiển thị bằng dot trong badge số của `SourceSwitcher`; 3 nút Import/Sync/Add profile truyền qua prop `actions` của `SourceSwitcher`; bulk action là overlay dashed `border-primary` ở dưới giữa table (trong `Profile.tsx`); `ProfileTable` có sort theo cột và menu chuột phải (`Dropdown` strategy fixed + `position`), không còn nút 3 chấm.
- Profile dialogs ở `modules/Profile/components/dialogs/` (`SourceModal`, `ProfileModal`, `ImportModal` + tiện ích form chung `FormBits.tsx`): render có điều kiện từ `Profile.tsx` (state `dialog`), `Profile.tsx` giữ `profiles`/`sources` trong state (khởi tạo từ mock). Import có 3 cách: folder (mỗi sub-folder đặt tên theo email), CSV/TSV, paste text. Drawer chi tiết dùng `utils/totp.ts` (`useTotp`, mã TOTP sống bằng WebCrypto) và `detail/CopyButton.tsx`. Avatar bo góc theo tỉ lệ size (không còn tròn).
- ProfileDetail nhận `source` (lấy từ `sources` trong `Profile.tsx`): nút Open/Sync dựa theo `source.browsers` (1 browser → nút đơn, nhiều → dropdown, rỗng → nhãn chung), KHÔNG hardcode Chrome. Header có breadcrumb `Profiles / source / name`; copy bằng click vào text qua `detail/CopyText.tsx` (không dùng icon copy ở email/Credentials/`SecretField`); Overview dùng `detail/SecurityCard.tsx` + `detail/TotpCard.tsx` (sửa secret base32 ở local state của `OverviewTab`), badge group/purpose nằm đầu Overview, backup code mỗi ô một tone theo index.
- Style Profile: UI tiếng Anh, tránh lạm dụng `primary` cho badge/chip active (dùng `bg-text-secondary/10..15` + accent tone), style soft (`bg-primary/10`, tone `bg-<tone>/10 text-<tone>`), `rounded-md`, hạn chế outline (chỉ dùng `border-dashed` khi cần), không ghost. Màu tone dùng chung `TONE_CLASS`/`hashTone` ở `components/StatusBadge.tsx` (không lặp một màu primary); favicon dịch vụ/website qua `ServiceIcon` hoặc `Favicon` + `getFaviconUrl`; menu dùng `ui/Dropdown`, thông tin hover dùng `ui/Tooltip`.
- Tab Services: `ServiceDetail.tsx` hiển thị 2FA bằng `FieldView` (không có SectionCard/header riêng), `FieldView` truyền `onRemove`/`onAdd` vào `BackupCodeGrid` để hover hiện nút X giống Overview; section Custom fields dùng `tone="muted"` (không dùng primary) và không có `desc`.
- UI 2FA dùng chung của Overview và Services nằm ở `ProfileDrawer/common/`: `TOTP.tsx` (`TotpCard` đầy đủ: nhập secret, quét QR, dán clipboard; `TotpDisplay`, `TotpLive`), `BackupCode.tsx` (`BackupCodesCard`, `BackupCodeGrid`, `BackupItem`, `parseBackup`, `serializeBackup`, `backupTone`). Không import chéo giữa các `tab/*` (không còn `Overview/TotpCard.tsx`).
- ProfileDrawer có 5 tab: Overview, Services, Footprint (`tab/Footprint/`: timeline chỉ tạo mốc mới khi footprint đổi, mục Website tracking, `FootprintDetail` xem đầy đủ IP/location/device/platform/screen), History (`tab/History/`: search + chip lọc theo ngày + HistoryCard có giờ), Activity. Helper dùng chung ở `utils/footprint.ts`; `BrowsingEntry.footprintId` trỏ tới `NetworkFootprint.id`.
- `modules/Profile/components/modal/LaunchBrowserModal/` chia 3 panel: `BrowserPanel.tsx` (engine, 1 file), `ConfigPanel/` (proxy + footprint + lifecycle + header/footer), `DetailPanel/` (chi tiết proxy/fingerprint); `index.tsx` chỉ ghép layout. Phần không phải UI nằm ở `types/`, `utils/`, `hooks/` (`useLaunchConfig`, `useProxyPicker`, `useFootprintPicker`), `constants/`. Nền detail panel = nền panel giữa (`bg-background`), card trong detail dùng `bg-card-background`. Country filter của proxy là `CountryBadges` (sort theo số proxy, thừa thì gom vào dropdown "+N more", giới hạn `COUNTRY_BADGE_LIMIT`).

## Footprint service

- `src/renderer/src/services/fingerprint-generator.ts` là file duy nhất sinh footprint: types (`FootprintPreset`, `OsFamily`, `FingerprintSection`), `generateFootprints(ipInfo)`, `buildFingerprint(preset)`, `GEO`, `TZ_OFFSET`. File rất dài (~3000 dòng), đọc theo `start_line`/`end_line`, không đọc cả file. Không viết lại logic sinh footprint trong module Profile.

## Profile server

- Thư mục thực tế là `profile/` (không phải `profile-server/`). Quy ước: mỗi table một bộ `repositories/<table>.repository.ts` (chỉ SQL/mapper) → `services/<table>.service.ts` (validate, 404, nghiệp vụ) → `routes/<table>.routes.ts` (parse request, gọi service); `routes/routes.ts` chỉ ghép router (`registerRoutes`). Child của profile dùng `makeChildService` (`services/child.service.ts`) + `mountChild` (`routes/child.routes.ts`). Repository không gọi service; `profile-store.ts`/`activity-store.ts`/`service-email-store.ts` đã bị xoá.
- Đã đổi tên 'profile' → 'email' trong `profile/src`: bảng main db `emails` (cột con `email_id`, schema v5 tự migrate từ `profiles`/`profile_id`), `repositories/email.repository.ts` + `repositories/service_email.repository.ts` (+ `service.repository.ts` giữ sources/services/children), `services/email.service.ts`, `routes/email.route.ts`, `cache/email.cache.ts`. URL API vẫn là `/profiles/...` (renderer chưa đổi).
- Mỗi email có `<profile dir>/vault.sql` (helper `database/vault.ts`) gồm 2 bảng `emails` (recovery_email, phone, totp_enabled, `totp`, backup_codes) và `service_emails`; vault cũ (`profile`/`service_email`/`services.db`) tự migrate khi mở. Vault `emails` chỉ được ghi khi renderer gọi `PUT /profiles/:id` (Overview TOTP gọi qua `profileApi.profiles.update`).

- `profile-server/` (Express + better-sqlite3, không Kysely): API `/api/v1`, envelope `{ success, data | error }`. Cấu trúc: `config/server.config.ts` (env `PROFILE_PORT`, fallback 3033; `PROFILE_DATA_DIR` mặc định `~/.phantoma/profile`), `database/connection.ts` (schema nhúng sẵn, version qua `PRAGMA user_version` — đổi schema thì tăng `SCHEMA_VERSION`), `domain/mappers.ts` (row snake_case → type camelCase của `modules/Profile/types`, thời gian trả ISO), `repositories/` (`sql.ts` helper + `makeChildStore`, `profile-store.ts`, `activity-store.ts`), `services/browser-folder.service.ts` (thư mục chrome/chromium của profile, đọc cookie/history/login bằng cách copy file ra tmp), `routes/routes.ts` (CRUD) và `routes/browser.routes.ts` (thư mục browser, mật khẩu, fingerprint history).
- Dữ liệu lưu ở `~/.phantoma/profile/` (xem STORAGE.md mục 6): `profile.sql` + `profiles/{profileId}/{chrome,chromium}` + `passwords.db`/`fp-ip-history.db` dùng chung ở cấp base.
- Type-check: `cd profile-server && npx tsc --noEmit`. Build/spawn giống emulate: `node scripts/build-server.js profile-server`; main spawn on-demand qua IPC `runtime:start-profile` (`startProfileServer`), dev chạy ngoài.

- Import source: `SourceModal` có toggle Create new / Import existing (chỉ khi tạo mới, edit không có); import gọi `profileApi.sources.import` → `POST /sources/import` (`sourceService.importExisting`: dùng nguyên folder làm source, sync Chrome profile, dựng lại backup), handler `importSource` ở `Profile.tsx`.
- Backup chỉ ghi: `profile/src/database/backup.ts` + `services/backup.service.ts` ghi `<dataDir>/backup/<sourceName>.sql` (bảng `emails`, `service_emails` kèm `email_id`). Hook `syncEmailBackup`/`dropEmailBackup` nằm ở tầng service (`email.service.ts`, `service_email.service.ts`), đổi tên/xóa source xử lý ở `source.service.ts`; đường đọc không dùng file này. Lỗi tsc có sẵn ở `email.repository.ts` (email lặp) và import `mapBrowsing/mapDevice/mapFootprint/mapScript` thiếu trong `service.repository.ts`.

## Proxy server VPN providers

- `proxy/src/services/vpn.service.ts` chạy 3 nguồn VPN-to-proxy (`warp` = temp/cloudflare-warp, `foxhole` = temp/foxhole-vpn, `proton` = temp/protonvpn-proxy qua wireproxy) dưới dạng child process SOCKS5 trên 127.0.0.1, rồi tự tạo source + proxy tương ứng; route ở `routes/vpn.route.ts` (`GET /vpn`, `GET /vpn/:id`, `POST /vpn/:id/start|stop`). Binary lấy từ PATH hoặc env `PROXY_WARP_BIN`, `PROXY_FOXHOLE_BIN`, `PROXY_WIREPROXY_BIN`; dữ liệu VPN ở `<dataDir>/vpn/<id>/`.
- VPN account: bảng `vpn_accounts` (schema v2, `repositories/vpn-account.repository.ts`), mỗi account có 1 row `sources` ẩn cùng id (không hiện ở `GET /sources`) để proxy giữ FK; credential lưu JSON, secret không trả về client (chỉ `secretsSet`). API `/vpn/providers`, `/vpn/accounts` (CRUD) + `/:id/activate|start|stop`; phải activate trước khi start.
- Type-check: `cd proxy && npx tsc --noEmit`.
- Bảng `accounts` (schema v3, `repositories/account.repository.ts`): mỗi login Mozilla của Foxhole là 1 row (uid, email, session_token, profile_id, user_data_dir, profile_directory) thuộc về `source_id` = row `vpn_accounts` của provider foxhole; `activate` upsert theo `(source_id, uid)`, `start` nhận `accountId` để chọn account; renderer KHÔNG tạo vpn account mới cho mỗi lần login (`createFoxhole` dùng lại source đang chọn).
- `foxholeBin` mặc định tự dò `temp/foxhole-vpn/dist/cli.js` (cần build: `cd temp/foxhole-vpn && npm install && npm run build`), không có thì fallback `foxhole` trên PATH hoặc env `PROXY_FOXHOLE_BIN`. Đăng nhập Mozilla bằng Google đi qua `/v1/linked_account/login` (`fxa-cdp.service.ts`); cleanup Chrome phải kill cả process group trước khi xóa thư mục tạm.
- Renderer `modules/Proxy` gọi API thật qua `services/proxy-api.service.ts` (base URL từ `getPorts().proxy`, fallback `DEFAULT_PROXY_PORT=3044` trong `config/ports.ts`); không còn mockData. Source kiểu `vpn` (provider warp/foxhole/proton) có nút Start/Stop gọi `/vpn/:id/start|stop`. Main chưa spawn proxy server khi build (`RuntimePorts.proxy` optional).

## Setting Backup

- `modules/Setting/components/Backup/index.tsx` backup thư mục `~/.phantoma` lên repo GitHub private của user; main handler ở `src/main/ipc/backup.handlers.ts` (`backup:status|enable|list-dir|set-ignore|push`, đăng ký `setupBackupHandlers` ở `main/index.ts`). `git add .` / `git commit` dùng lại `git:stage-all` / `git:commit` với projectPath = `~/.phantoma`; set/unset `.gitignore` theo từng path dạng `/rel/path`.

## Setting module UI

- `modules/Setting/` không còn searchbar/breadcrumb: sidebar rộng `w-72` có hero (`phantoma-logo.png` qua `window.__zenImagesUri || '/images'`). Mỗi tab có tone riêng trong `TAB_TONE` (`nav.ts`), truyền qua `TabToneContext` (`components/shared`) cho `PageHeader`/`Section`/`Toggle`/`Segmented`; không dùng mỗi `primary`.
- `tailwind.config.js` đã có thêm màu accent `blue/green/red/yellow/purple/pink/navy/teal/violet` (CSS var do `ThemeProvider` set); `Tone` trong `shared` gồm cả các màu này (`TONE/BAR/TEXT/BORDER/GLOW`).
- Interface: `ThemeCard.tsx` (card mới), `fakeThemes.ts` (theme preview giả, không persist qua reload), `FontPicker.tsx` (lưới font + sample text). Backup: `index.tsx` (status, sync theo bước) + `FileTree.tsx` (cây ignore + tab Ignored). SqlViewer: 3 panel `index.tsx` (file) / `TablesPanel.tsx` / `DataPanel.tsx`.

## Widgets folder

- `components/Widgets/` (trước đây là `RightPanel`) chỉ là folder chứa module UI (`Zen/`, `AgentTools/`), KHÔNG còn `index.tsx`. Mỗi module tự dựng panel riêng: Recon dùng `modules/Recon/components/ReconPanel` (tabBar Zen/Agent Tools, tab lưu theo target trong `stores/useReconPanelStore.ts`), Emulate dùng `modules/Emulate/components/EmulatePanel`; `MainLayout.tsx` render theo `activeModule`.

## Task & Workflow

- Task lưu ở `~/.phantoma/code:{slug}/tasks.json` (`src/main/storage/TaskStorage.ts`); workflow của task là file `workflows/workflow_{taskId}.md` (`src/main/storage/WorkflowStorage.ts`, IPC `workflow:get|create|update` ở `src/main/ipc/workflow.handlers.ts`), field `workflowId` trên task.
- Orchestrator có 8 tool task/workflow (`list_tasks`, `get_task`, `create_task`, `update_task`, `assign_task`, `create_workflow`, `get_workflow`, `update_workflow`): mỗi tool có đủ 1 parser (`parsers/<Name>Parser.ts`), 1 executor (`executors/<Name>Executor.ts`), 1 renderer (`renderers/<Name>Renderer.tsx`) — dùng chung `parsers/TaskToolParserUtils.ts`, `executors/TaskToolUtils.ts`, `renderers/TaskToolRendererBase.tsx`; đăng ký ở `CodeModule.ts` và `constants/tag-registry.ts`; prompt ở `prompts/multi-agent/orchestrator/tools-reference.ts`.
- UI Workflow nằm ở `components/ContentPanel/Workflow` (đã chuyển khỏi `Workspace/Workflow`).

## Multi-window & target lock

- `src/main/core/window/WindowManager.ts` tạo nhiều BrowserWindow (Ctrl/Cmd+Shift+N). `src/main/ipc/target-lock.handlers.ts` giữ claims (windowId → module → targetId), IPC `target:claim` / `target:get-state` / `target:force-release`, broadcast `target:claims-changed`.
- Renderer dùng `shared/target-lock/useTargetLock.ts`: `useTargetLock(module, targetId, onForceRelease)`, `useBusyTargetIds(module)`, `forceReleaseTarget(module, targetId)`. Module Code dùng module key `'code'`, target = branch của project chứa session đang active, id `${projectId}::${branchName}` (helper `toBranchTargetId` / `fromBranchTargetId` export từ `ProjectConflictModal.tsx`); xung đột hiển thị qua `ProjectConflictModal` (không đóng được, UI tiếng Anh, 3 view: main → danh sách project → danh sách branch) và badge `busyElsewhere` (cấp project) trên `ProjectCard`.

## Runtime servers & ports

- 3 server con: `server/` (shell backend, chỉ `/health`), `emulate/` (Emulate service) và `profile-server/` (backend module Profile).
- Port source of truth: `src/renderer/src/config/ports.ts` (`DEFAULT_SERVER_PORT=8080`, `DEFAULT_EMULATE_PORT=3002`, `DEFAULT_PROFILE_PORT=3033`; import qua `@renderer/config/ports`, main import tương đối `../../renderer/src/config/ports`). KHÔNG hardcode port ở bất kỳ đâu khác.
- Dev (`npm run dev`): KHÔNG nhúng, KHÔNG spawn. Server chạy ngoài, renderer dùng `DEV_PORTS`.
- Build (`electron-builder`): `src/main/services/server-spawner.ts` fork server con qua `utilityProcess.fork`, port trống ngẫu nhiên, truyền `PORT`/`EMULATE_PORT` qua env. Renderer lấy port qua IPC `runtime:get-ports`.
- **Shell server** spawn ngay khi app ready (`startShellServer`).
- **Emulate server** spawn ON-DEMAND khi renderer vào module Emulate (`startEmulateServer` qua IPC `runtime:start-emulate`, idempotent). `Emulate.tsx` mount → `startEmulate()` → `refreshEmulateBaseFromIpc()` → mới cài WS bridge.
- `server/src/config/server.config.ts` và `emulate/src/config/server.config.ts` có fallback port (server=8080, emulate=3002, khớp `src/shared/ports.ts`), KHÔNG cần file `.env`; build thì parent process ghi đè qua env `PORT`/`EMULATE_PORT`.
- Build pipeline: `npm run build` = `scripts/build-interactive.js` (menu chọn target tương tác). Nếu `server/dist` + `emulate/dist` đã tồn tại, script hỏi **dùng lại hay build lại**; chưa có thì build luôn không hỏi. Sau đó `electron-vite build` → `electron-builder` → `scripts/copy-artifacts.js`. KHÔNG còn `build:win/mac/linux`, `build:select`, `copy-artifacts`, `typecheck:node`, `typecheck:web` là lệnh riêng.
- `electron-builder.yml` output = `release-build/v${version}` (staging, gitignored). Sau build, `scripts/copy-artifacts.js` copy CHỈ artifact upload được (`.AppImage/.deb/.rpm/.exe/.dmg/.zip/...` + `latest-*.yml` + `builder-effective-config.yaml`) sang `release/v${version}`. `*-unpacked/`, `builder-debug.yml`, `log.log` bị bỏ. `release/v${version}` chỉ chứa file cần cho GitHub Release.
- Build server/emulate chỉ ra `server/dist/` và `emulate/dist/` (không version, không folder release riêng — đây là backend phụ trợ, không phát hành độc lập). Script: `scripts/build-server.js <server|emulate>` chỉ chạy `npm run build` trong folder đó.
- `electron-builder.yml` extraResources copy `server/{dist,package.json,node_modules}`, `emulate/{dist,package.json,node_modules}`, và `images/` vào `resources/`. `server-spawner.ts` fork `resources/<name>/dist/index.js`. Window icon = `images/phantoma-logo.png` (dev: `app.getAppPath()`, build: `process.resourcesPath`).
- Settings General KHÔNG còn URL input / Database Path — chỉ hiển thị read-only port (server + emulate). Endpoint `/api/v1/database/path` đã bị xóa khỏi emulate; `services/database.service.ts` đã bị xóa.

## Opencode run (v1 / v2)

- `agent-tool-opencode-run.ts` có 2 nhánh theo `OpencodeServer.protocol` (do `startOpencodeServer` trong `agent-tool.handlers.ts` detect): `runOpencodeV1` (`/session`, `/event`, `prompt_async`) và `runOpencodeV2` (`/api/session`, `/api/event`, `/api/session/{id}/prompt|interrupt|permission/{reqId}/reply`). Binary opencode 2.x KHÔNG có route v1 (POST /session trả 405).
- v2: event SSE có dạng `{type, data}` với `session.text.delta`, `session.reasoning.delta`, `session.tool.input.started|called|success|failed`, `session.execution.succeeded`; tool shell tên `shell`, read dùng `input.path`.
- Spec đầy đủ: chạy `opencode serve` rồi GET `/openapi.json`.

## Run & Debug (js-debug)

- Store: `modules/Code/stores/useDebugStore.ts` (Zustand, DAP client). IPC main: `src/main/ipc/debug.handlers.ts` (`debug:run-task`, `debug:spawn`, `debug:launch-adapter`...).
- Mọi config gửi cho js-debug phải kèm `__workspaceFolder` (= project root), nếu không js-debug báo "Unable to resolve ${workspaceFolder}" và Extension Host bị `--inspect-brk-extensions` giữ lại.
- `launchVSCode` (extensionHost) spawn ngầm qua `debug:spawn`, KHÔNG mở terminal; js-debug tự attach qua reverse request `startDebugging`.
- `preLaunchTask` chạy ở main (`debug:run-task`, đọc `.vscode/tasks.json` hoặc tự nhận `npm: <script>`), output tee ra `/tmp/phantoma-task-*.log` và hiển thị bằng terminal tab `tail -f`.
- Env của task/Host phải bỏ `ELECTRON_*`, `VSCODE_*`, `NODE_ENV`, `NODE_OPTIONS` (rò từ Electron dev làm webpack build bản development).

## Ctrl+Click Go to Definition (không dùng LSP)

- `components/common/definition-navigation.ts`: `registerDefinitionProvider` (ts/js) tự phân tích `import/export ... from` trong model, resolve đường dẫn tương đối + alias từ `paths` của tsconfig (đọc qua `fs:read-dir`, KHÔNG dùng `fs:stat` để dò file vì main log lỗi khi file không tồn tại), tìm khai báo symbol bằng regex và đi theo re-export.
- `CodeBlock.tsx` gọi `registerModelFile(model, filePath)` (model không có URI file, nên cần map `model.uri → filePath`) và `setupDefinitionNavigation()` khi tạo editor.
- Monaco ưu tiên kết quả TS worker (trỏ về dòng import cùng model), nên `registerEditorOpener` thay bằng kết quả provider rồi mở tab qua `useCodeStore.requestOpenFile(..., { line, column })`.

## Test bản packaged (không cần nén AppImage)

- `npm run test:build` — build nhanh (server + emulate `npm run build` → `electron-vite build` → `electron-builder --linux dir`) rồi chạy binary từ `release-build/v<latest>/linux-unpacked/phantoma`. Dùng khi cần xác nhận spawn server / port random / logo.
- `npm run test:latest` — chỉ chạy bản build gần nhất trong `release-build/` (tự tìm version cao nhất), KHÔNG build lại.
- Cả 2 đều tự `delete ELECTRON_RUN_AS_NODE` — shell môi trường của dev có set biến này (`ELECTRON_RUN_AS_NODE=1`) khiến binary chạy như Node thay vì mở app.
- Không cần nén AppImage cho việc test logic — chỉ nén khi thực sự phát hành.

## Code server (`code/`)

- `utils/guard.ts` có `safePath(value, field, { write?, withinProject? })`: chặn file nhạy cảm (`.env`, `.pem`, `id_rsa`...), ghi vào `/etc /usr /sbin /boot /sys /proc`, và path ngoài worktree đã đăng ký. Mọi route fs/git mới phải đi qua nó.
- `services/git-runner.ts` là helper git async duy nhất (`runGit(args, cwd)` không throw, `gitText(cwd, args)` throw), đã set `GIT_CEILING_DIRECTORIES`. Không dùng `execFileSync`.
- `fs.service.ts` dùng `fs.promises`; `writeFile` tự `mkdir -p` thư mục cha. `GET /git/status` trả `{ files, output, diffStats, unpushedCommits, committedFiles, branch }`.
- `codeApi.fs.readDir` là adapter trả `{ name, type, size }` cho nơi gọi cũ của IPC `fs:read-dir`.
- `POST /fs/grep` (`fsReadService.grep`, body `searchTerm/filePath/folderPath/maxFiles/maxFileSize/exclude`) và `GET /fs/read-file?start=&end=` (0-based, end inclusive) là nơi `GrepHandler`/`ReadFileHandler` gọi qua `codeApi.fs.grep|readFile`; `ListFilesHandler` dùng `codeApi.fs.tree`.
- PR (gh CLI) nằm ở `services/pr.service.ts` + `routes/pr.route.ts` (`/pr/status|list|login-token|login-web|login-web/cancel`, `/pr/:number[/diff|merge|close|reopen|ready|comment|review]`, `POST /pr` tạo PR; body/query dùng `root`); renderer gọi qua `codeApi.pr.*`, riêng `pr:open-external` vẫn là IPC.
- Git ghi nằm ở `services/git-write.service.ts` (`gitWriteService`, `resolveDefaultBranch` dùng chung với `git-remote.service.ts`): `POST /git/checkout|commit|stage|stage-all|unstage|unstage-all|prune-orphan-branches|clone|protect-enable|protect-disable`, `GET /git/protect-status|check-ready`; body dùng `root`. `Setting/Backup` vẫn gọi IPC `git:stage-all|commit` vì `~/.phantoma` không nằm trong worktree đã đăng ký (`withinProject` sẽ chặn).

## Module registry

- **Single source of truth**: `src/renderer/src/config/module-registry.tsx` là nơi DUY NHẤT khai báo modules. Thêm/xóa module CHỈ cần sửa file này, tất cả file khác (ViewContainer, QuickNavModal, MainLayout) tự động cập nhật.
- Mỗi module có `ModuleDefinition`: id, title, description, icon (lucide-react), component (lazy import), color, showInQuickNav, showInActivityBar.
- Helper functions: `getModuleById`, `getModulesForQuickNav`, `getModulesForActivityBar`, `getAllModuleIds`, `getDefaultModuleId`.
- Lazy loading: tất cả module dùng `lazy()` để code splitting, render bọc trong `<Suspense>` với fallback loading.
- Xem chi tiết: `src/renderer/src/config/README.md`.

## Dev environment tips

- Mọi lệnh git ở main (`runGit` trong `src/main/ipc/git.handlers.ts`, `runGitArgs` trong `src/main/ipc/workspace.handlers.ts`) phải set env `GIT_CEILING_DIRECTORIES` = thư mục cha của cwd, nếu không project con nằm trong repo khác (vd `temp/HelloWorld` trong Phantoma) sẽ bị git tự tìm `.git` của repo cha.
- `useCodeStore` (persist key `code-store`) KHÔNG persist `currentProjectId` (`partialize` set `null`): vào module Code chưa chọn project thì không quét/refresh tree; chỉ quét khi user chọn project.
- Main type-check: `npx tsc --noEmit -p tsconfig.node.json --composite false`.
- Renderer type-check: `npx tsc --noEmit -p tsconfig.web.json` (a pre-existing error in `RunCommandExecutor.ts` — unused `spawnResult` — is unrelated).
- `tsconfig.web.json` không kế thừa `tsconfig.base.json`: phải tự khai báo path `@app/*` → `src/shared/*` và include `src/shared/**/*`.
- AgentWorkflow agents keep model + account in `modules/Code/hooks/useWorkflowStore.ts`; a Zen tab with `workflowAgentId` syncs to it through `WorkflowAgentContext` (read by `useModelAccount`).
- Zen `TagRouter` must not import module renderers directly: renderers come from `ModuleRegistry` (`getModuleRenderers()`, declared in each module's module file (e.g. `CodeModule.ts`) via `renderers`). TagRouter passes the same full props set to every renderer; each renderer picks what it needs.
- Unsaved changes are app-scoped: a module registers a provider via `registerUnsavedProvider` (`shared/unsaved/unsavedRegistry.ts`, e.g. `modules/Code/services/unsaved.service.ts`); `shared/unsaved/UnsavedGuard.tsx` (mounted in `App.tsx`) owns the reload shortcut/beforeunload guard and renders `components/UnsavedChangesModal.tsx`. Do not add per-module reload modals.
- `fs:watch-dir` / `fs:unwatch-dir` (`src/main/ipc/fs.handlers.ts`) dùng ref-count theo `projectPath`: mỗi `watch-dir` phải có đúng 1 `unwatch-dir` ở cleanup (FileExplore, Debug...), watcher chỉ đóng khi về 0.
- Mở terminal tab từ ngoài Workspace: `window.dispatchEvent(new CustomEvent('phantoma:open-terminal-panel', { detail: { sessionId, title, cwd, command } }))` (listener ở `ContentPanel/Workspace/index.tsx`, lệnh chạy qua `WorkspacePanel.initialCommand`). Debug dùng nó cho DAP `runInTerminal`.
- Module Code: chỉ `modules/Code/handler/**` được gọi IPC (`window.api`). `executors/` không đụng `window.api` trực tiếp mà gọi qua handler (vd `TerminalIpc` trong `handler/terminal/TerminalHandlers.ts`, `MoveFileHandler` trong `handler/tool`).