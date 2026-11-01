# AGENTS.md

## UI conventions

- Modal footer confirm action (e.g. Create group) uses `variant="soft"` from `@renderer/components/ui/Button` in every state (default, hover, disabled). Do not use `solid` or `outline` for it.
- Modal footer Cancel button must NOT use the `variant` prop. Style it only via `className` with the soft look and secondary text: `bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background`.

## Prompt capabilities (per system prompt)

- Mỗi `prompts/<name>/config.ts` export `CAPABILITIES: ZenModuleCapabilities` — nguồn sự thật cho toolbar và build prompt của prompt đó.
- `promptLength` / `styleCode`: `false` hoặc bỏ trống = tắt; `true` = bộ mặc định; `{ options: [...], default }` = tập riêng (1 phần tử = cố định, UI ẩn selector). Giá trị chọn được chuẩn hoá bằng `resolvePromptLength` / `resolveStyleCode` trong `ModuleRegistry.ts` (dùng ở `PromptBuilder` và `MessageInput`), không so sánh trực tiếp state settings.
- Với prompt `code`, `config.ts` chứa luôn `SystemPromptMode`, `MODE_BEHAVIORS` (sub-config của styleCode) và `MAX_READ_LINES_PER_TURN`; `styleCode.options` lấy từ `Object.keys(MODE_BEHAVIORS)`. File `code-style.ts` đã bị xoá.
- `toolFormats`: cần ≥ 1 phần tử (bỏ trống = `['xml', 'json']`), không có cờ `toolFormat`; 1 phần tử thì UI ẩn toggle.
- `features: { commitMessage?: boolean }`: nhóm các feature riêng của prompt; chưa có nơi nào đọc `features.commitMessage`.

## Tool format parser architecture

- **Module structure**: `src/renderer/src/components/RightPanel/Zen/feature/Chat/services/tool-formats/` contains 3 self-contained format files + registry:
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

## Runtime servers & ports

- 2 server con: `server/` (shell backend, chỉ `/health`) và `emulate/` (Emulate service).
- Port source of truth: `src/shared/ports.ts` (`DEFAULT_SERVER_PORT=8080`, `DEFAULT_EMULATE_PORT=3002`). KHÔNG hardcode port ở bất kỳ đâu khác.
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

## Test bản packaged (không cần nén AppImage)

- `npm run test:build` — build nhanh (server + emulate `npm run build` → `electron-vite build` → `electron-builder --linux dir`) rồi chạy binary từ `release-build/v<latest>/linux-unpacked/phantoma`. Dùng khi cần xác nhận spawn server / port random / logo.
- `npm run test:latest` — chỉ chạy bản build gần nhất trong `release-build/` (tự tìm version cao nhất), KHÔNG build lại.
- Cả 2 đều tự `delete ELECTRON_RUN_AS_NODE` — shell môi trường của dev có set biến này (`ELECTRON_RUN_AS_NODE=1`) khiến binary chạy như Node thay vì mở app.
- Không cần nén AppImage cho việc test logic — chỉ nén khi thực sự phát hành.

## Dev environment tips

- Renderer type-check: `npx tsc --noEmit -p tsconfig.web.json` (a pre-existing error in `RunCommandExecutor.ts` — unused `spawnResult` — is unrelated).
- `tsconfig.web.json` không kế thừa `tsconfig.base.json`: phải tự khai báo path `@app/*` → `src/shared/*` và include `src/shared/**/*`.
- AgentWorkflow agents keep model + account in `modules/Code/hooks/useWorkflowStore.ts`; a Zen tab with `workflowAgentId` syncs to it through `WorkflowAgentContext` (read by `useModelAccount`).
- Zen `TagRouter` must not import module renderers directly: renderers come from `ModuleRegistry` (`getModuleRenderers()`, declared in each module's module file (e.g. `CodeModule.ts`) via `renderers`). TagRouter passes the same full props set to every renderer; each renderer picks what it needs.
- Unsaved changes are app-scoped: a module registers a provider via `registerUnsavedProvider` (`shared/unsaved/unsavedRegistry.ts`, e.g. `modules/Code/services/unsaved.service.ts`); `shared/unsaved/UnsavedGuard.tsx` (mounted in `App.tsx`) owns the reload shortcut/beforeunload guard and renders `components/UnsavedChangesModal.tsx`. Do not add per-module reload modals.