# Kế hoạch: đổi tên targets/Fuzzer và chuyển Repeater từ SQL sang JSON file

Trạng thái: CHƯA thực thi. Đã đọc server (`emulate/src`) và client (`src/renderer/src/modules/Emulate`). Bỏ qua thư mục `emulate/src copy/` (bản sao cũ, không dùng).

---

## 0. Hiện trạng đã xác nhận

### Server
- DB: `~/.phantoma/emulate/emulate.sql`, Kysely + better-sqlite3. `migration.runner.ts` dùng `PRAGMA user_version`, `LATEST_VERSION = 6`, chỉ chạy duy nhất `0001_initial_schema.sql` một lần (KHÔNG hỗ trợ migration tăng dần).
- 6 bảng: `emulate_targets`, `emulate_target_filters`, `emulate_repeater_requests`, `emulate_repeater_payloads`, `emulate_repeater_history`, `emulate_repeater_history_runs`.
- `paths.config.ts`: `getEmulateDataDir()` = `~/.phantoma/emulate`. `repeater-file.storage.ts` đã ghi `params.json`/`headers.json`/`body.json` vào `~/.phantoma/emulate/{targetId}/repeaters/repeater_{requestId}/` (SCHEMA.md ghi sai là `~/.phantoma/repeaters/...`). Report cũng lưu file theo `targetId`.
- Lớp: `repositories/repeater*.repository.ts` (5 file, `repeater.repository.ts` 443 dòng gộp tất cả) -> `services/emulate/repeater.service.ts` -> `api/controllers/repeater.controller.ts` -> `api/routes/repeater.routes.ts` -> mount tại `/api/v1/emulate-targets/:targetId/repeater/*`. DI ở `bootstrap/container.ts`.
- `domain/repeater/*` (8 file entity/input), `domain/index.ts`.
- `types/platform.type.ts`: `'web' | 'pc' | 'android' | 'cli'`. Dùng ở `capture-method.type.ts`, `capture-method.service.ts`, `constants/capture-methods.constant.ts`, `ebpf-capture.service.ts:81` (`platform !== 'pc'`).

### Client
- Tab id `repeater` (`constants/tools.ts`, label `Repeater`), `Emulate.tsx` dòng ~510, 768-774 (`addToRepeater`, `handleSendToRepeater`, `onSendToRepeater`).
- Folder `components/WorkspacePanel/Repeater/` (14 file, gồm `repeater.html` 4432 dòng chưa rõ còn dùng không), export `PayloadPanel`, `addToRepeater`, `removeFromRepeater`, `clearRepeater`...
- `hooks/useRepeaterPersistence.ts`, `types/repeater.types.ts`, `utils/repeater-resolver.util.ts`, event window `repeater-updated`.
- `services/emulate-api.service.ts`: `basePath()` = `/api/v1/emulate-targets/${id}/repeater`, các hàm listRequests/getRequest/createRequest/updateRequest/deleteRequest/listPayloads/upsertPayload/deletePayload/listHistoryByTarget/listHistoryByRequest/saveHistory/getHistoryRuns/deleteHistory; DTO ở `dto/emulate.dto.ts`.
- AI tool (prompts/parsers/executors/renderers): `list_repeaters`, `get_repeater_detail`, `run_repeater`, `send_to_repeater`, `delete_repeater`, `update_repeater_content` (+ `handler/UpdateRepeaterContentHandler.ts`). `RunRepeaterExecutor` đang lưu history vào `localStorage` (khác với DB, sẽ thống nhất khi chuyển sang file).
- Platform ở client: `constants/platforms.ts` (key `web|pc|android|cli`), `Emulate.tsx` (145, 191, 648, 819, 834), `emulate-api.service.ts` (251, 656), `TargetModal.tsx` (98, 292, 506, 659, 882, 1052), `TargetCard.tsx` (90-198), `TargetListPanel/index.tsx` (153, 217, 238, 514), `LaunchTargetModal/index.tsx` (125-127, 218-276), `TargetPanel.tsx` (105-222), `CliInfoPanel.tsx:63`.
- `src/main` không có tham chiếu `repeater`.

### Kết quả Phase 1 (đã đọc xong, ĐÃ CHỐT)

**Server**
- `repeater.repository.ts` là lưu HYBRID: metadata request (id, method, url, timestamps) ở SQL, còn `params`/`headers`/`body` ở file `{targetId}/repeaters/repeater_{id}/{params,headers,body}.json`. `params`/`headers` là CHUỖI JSON (mảng `{key,value,enabled}`), có thể là chuỗi rỗng `''` (createRequest ghi `input.params ?? ''`) -> khi export coi `''`/parse lỗi là `[]`. Dữ liệu `body` là text thô.
- `RepeaterPayload`: `payload_values` là chuỗi JSON, `enabled` là 0/1, unique `(request_id, name)`. History: `getHistoryByTargetID` dùng INNER JOIN nên history mồ côi (request đã xoá) KHÔNG bao giờ hiển thị -> migration BỎ QUA history mồ côi (không tạo `_orphaned`).
- Chuỗi JSON trong history/run: `statuses`, `request_headers`, `params`, `response_headers` đều là chuỗi JSON; `timestamp`/`end_time` là UNIX giây.
- `report-file.storage.ts` lưu `{targetId}/reports/report:{reportId}/{reportId}.md` -> giữ nguyên, chỉ đổi sang dùng `getTargetDir(targetId)`.
- `capture-methods.constant.ts`: `PLATFORM_CAPTURE_METHODS: Record<Platform, string[]>` có key `web|pc|android|cli`; `capture-method.type.ts` import `Platform`. Route `/capture-methods/:platform` phải chấp nhận cả giá trị mới (`website|application|terminal`) lẫn `android`.

**Client**
- `Repeater/repeater.html` KHÔNG được import ở đâu (grep 0 kết quả) -> XOÁ ở Phase 6.
- Không có state persist nào lưu `platform` hay `selectedTool` (không cần migrate localStorage cho 2 thứ này).
- localStorage còn liên quan: `RunRepeaterExecutor` (`repeater_history_${targetId}_${id}`, sẽ bỏ ở Phase 7), `PayloadValueModal` (`getStorageKey('files'|'scripts')`, kiểm tra tên key ở Phase 6, nếu chứa chữ repeater thì đổi và đọc cả key cũ một lần). `FilterPanel` có key riêng cho filter, không đổi.
- Điểm gắn tool id `repeater`: `constants/tools.ts`, `Emulate.tsx` (510, 774), `WorkspacePanel/index.tsx` (132 đếm số request qua `listRequests`, 143-146 event, 209, 214, 372).
- Component đọc lại raw từ API (nhạy với định dạng `params`/`headers` là chuỗi): `HeaderTab`, `ParamTab`, `BodyTab` (gọi `listRequests` và nghe `repeater-updated`), `RequestPanel/index.tsx` (693 `getHistoryRuns`, 721/737 `deleteHistory`, 731 `listHistoryByRequest`, 813 `deletePayload`), `Repeater/index.tsx`, `useRepeaterPersistence.ts`.
- Platform `android` VẪN tồn tại trong client: `TargetModal.tsx:659` có form tạo target `platform: 'android'` (picker chỉ ẩn khi chọn, không chặn dữ liệu cũ).

**Điều chỉnh so với bản kế hoạch đầu (có hiệu lực từ giờ)**
1. API giữ nguyên hình dạng chuỗi cho `params`/`headers`/`payload_values`/`statuses`/`request_headers`... (server đọc/ghi mảng/object thật trong `fuzzer.json`, nhưng controller serialize lại thành chuỗi JSON khi trả/nhận). Lý do: 7+ component client đang tự `JSON.parse`; đổi hình dạng là rủi ro lớn mà không đem lại lợi ích. Phase 7 mục 2 chỉ còn đổi tên type, KHÔNG đổi kiểu dữ liệu. Có thể tối ưu sau.
2. Quyết định #2 (target `android`): migration KHÔNG xoá row/folder `android`; giữ `platform = 'android'` nguyên vẹn (type `Platform` lưu DB vẫn chấp nhận `'android'` như giá trị legacy), chỉ ẩn khỏi PlatformPicker. Nếu muốn xoá hẳn, bạn nói rõ, sẽ làm thành migration riêng có xác nhận.
3. History mồ côi bị bỏ qua khi chuyển (xem trên).
4. `fuzzerId` = `requests.id` cũ; `historyId` = `history.id` cũ (giữ nguyên id).
5. Giữ nguyên tên endpoint con (`requests`, `payloads`, `history`) bên trong `/targets/:targetId/fuzzers/...` để client chỉ đổi base path ở `basePath()`; cụ thể: `/targets/:id/fuzzers/requests[...]`. Không đổi sang `/fuzzers/:fuzzerId` ở đợt này.

---

## Quyết định thiết kế (ASSUMED, có thể đổi trước khi chạy)

1. **Platform mới**: `website | application | terminal`. `android` bị bỏ khỏi `targets.platform` (mobile đi theo luồng device `MobileDeviceCard`, không phải target). Vì capture-method và LaunchTargetModal vẫn cần chế độ mobile, tách type: `TargetPlatform = website | application | terminal` (persist) và `CaptureMethodPlatform = TargetPlatform | 'android'` (chỉ dùng UI/capture, không lưu DB).
2. **Dữ liệu cũ**: map `web->website`, `pc->application`, `cli->terminal`. Row có `platform = 'android'` sẽ bị xoá cùng folder file (cần bạn xác nhận ở Phase 5; mặc định: giữ nguyên row nhưng set `platform = NULL` KHÔNG làm, chọn XOÁ vì UI hiện đã lọc android khỏi PlatformPicker).
3. **Folder theo id**: `~/.phantoma/emulate/<targets.id>/` là gốc duy nhất cho mọi dữ liệu file của target (reports, fuzzers, ...), thông qua 1 helper `getTargetDir(targetId)` trong `paths.config.ts`.
4. **Cột FK**: `target_http_filters.emulate_target_id` -> `target_id`.
5. **API URL**: `/emulate-targets` -> `/targets`, `/repeater` -> `/fuzzers` (một chỗ sửa ở client: `emulate-api.service.ts`). Nếu muốn giữ tương thích, bỏ bước này.
6. **Migration tăng dần**: refactor `migration.runner.ts` thành danh sách `{version, file, pre?, post?}`; DB mới chạy 0001 rồi 0002; DB cũ (user_version = 6) chỉ chạy 0002 và bước chuyển repeater.
7. **AI tool**: đổi tên toàn bộ `*_repeater*` -> `*_fuzzer*` ở Phase 9 (tách riêng, có thể bỏ qua nếu chỉ muốn đổi UI).

---

## Cấu trúc file Fuzzer

```
~/.phantoma/emulate/<targetId>/fuzzers/
  <fuzzerId>/
    fuzzer.json          # { id, method, url, params[], headers[], body, payloads[], createdAt, updatedAt }
    history/
      <historyId>/
        history.json     # metadata 1 lần chạy (status, statuses, timestamp, endTime, duration, payloadCount, payloadSummary, requestHeaders, requestBody)
        runs.json        # mảng kết quả từng payload value
```

- `fuzzer.json` gộp request + payloads (bảng payloads bỏ, `payloadValues` là mảng thật thay vì chuỗi JSON, `enabled` là boolean).
- `params`/`headers` là mảng `{key,value,enabled}` (khớp định dạng client đang lưu, bỏ `id` tạm).
- `fuzzerId` giữ nguyên `requests.id` cũ để không đổi id client đang dùng.
- History giới hạn 30 mục/fuzzer vẫn do client dọn, server thêm cắt cứng khi ghi.
- Ghi file atomic: ghi `*.tmp` rồi `rename`. Serialize ghi theo `fuzzerId` (queue) để tránh ghi đè do autosave debounce.
- Tên folder history có thể prefix timestamp để list đã sắp xếp: `<timestamp>_<historyId>`.

---

## Phase 1 — Đọc nốt và chốt phạm vi (không sửa code) — HOÀN THÀNH

1. Đọc các file ở mục `Chưa đọc`.
2. `grep` `repeater.html` xem được import ở đâu; nếu không dùng thì đưa vào danh sách xoá.
3. `grep` localStorage/persist có lưu `platform` hoặc `selectedTool === 'repeater'`.
4. Chốt các quyết định ASSUMED với bạn (đặc biệt #2 và #5).

## Phase 2 — Server: tách migration và đổi tên bảng — HOÀN THÀNH (tsc sạch; đã test migration trên DB v6 giả lập và DB mới: version 7, platform web/pc/cli -> website/application/terminal, android giữ nguyên, filter đổi cột `target_id`, có backup `.bak-v6`)

File: `emulate/src/database/*`, `emulate/src/domain/*`, repositories target/filter.

1. Refactor `migration.runner.ts`: danh sách migration có version; backup `emulate.sql` -> `emulate.sql.bak-v<old>` trước khi chạy; mỗi migration trong 1 transaction.
2. Tạo `migrations/0002_rename_targets.sql`:
   - `ALTER TABLE emulate_targets RENAME TO targets;`
   - `ALTER TABLE emulate_target_filters RENAME TO target_http_filters;`
   - `ALTER TABLE target_http_filters RENAME COLUMN emulate_target_id TO target_id;`
   - Drop và tạo lại index: `idx_targets_updated`, `idx_target_http_filters_target` (UNIQUE `target_id`).
   - `UPDATE targets SET platform = CASE platform WHEN 'web' THEN 'website' WHEN 'pc' THEN 'application' WHEN 'cli' THEN 'terminal' ELSE platform END;`
3. Cập nhật `database.schema.ts`: `TargetsTable`, `TargetHttpFiltersTable`, `Database { targets; target_http_filters }` (6 bảng cũ còn lại tạm thời đến Phase 4).
4. Sửa `target.repository.ts` (`selectFrom('targets')`...), `target-filter.repository.ts` (đổi tên file thành `target-http-filter.repository.ts`, cột `target_id`), `domain/target-filter.*` (`emulate_target_id` -> `target_id`), `target-filter.service/controller/routes`, `container.ts`.
5. Cập nhật `0001_initial_schema.sql` KHÔNG sửa (giữ lịch sử); DB mới sẽ đi 0001 -> 0002.
6. Type-check: `cd emulate && npx tsc --noEmit`.

## Phase 3 — Server: platform và đường dẫn — HOÀN THÀNH (tsc sạch; `Platform = TargetPlatform | 'android'`, thêm `getTargetDir`/`getFuzzersDir`, report storage dùng `getTargetDir`)

1. `types/platform.type.ts`: `Platform = 'website' | 'application' | 'terminal'`; thêm `CaptureMethodPlatform`.
2. Sửa `capture-method.type.ts`, `constants/capture-methods.constant.ts`, `capture-method.service.ts`, `capture-method.routes/controller` dùng `CaptureMethodPlatform` (android vẫn hợp lệ ở đây).
3. `ebpf-capture.service.ts:81`: `platform !== 'pc'` -> `platform !== 'application'`; grep thêm các so sánh platform ở `services/cli`, `services/browser`.
4. `paths.config.ts`: thêm `getTargetDir(targetId)` và `getFuzzersDir(targetId)`; đồng bộ `report-file.storage.ts` dùng `getTargetDir`.
5. Cập nhật comment sơ đồ thư mục ở đầu `paths.config.ts`.

## Phase 4 — Server: Fuzzer file storage (thay Repeater DB)

1. Tạo `domain/fuzzer/` (entity: `Fuzzer`, `FuzzerHistory`, `FuzzerRun`, `FuzzerPayload`; input tương ứng), thay `domain/repeater/*`.
2. Tạo `storage/fuzzer-file.storage.ts`: `listFuzzers`, `getFuzzer`, `saveFuzzer` (atomic), `deleteFuzzer`, `listHistory`, `saveHistory(history, runs)`, `listRuns`, `deleteHistory`, `deleteAllForTarget`; có hàm chống path traversal (validate `targetId`/`fuzzerId`/`historyId` chỉ gồm `[A-Za-z0-9_-]`).
3. Tạo `services/emulate/fuzzer.service.ts` (thay `repeater.service.ts`): CRUD fuzzer, upsert/delete payload (sửa trong `fuzzer.json`), history, runs; stamp `now` một lần/thao tác như cũ.
4. Tạo `api/controllers/fuzzer.controller.ts` và `api/routes/fuzzer.routes.ts` (giữ hình dạng response cũ ở mức có thể, nhưng `params`/`headers` trả mảng thật; client được sửa ở Phase 7). Mount `/targets/:targetId/fuzzers/...`.
5. `routes/index.ts`: thay `router.use('/emulate-targets', ...)` thành `/targets`, thay RepeaterController -> FuzzerController. `container.ts`: bỏ `RepeaterRepository`, thêm `FuzzerFileStorage`.
6. Xoá: `repeater*.repository.ts`, `repeater-file.storage.ts`, `domain/repeater/*`, `repeater.service/controller/routes`.
7. Xoá khi xoá target: `TargetService.delete` phải gọi `fs.rm(getTargetDir(id))` (hiện FK repeater không cascade nên xoá target có repeater sẽ lỗi).

## Phase 5 — Server: chuyển dữ liệu cũ SQL -> JSON rồi xoá bảng

1. Tạo `database/migrations/legacy-repeater-export.ts` (bước `pre` của migration 0003): với DB cũ còn bảng `emulate_repeater_*`:
   - Với mỗi `emulate_repeater_requests`: đọc `params.json`/`headers.json`/`body.json` từ `.../{targetId}/repeaters/repeater_{id}/` (nếu thiếu dùng `[]`/`''`), ghép payloads từ `emulate_repeater_payloads` (`payload_values` JSON.parse, `enabled` -> boolean), ghi `fuzzers/<id>/fuzzer.json`.
   - Với mỗi `emulate_repeater_history` (có hoặc không còn `request_id`): ghi `history.json` + `runs.json` từ `emulate_repeater_history_runs`; history mồ côi (request_id NULL) đưa vào `fuzzers/_orphaned/` hoặc bỏ qua (chốt ở Phase 1).
   - Idempotent: nếu `fuzzer.json` đã tồn tại thì bỏ qua; đếm số bản ghi đã xuất và log.
2. Chỉ khi export thành công mới chạy `0003_drop_repeater_tables.sql` (DROP 4 bảng + index, bump `LATEST_VERSION = 8` hoặc theo số migration). Nếu lỗi: rollback transaction, giữ nguyên bảng, DB backup còn đó.
3. Dọn folder cũ `.../{targetId}/repeaters/` sau khi export xong (đưa sang `repeaters.migrated/` thay vì xoá ngay).
4. Xử lý `targets.platform = 'android'` theo quyết định #2, xoá cả `<id>/` tương ứng.
5. Bảng `target_http_filters` ON DELETE CASCADE giữ nguyên.

## Phase 6 — Client: đổi tên Repeater -> Fuzzer (UI)

1. Đổi tên folder `components/WorkspacePanel/Repeater` -> `components/WorkspacePanel/Fuzzer` (đổi bằng `git mv` qua `run_command`); `repeater.html` xoá nếu Phase 1 xác nhận không dùng.
2. `constants/tools.ts`: key `repeater` -> `fuzzer`, label `Fuzzer`, mô tả cập nhật. Sửa mọi `ToolType === 'repeater'` (`Emulate.tsx` ~510, 768-774, `handleSetSelectedTool('fuzzer')`, `WorkspacePanel/index.tsx`, `FooterBar`, `EmulateModule.ts`).
3. Đổi tên symbol: `PayloadPanel` giữ nhưng export từ `Fuzzer`; `addToRepeater` -> `addToFuzzer`, `removeFromRepeater` -> `removeFromFuzzer`, `clearRepeater` -> `clearFuzzer`, `isInRepeater`, `getRepeaterIds`; `onSendToRepeater` -> `onSendToFuzzer`; menu chuột phải `Send to Repeater` -> `Send to Fuzzer` (Home/RequestTable, FilterPanel).
4. `types/repeater.types.ts` -> `fuzzer.types.ts` (`RepeaterTab` -> `FuzzerTab`); `hooks/useRepeaterPersistence.ts` -> `useFuzzerPersistence.ts`; `utils/repeater-resolver.util.ts` -> `fuzzer-resolver.util.ts`; event `repeater-updated` -> `fuzzer-updated` (grep toàn bộ nơi dispatch/listen).
5. Text UI: `Search repeater requests...`, `No requests in Repeater`, `Right-click ... Send to Repeater`.

## Phase 7 — Client: API service và dữ liệu

1. `emulate-api.service.ts`: `basePath` -> `/api/v1/targets/${id}/fuzzers`; đổi tên hàm (`listFuzzers`, `createFuzzer`, ...) hoặc giữ tên cũ và chỉ đổi type; cập nhật header comment. Các gọi target CRUD đổi URL `/emulate-targets` -> `/targets`.
2. `dto/emulate.dto.ts`: thêm DTO fuzzer (params/headers là mảng, `payloadValues` là mảng, `enabled` boolean), bỏ `RepeaterRequest/Payload/History/Run`; `useFuzzerPersistence` bỏ `JSON.parse` thừa cho params/headers/payload_values/statuses/request_headers.
3. `RunRepeaterExecutor` -> `RunFuzzerExecutor`: bỏ `localStorage` history, ghi history qua API `saveHistory` để thống nhất với UI.
4. `fuzzer-resolver.util.ts`: giữ ánh xạ `fuzzer_<number>` -> request theo index trong list.

## Phase 8 — Client: platform mới

1. `constants/platforms.ts`: key `website | application | terminal` (bỏ `android` khỏi `PLATFORMS`); thêm hằng/ type UI-only cho mobile (`LaunchPlatform = AppPlatform | 'android'`) dùng ở `LaunchTargetModal`, `TargetPanel`, `MobileDeviceCard`, `emulate-api.getCaptureMethods`.
2. Thay toàn bộ so sánh/literal: `Emulate.tsx` (145, 191, 648, 819, 834, default `'website'`), `TargetModal.tsx` (`PLATFORM_RGB`, `PLATFORM_CONFIG`, `MODAL_SIZE`, literal 506/659/882/1052; bỏ filter `pid !== 'android'` vì key đã bị bỏ), `TargetCard.tsx` (bỏ nhánh `isCardDisabled` của android nếu target không còn android; mobile card xử lý riêng), `TargetListPanel/index.tsx` (`getTargetPlatform` cần map giá trị cũ web/pc/cli sang mới để tương thích tạm; `platformCounts`; default filter `'website'`; nhánh `filterPlatform === 'android'` chuyển thành tab riêng Mobile devices), `LaunchTargetModal/index.tsx`, `TargetPanel.tsx`, `CliInfoPanel.tsx:63` (`pc` -> `application`).
3. `hooks/useTargetData.ts`, `emulate-api.service.ts` (`getTargetsByPlatform`, 156-169, 656) dùng giá trị mới.
4. Label hiển thị: Website / Application / Terminal.

## Phase 9 — AI tool rename (tuỳ chọn, tách commit)

- Đổi `list_repeaters`, `get_repeater_detail`, `run_repeater`, `send_to_repeater`, `delete_repeater`, `update_repeater_content` -> `*_fuzzer*`; id `repeater_<n>` -> `fuzzer_<n>`.
- Mỗi tool đủ 3 file: `parsers/*Parser.ts`, `executors/*Executor.ts`, `renderers/*Renderer.tsx`; thêm `handler/UpdateRepeaterContentHandler.ts`, `constants/tag-registry.ts`, `EmulateModule.ts`, và prompt: `prompts/emulate/{tools-reference,tool-validation,examples,constraints,identity,messaging}.ts`, `prompts/orchestrator/*`, `prompts/planner/*`.
- Rủi ro: lịch sử chat cũ có tool name cũ sẽ không parse; có thể giữ alias đọc cho tên cũ.

## Phase 10 — Tài liệu và dọn dẹp

1. Viết lại `emulate/SCHEMA.md`: bảng `targets`, `target_http_filters`, mục `Fuzzers (không có bảng)` mô tả cấu trúc JSON ở trên, sửa đường dẫn đúng.
2. Cập nhật `emulate/src/ARCHITECTURE.md` (route mới, storage mới) và `AGENTS.md` gốc (tên module Fuzzer, platform mới, cấu trúc `<id>/fuzzers`).
3. Xoá code chết: `RepeaterRepository`, import cũ, `domain/index.ts` export cũ.

---

## Kiểm thử và xác minh (chạy tay, không tạo test tự động)

- `cd emulate && npx tsc --noEmit` sau Phase 2, 3, 4, 5.
- `npx tsc --noEmit -p tsconfig.web.json` sau Phase 6, 7, 8 (đã có sẵn 1 lỗi không liên quan ở `RunCommandExecutor.ts`).
- Test migration trên bản copy của `~/.phantoma/emulate/emulate.sql` có dữ liệu repeater thật: so số lượng request/payload/history/runs trước-sau, mở Fuzzer UI kiểm tra params/headers/body/payload/history.
- Test DB mới (xoá file) -> khởi động -> tạo target website/application/terminal -> tạo fuzzer -> chạy -> xem history -> xoá target (folder `<id>` biến mất).
- Kiểm tra mobile launch vẫn chạy sau khi bỏ `android` khỏi target.

## Rủi ro chính

1. Xoá target hiện lỗi FK khi còn repeater; sau khi chuyển sang file thì phải xoá folder thủ công.
2. `RENAME COLUMN` cần SQLite >= 3.25 (better-sqlite3 bản hiện tại đáp ứng, xác nhận phiên bản trước khi chạy).
3. Autosave debounce 1s của client + ghi file không có khoá -> cần queue ghi theo `fuzzerId`.
4. Hàng `android` trong DB cũ bị xoá: cần chắc chắn trước khi chạy migration.
5. Đổi URL API là breaking nếu có consumer khác ngoài renderer (đã grep `src/main`: không có).
6. Chưa đọc `repeater.repository.ts`/`RequestPanel/**` nên chi tiết ánh xạ trường có thể phải điều chỉnh ở Phase 1.