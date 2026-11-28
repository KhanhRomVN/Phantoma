# Kế hoạch hoàn thiện Restructure + Clean Architecture — Profile Server

> Loại tài liệu: Residual Refactor Plan — chỉ liệt kê phần còn thiếu sau khi đối chiếu.
>
> Baseline: `src(2).zip`.
>
> Bản đang kiểm tra: `src_refactor(2).zip`.
>
> Phạm vi: toàn bộ source TypeScript có trong hai ZIP. Không có `package.json`, `tsconfig`, test config, renderer source hoặc API client contract đi kèm.
>
> Kết luận: bản refactor đã hoàn thành bước dựng entry point, startup runner và tách phần lớn route/controller; chưa hoàn tất Dependency Inversion, Domain Separation, Infrastructure Separation và dọn legacy implementation.

---

## 0. Kết luận và trạng thái

**Chưa đạt 100% theo kế hoạch Profile Server ban đầu.** Bản hiện tại nên được xem là giai đoạn migration trung gian: các layer mới đã xuất hiện nhưng nhiều layer vẫn gọi trực tiếp implementation cũ.

### Kiểm kê

| Chỉ số | Baseline | Refactor | Nhận xét |
|---|---:|---:|---|
| File TypeScript | 48 | 103 | Bản refactor tăng file nhờ tách route/controller/service/adapter |
| File cùng đường dẫn và nội dung giống hệt | — | 35 | Nhiều implementation legacy chưa được di chuyển hoặc thay thế |
| Route registrations | 79 | 79 | Số lượng khai báo route được giữ nguyên |
| Application ports | — | 12 | Chủ yếu repository/cache/backup; thiếu nhiều technical boundary |
| Infrastructure files | — | 9 | Chưa có profile/source/activity repository adapters và nhiều adapter filesystem/browser |

### Phần đã thực hiện

1. Có `main.ts`, `app.ts`, `bootstrap/container.ts` và `bootstrap/server.ts`.
2. Có `startup/startup.runner.ts`, hai phase `before-listen`/`after-listen` và bốn startup tasks.
3. Thứ tự startup được wiring theo baseline: legacy service-email migration → sweep browser temp → reconcile và sync local sources → listen → auto-install browser.
4. Đã tách route modules và controller classes cho các nhóm profile, activity, browser data, source, jobs, session, query, service, service-email và browser.
5. Có một số repository adapters mới cho Query, Service Catalog, Service Email và Session.
6. Có factory instance cho Browser Run và Browser Update thay vì chỉ dùng singleton trực tiếp trong hai implementation mới.
7. Kiểm tra đếm được 79 route registrations ở cả hai phiên bản. Các route dùng `mountChild`, `BASE` và template path đã được tách tương ứng; đây là kiểm tra source-level, không thay thế API integration tests.

### Phần chưa hoàn thành

Các vấn đề lớn nhất:

- Application Services vẫn import filesystem, database helper, browser-folder helper, HTTP helper và global utilities.
- `ProfileTransferService` chưa được tách; transfer/merge vẫn nằm trong Profile Service.
- Source scanning, parse Chrome Preferences, đọc avatar và source sync vẫn nằm trong Application Service.
- Domain vẫn chứa persistence mapper; Application Ports lấy kiểu dữ liệu từ mapper này.
- Profile, Source và Activity repository implementations vẫn là legacy global singletons.
- Database, cache, browser-folder, system, logging và backup implementation cũ vẫn tồn tại và đang được wiring trực tiếp.
- Một số Controller phụ thuộc trực tiếp Infrastructure hoặc service/util cũ thay vì Application use case.
- Container chưa thực sự sở hữu toàn bộ dependencies; tham số config đang không được sử dụng.

---

## 1. Danh sách phần còn thiếu theo mức ưu tiên

## P0 — Hoàn thiện dependency direction và Application boundary

### GAP-01 — Application Services vẫn phụ thuộc trực tiếp technical implementation

**Bằng chứng trong bản refactor:**

- `application/services/profiles/profile.service.ts:1-24`: import `fs`, `path`, `database/sql`, `utils/browser-folder`, `utils/http`, `utils/system` và logger.
- `application/services/profiles/profile.service.ts:226,279,324`: thực hiện transaction/query trực tiếp qua `getDb()`.
- `application/services/sources/source.service.ts:10-15,37-110`: import `fs`, `path`, database helper, HTTP error/helper và logger; trực tiếp đọc `Local State`, `Preferences`, avatar file và scan folder.
- `application/services/browser-data/profile-browser-data.service.ts:1-18`: gọi thẳng các hàm trong `utils/browser-folder` và `utils/system`.
- `application/services/service-catalog/service.service.ts:1-3`: phụ thuộc `database/sql` và `utils/http`.
- `application/services/imports/import-job.service.ts:1-5`: phụ thuộc `path`, `utils/http` và type từ legacy `services/import-preview.service.ts`.
- Các Application Services khác cũng import `AppError` từ `utils/http`.

**Việc cần làm:**

1. Gỡ toàn bộ `fs`, `path`, SQLite/database helper, `utils/browser-folder`, `utils/system` và concrete infrastructure import khỏi Application.
2. Khai báo port theo capability thực sự cần dùng, không tạo một interface tổng hợp khổng lồ:
   - `ProfileFolderStoragePort` cho provision/remove/open/copy/move/measure folder.
   - `SourceScannerPort` cho scan Chrome profile, đọc Preferences/Local State và lấy metadata/avatar.
   - `ImportFolderReaderPort` cho preview và read file/folder import.
   - `BrowserProfileDataReaderPort` cho history, saved logins, password, fingerprint history, extension state và login/session detection.
   - `DeviceFingerprintPort`, `FolderValidatorPort` hoặc `PathOpenerPort` nếu use case thực sự cần.
   - Repository ports và transaction boundary cho các thao tác cần atomicity.
3. Implement các port ở Infrastructure; Application chỉ gọi port.
4. Chuyển log qua `LoggerPort` nếu cần thay thế/test độc lập; nếu giữ logger abstraction đơn giản thì không cần tạo thêm framework logging.
5. Loại bỏ `DbProvider` khỏi chữ ký Application. Application không được biết connection provider hay cách mở SQLite.

**Điều kiện hoàn tất:**

- Không có import `fs`, `path`, `better-sqlite3`, `child_process`, `database/*`, `utils/browser-folder`, `utils/system` trong `application/`.
- Không có lời gọi `getDb()`, `withSessionDb()`, `withVault()` hoặc SQL query trong Application.
- Có thể test Profile/Source/Browser Data use case bằng fake ports mà không cần filesystem, SQLite hay browser runtime.

### GAP-02 — Chưa tách Profile Transfer khỏi Profile Service

**Bằng chứng:**

- `application/services/profiles/profile.service.ts:47-86`: khai báo Transfer input/outcome/plan types trong cùng module Profile.
- `application/services/profiles/profile.service.ts:275-480`: bulk update, conflict comparison, merge policy, rekey và transfer orchestration nằm cùng file.
- `application/services/profiles/profile.service.ts:389`: hàm `transfer()` vẫn do Profile Service sở hữu.
- Không có `application/services/profiles/profile-transfer.service.ts`.
- `TransferJobService` hiện nhận callback gọi `profileService.transfer(...)` trong `bootstrap/container.ts:145-148`.

**Việc cần làm:**

1. Tạo `application/services/profiles/profile-transfer.service.ts`.
2. Chuyển transfer planning, conflict classification, merge policy, rekey orchestration, move/duplicate flow và cancellation coordination sang `ProfileTransferService`.
3. Chuyển filesystem operations qua `ProfileFolderStoragePort`; không gọi `transferProfileFolder()` trực tiếp.
4. Giữ Profile Service sở hữu CRUD, bulk update/delete, list/get và relation loading.
5. Chuyển `TransferJobService` nhận `ProfileTransferService` thay vì nhận callback gọi `ProfileService.transfer()`.
6. Giữ nguyên thứ tự copy/move, policy precedence, cache invalidation, backup update, rollback/partial failure và cancellation semantics.

**Điều kiện hoàn tất:** Profile Service không còn hàm transfer/merge; transfer job chỉ điều phối trạng thái job và gọi Profile Transfer use case.

### GAP-03 — Source scanning và Source Sync chưa tách khỏi Source Service

**Bằng chứng:**

- `application/services/sources/source.service.ts:37-110`: có `readJson`, `readEmail`, `pickAvatar`, `scanLocation` và đọc Chrome profile folder.
- `application/services/sources/source.service.ts:206-246`: preview tự kiểm tra folder và đọc nội dung Chrome profile.
- `application/services/sources/source.service.ts:279-358`: reconcile, sync source, sync local và orchestration vẫn cùng module.
- Không có `application/services/sources/source-sync.service.ts` hoặc Infrastructure Source Scanner adapter.

**Việc cần làm:**

1. Tạo `infrastructure/filesystem/source-scanner/chrome-source.scanner.ts` triển khai `SourceScannerPort`.
2. Đưa đọc `Local State`, `Preferences`, nhận diện email, tên profile, avatar và ignored folders vào scanner adapter.
3. Đưa folder existence/absolute path/stat/read permissions vào filesystem adapter.
4. Tạo `application/services/sources/source-sync.service.ts` để điều phối kết quả scan với Profile/Source repositories.
5. Giữ `SourceService` cho CRUD, import existing, preview use case và reconcile orchestration; chỉ giữ các phần thật sự thuộc Source use case.
6. Giữ startup chỉ sync source `type === 'local'` có location hợp lệ; giữ warning cho folder missing và tuần tự await từng source.

**Điều kiện hoàn tất:** Application không tự đọc Chrome folder/file; scanner có thể test độc lập bằng fixture folder; startup/source behavior không thay đổi.

### GAP-04 — Một số Controllers đang gọi Infrastructure hoặc legacy utility/service trực tiếp

**Bằng chứng:**

- `api/controllers/browser-sessions.controller.ts:2-9`: phụ thuộc `services/browser-fork.service` và `infrastructure/browser/launcher/browser-run.service`.
- `api/controllers/browser-updates.controller.ts:2-8`: phụ thuộc trực tiếp `infrastructure/browser/updater/browser-update.service`.
- `api/controllers/source-imports.controller.ts:2-12`: phụ thuộc `services/import-preview.service` và `utils/system.validateFolder`.
- `api/controllers/profile-browser-data.controller.ts:2-5`: phụ thuộc service browser-data đang là module-level singleton và Profile Service.
- `bootstrap/container.ts:181-184`: truyền `profileBrowserDataService` singleton cho Controller.

**Việc cần làm:**

1. Tạo Application use cases cho Browser Session, Browser Catalog/Fork listing và Browser Update.
2. Controller chỉ nhận Application Service interfaces, không import type từ `infrastructure/` hoặc root `services/`.
3. Tạo Application Import Preview use case; controller không gọi `previewImportFolder`, `readImportFile` hoặc `validateFolder` trực tiếp từ utility/legacy module.
4. Chuyển Browser Data thành instance được tạo trong Container; Application service nhận `BrowserProfileDataReaderPort` và `DeviceFingerprintPort`.
5. Đảm bảo các dependency được inject theo constructor/factory; không dùng module-level singleton mutable state.

**Điều kiện hoàn tất:** Import graph của `api/controllers/` chỉ tham chiếu Express, API helpers/contracts và Application services/types.

### GAP-05 — AppError, HTTP response và request helpers vẫn trộn layer

**Bằng chứng:**

- `app.ts:4`: import `errorHandler` từ `utils/http`.
- `api/routes/*.routes.ts`: import `handle` từ `utils/http`.
- `api/controllers/*.controller.ts`: dùng `json`, `param`, `requireString`, đôi chỗ dùng `AppError` từ `utils/http`.
- `application/services/*`: import `AppError` từ `utils/http`.
- `infrastructure/*`: nhiều adapter cũng import `AppError` từ `utils/http`.
- `utils/http.ts` vẫn giữ nguyên file legacy; chưa có `api/http/`, `api/middleware/`.

**Việc cần làm:**

1. Tạo `application/errors/app.error.ts`; AppError không phụ thuộc Express.
2. Chuyển `errorHandler` vào `api/middleware/error-handler.middleware.ts`.
3. Chuyển async handler wrapper vào `api/middleware/async-handler.middleware.ts`.
4. Chuyển response envelope helpers sang `api/http/response.ts`.
5. Chuyển request param/string parsing sang `api/http/params.ts` hoặc validator thuần phù hợp với API boundary.
6. Sửa Application/Infrastructure imports để dùng Application Error; API middleware là nơi duy nhất chuyển lỗi sang HTTP status/response.
7. Sau khi không còn consumer, loại bỏ `utils/http.ts` và điều chỉnh `utils/guard.ts` để không import AppError từ HTTP.

**Điều kiện hoàn tất:** không có import `utils/http` trong Application, Domain hoặc Infrastructure; Express chỉ xuất hiện trong API và app composition.

---

## P1 — Hoàn thiện Domain, Persistence và Infrastructure

### GAP-06 — Domain vẫn chứa persistence mapper, chưa có domain model đủ cho các module

**Bằng chứng:**

- `domain/mappers.ts:1-107` vẫn tồn tại và nội dung trùng baseline.
- `domain/mappers.ts:1`: khai báo `Row` dạng database record.
- `domain/mappers.ts:3`: import `fromEmailId` từ `utils/browser-folder`.
- `domain/mappers.ts:16-107`: map Source/Profile/Service/Session/ServiceEmail từ storage row/file thành output model.
- `application/ports/repositories/profile.repository.port.ts:1-4`, `source.repository.port.ts:1-4`, `service-catalog.repository.port.ts:1-4`, `service-email.repository.port.ts:1-4`, `session.repository.port.ts:1-4`: derive Application records bằng `ReturnType<typeof map...>` từ Domain mapper.
- Domain mới chỉ có `domain/queries/query.ts` ngoài mapper; chưa có model modules cho profile/source/session/service-catalog.

**Việc cần làm:**

1. Chuyển DB row/file mapping sang `infrastructure/persistence/mappers/`.
2. Định nghĩa domain model/value object cho các khái niệm thực sự có invariant: Profile, Source, Session, Service Catalog/Query nếu business rules yêu cầu.
3. Chỉ đưa business invariant/policy thuần vào Domain; không đưa Chrome folder/path, DB row hoặc API projection vào Domain.
4. Application Ports tham chiếu Domain model hoặc Application-owned record contracts, không tham chiếu mapper function.
5. Giữ DTO renderer/API ở `api/contracts/`; không sử dụng API DTO làm Domain Entity.

**Điều kiện hoàn tất:** `domain/` không import layer khác, utility hoặc filesystem; không có `Row`, `mapEmail`, `mapSource`, `mapSession` hay mapper persistence trong Domain.

### GAP-07 — Thiếu concrete repositories cho Profile, Source và Activity

**Bằng chứng:**

- `bootstrap/container.ts:47-54` vẫn import `emailRepository`, `sourceRepository`, `browsingEntryRepository`, `deviceActivityRepository`, `footprintRepository`, `scriptRunRepository` từ root `repositories/`.
- `bootstrap/container.ts:81` có ghi chú rõ: Profile/Source/Activity repositories vẫn là legacy `global-getDb` singletons.
- `infrastructure/persistence/repositories/` hiện chỉ có Query, Service Catalog, Service Email và Session.
- `repositories/email.repository.ts`, `repositories/service.repository.ts`, `repositories/service_email.repository.ts`, `repositories/session.repository.ts` vẫn giữ nguyên nội dung baseline.

**Việc cần làm:**

1. Implement `SqliteProfileRepository` cho `ProfileRepositoryPort`.
2. Implement `SqliteSourceRepository` cho `SourceRepositoryPort`.
3. Tách `service.repository.ts` thành `SqliteProfileActivityRepository` và các repository riêng cho Footprint, Script Run, Device Activity, Browsing Entry nếu transaction/ownership cần độc lập.
4. Chuyển `ProfileLookupPort` vào adapter/profile repository phù hợp, tránh truyền legacy repository singleton.
5. Inject DB connection/transaction context rõ ràng; không gọi global `getDb()` từ repository.
6. Bảo toàn file path của email.json, schema, cascade, query ordering, transaction và cache invalidation.

**Điều kiện hoàn tất:** Container không import root `repositories/`; toàn bộ Application repository ports được triển khai bởi Infrastructure adapters.

### GAP-08 — SQLite và backup chưa được gom vào Infrastructure thực sự

**Bằng chứng:**

- `database/connection.ts`, `database/sql.ts`, `database/session.ts`, `database/vault.ts`, `database/backup.ts` vẫn giữ nguyên nội dung baseline.
- `bootstrap/server.ts:3,15` vẫn gọi `initDb()` trực tiếp từ root `database/connection`.
- `bootstrap/container.ts:29,36-38,87-91,194` dùng `getDb`, `withSessionDb`, `withVault`, các hàm backup global.
- `application/services/profiles/profile.service.ts` vẫn thực hiện SQL transaction qua DB provider được inject.
- `infrastructure/persistence/sqlite/main/sql-helpers.ts` chỉ mới là helper; chưa thay thế toàn bộ database implementation.
- `BackupService` có port nhưng `backupStore` trong Container vẫn là object ghép trực tiếp từ các hàm `database/backup.ts`.

**Việc cần làm:**

1. Hoàn thiện `infrastructure/persistence/sqlite/main/` cho main DB connection, schema, migration và query helpers.
2. Tách per-profile session DB và vault DB thành factory/adapter có path và lifecycle rõ ràng.
3. Chuyển backup DB/file operations thành adapter triển khai `BackupStorePort`.
4. Chuyển các transaction nhiều repository thành transaction boundary/application port phù hợp; không để Application biết SQLite API.
5. Inject connection provider/factory qua Container; tránh global `getDb()`, `withSessionDb()`, `withVault()`.
6. Giữ nguyên data path, per-profile isolation, migration idempotency, fallback và purge behavior.

**Điều kiện hoàn tất:** `database/` legacy không còn được import; Infrastructure là chủ sở hữu connection, schema, migration, DB factories và backup IO.

### GAP-09 — Browser/Filesystem Infrastructure mới chỉ được tách một phần

**Bằng chứng:**

- `utils/browser-folder.ts` vẫn nguyên 828 dòng và trùng baseline.
- `infrastructure/browser/launcher/browser-run.service.ts:5-28` vẫn import `database/sql`, `utils/browser-folder`, `utils/http`, `services/browser-fork.service`, `services/external-browser.service`, `services/proxy-bridge.service`, `services/browser-cdp.service`.
- `infrastructure/browser/updater/browser-update.service.ts:9-20` vẫn import fork definitions/discovery từ `services/browser-fork.service` và AppError/logger/version từ utils.
- `services/browser-fork.service.ts`, `services/external-browser.service.ts`, `services/browser-cdp.service.ts`, `services/proxy-bridge.service.ts` vẫn nằm ở root `services/` và giữ nguyên nội dung baseline.
- Chưa có `infrastructure/storage/profile-folders/`, `infrastructure/filesystem/source-scanner/`, `infrastructure/filesystem/import-folders/`, `infrastructure/browser/catalog/`, `infrastructure/browser/external-process/`, `infrastructure/browser/profile-data/`.

**Việc cần làm:**

1. Tách `browser-folder.ts` theo capability:
   - Profile folder provision/remove/open/copy/move/measure.
   - Browser executable/fork catalog và version detection.
   - Browser profile data readers: history, login, password, fingerprint, extension state.
   - Pure profile/browser policy chỉ chuyển vào Domain khi thực sự là business invariant.
2. Đưa Browser Fork catalog/discovery vào `infrastructure/browser/catalog/`.
3. Đưa external process/browser scanning vào `infrastructure/browser/external-process/`.
4. Đưa CDP và proxy bridge vào browser/process adapters có contract rõ ràng.
5. Giữ Browser Run/Update implementation ở Infrastructure nhưng không để API Controller phụ thuộc trực tiếp implementation.
6. Đưa `AppError` về Application Errors; logger/version helper về module sở hữu phù hợp.
7. Giữ nguyên file locking/temp-copy behavior khi đọc Chrome SQLite DB; không thay đổi cách truy cập dữ liệu browser đang chạy.

**Điều kiện hoàn tất:** không có Application/API import trực tiếp `utils/browser-folder`; Infrastructure Browser không import root legacy `services/`.

### GAP-10 — Import Preview, System, Logging, Cache và Backup còn phụ thuộc implementation cũ

**Bằng chứng:**

- `services/import-preview.service.ts` vẫn tồn tại và được import bởi `SourceImportsController` cùng `ImportJobService`.
- `utils/system.ts` vẫn được import bởi Application browser-data và Source Imports Controller.
- `utils/logger.ts`, `utils/version.ts`, `utils/welcome.ts` vẫn giữ nguyên baseline; `startup/presentation/server-banner.ts` chỉ re-export từ `utils/welcome.ts`.
- `cache/email.cache.ts` và `cache/service_email.cache.ts` vẫn giữ nguyên baseline.
- `infrastructure/cache/redis-cache.ts` nhận Redis client từ `getRedis()` global; Container vẫn gọi `closeRedis()` từ cache cũ.
- `database/backup.ts` vẫn là implementation backup được Container gọi trực tiếp.

**Việc cần làm:**

1. Chuyển import folder preview/file reading thành Filesystem adapter và Application Import Preview use case.
2. Chuyển folder validation, device fingerprint, OS/system info và open-path thành Infrastructure System adapters.
3. Đặt logger implementation tại `infrastructure/logging/`; startup presentation sở hữu banner implementation thực tế.
4. Chuyển cache client creation, namespacing và close lifecycle vào `infrastructure/cache/`; Container tự tạo và đóng cache instance.
5. Chuyển backup file/database IO thành Infrastructure adapter.
6. Không tự ý đổi `ioredis-mock` sang Redis thật hoặc thay cache TTL/key semantics nếu chưa xác minh runtime backend.

**Điều kiện hoàn tất:** các module mới không còn phụ thuộc root `utils/`, `cache/`, `database/` hoặc `services/import-preview.service.ts`.

### GAP-11 — Application Ports còn thiếu và một số dependency đang là function bundle tạm thời

**Bằng chứng:**

- Port inventory hiện có chủ yếu nằm trong `application/ports/repositories/`, `cache/`, `storage/backup*`.
- Chưa có port cho Profile Folder Storage, Source Scanner, Import Folder Reader, Browser Launcher, Browser Data Reader, Browser Catalog, External Process, System/Path, Import/Transfer/Update Job Store hoặc Downloader/Archive Extractor.
- `ImportJobService` dùng `ImportJobDeps.folders` là object function bundle (`application/services/imports/import-job.service.ts:37-55`).
- `BrowserRunService`/`BrowserUpdateService` nằm trong Infrastructure và chưa có Application-facing ports/use cases đầy đủ.

**Việc cần làm:**

1. Bổ sung ports đúng nơi có boundary thay thế hoặc cần test độc lập.
2. Tách các capability đang gom trong object `folders` thành interface có ownership rõ ràng; không tách thành nhiều interface nhỏ một cách hình thức.
3. Đưa mutable job state vào instance hoặc JobStore có lifecycle do Container quản lý.
4. Định nghĩa cancel/dispose/shutdown contract cho browser runtime và update job nếu đang chạy nền.
5. Không tạo một `AppContainer` service locator trong Application.

**Điều kiện hoàn tất:** mỗi Application use case chỉ nhận đúng các ports cần dùng; mọi mutable runtime state có owner và lifecycle xác định.

---

## P2 — Hoàn thiện API composition, legacy cleanup và verification

### GAP-12 — API support structure chưa theo root architecture baseline

**Bằng chứng:**

- `api/` hiện chỉ có `controllers/` và `routes/`.
- Chưa có `api/middleware/`, `api/http/`, `api/contracts/`.
- `app.ts` vẫn lấy `errorHandler` và logger từ `utils/`.
- Route modules vẫn dùng `handle` từ `utils/http`.

**Việc cần làm:**

1. Tạo `api/middleware/` và `api/http/` theo GAP-05.
2. Tạo `api/contracts/` cho transport DTO thực sự được dùng; không tạo DTO file rỗng cho mọi endpoint.
3. Tách request/response DTO khỏi Domain và persistence records.
4. Đảm bảo Routes chỉ khai báo method/path, middleware và Controller handler.

**Điều kiện hoàn tất:** HTTP transport code được sở hữu toàn bộ bởi `api/`; `app.ts` chỉ dựng Express pipeline từ API modules.

### GAP-13 — Container chưa phải Composition Root hoàn chỉnh

**Bằng chứng:**

- `bootstrap/container.ts:27-73` import nhiều global singleton/helper từ root `cache/`, `database/`, `repositories/`, `services/`, `utils/`.
- `bootstrap/container.ts:81` tự ghi nhận Profile/Source/Activity repository vẫn là legacy singleton.
- `bootstrap/container.ts:82` nhận `_config` nhưng không sử dụng.
- `bootstrap/container.ts:181-190` còn inject module-level browser data/fork services và concrete Infrastructure service vào Controller.
- `bootstrap/container.ts:210-214` đóng các global Redis/DB functions thay vì đóng các instance được tạo/own hoàn toàn trong Container.

**Việc cần làm:**

1. Dùng `AppConfig` để tạo các DB/cache/storage/process/browser adapters cần thiết.
2. Container tạo concrete adapters → Application Services → Controllers → startup dependencies theo một composition graph duy nhất.
3. Không import legacy repository/service singleton vào Container.
4. Thêm lifecycle `close()/dispose()` cho các adapter/job có tài nguyên hoặc background process.
5. Đảm bảo `Container.close()` đóng Browser Runtime/Update Runtime, cache và DB theo đúng thứ tự; không đóng global dependency ngoài quyền sở hữu của Container.
6. `bootstrap/server.ts` chỉ điều phối init, Container, app, listen và shutdown; không chứa business rules.

**Điều kiện hoàn tất:** không còn import root `repositories/`, root service singleton, global `getDb/getRedis/withVault/withSessionDb` trong Container.

### GAP-14 — Legacy implementation chưa được loại bỏ hoặc khoanh vùng rõ

**Bằng chứng:** 35 file cùng đường dẫn trong ZIP có nội dung trùng khớp hoàn toàn với baseline. Các nhóm còn nguyên gồm:

- `database/`: connection, sql, session, vault, backup.
- `repositories/`: email, service, service_email, session.
- `cache/`: email, service_email.
- `utils/`: browser-folder, system, http, guard, logger, version, welcome.
- `services/`: email, source, browser-run, browser-update, browser-fork, external-browser, browser-cdp, proxy-bridge, import-preview và các service/job legacy khác.

Một số legacy modules vẫn đang được code mới import; một số module khác có vẻ thuộc implementation cũ nhưng chưa đủ thông tin để khẳng định không có consumer ngoài ZIP.

**Việc cần làm:**

1. Sau khi hoàn tất GAP-01 đến GAP-13, lập import graph từ `main.ts`/Container và kiểm tra internal consumers.
2. Chuyển mọi consumer còn lại sang Application Ports/Infrastructure adapters mới.
3. Xác minh consumer ở renderer hoặc package khác trước khi xóa `server-client.service.ts`, `proxy-bridge` hoặc module không có internal consumer.
4. Chỉ xóa legacy file sau khi không còn import, không còn runtime entry và không còn external consumer đã xác nhận.
5. Không giữ song song hai implementation chỉ để tương thích trong nội bộ source nếu không có compatibility boundary rõ ràng.

**Điều kiện hoàn tất:** không còn implementation duplicate/orphan trong `src/`; file cũ chỉ được giữ nếu có consumer được xác minh và ownership rõ ràng.

### GAP-15 — Security review chưa được thể hiện trong source

**Bằng chứng:**

- `app.ts:14-20` vẫn cấu hình `cors({ origin: '*' })`.
- Quét source không tìm thấy auth middleware/token verification; không có auth module trong ZIP.
- Profile server xử lý browser login/password/TOTP/session data và browser profile database.

**Việc cần làm:**

1. Xác định rõ server chỉ chạy local/trusted network hay có thể bind ra network rộng.
2. Quyết định CORS allowlist theo deployment policy; không tự đổi origin nếu chưa biết renderer origin thực tế.
3. Xác định authentication/authorization boundary và quyền truy cập profile/credential data.
4. Review log redaction, response exposure, backup permissions, password/TOTP handling và browser database temp copies.
5. Viết security test hoặc checklist deployment tương ứng.

**Điều kiện hoàn tất:** có policy được xác nhận và test/verification; không mặc định coi `origin: '*'` là production-safe.

### GAP-16 — Chưa thể xác nhận build, test và renderer compatibility

**Bằng chứng:** hai ZIP chỉ chứa source TypeScript; không có `package.json`, `tsconfig`, test config, test files, renderer source hoặc API client contract.

**Việc cần làm khi có repository đầy đủ:**

1. Chạy typecheck/build/lint theo scripts thực tế.
2. Viết API contract tests cho đủ 79 route registrations: method, path, params, query/body, status code và response envelope.
3. Viết startup order tests xác minh pre-listen/post-listen sequence và failure policy.
4. Viết integration tests cho migration, profile transfer, source sync, browser lifecycle và multi-profile DB isolation.
5. Đối chiếu renderer API calls trước khi kết luận endpoint payload/status không đổi.

**Điều kiện hoàn tất:** build/lint/test pass trong repository gốc; API behavior và data compatibility có bằng chứng kiểm thử.

---

## 2. Thứ tự triển khai đề xuất

Thứ tự dưới đây xử lý dependency theo chiều từ boundary/adapter tới use case và composition. Không cần tạo lại những phần đã hoàn thành như `main.ts`, `app.ts`, các route/controller class hay startup runner; chỉ chỉnh chúng khi thay đổi dependency.

### Phase A — Chuẩn hóa Errors và API boundary

1. Tạo `application/errors/app.error.ts`.
2. Chuyển response/params helper sang `api/http/`.
3. Chuyển async wrapper/error handler sang `api/middleware/`.
4. Thay toàn bộ `utils/http` imports trong Application/Infrastructure/API.
5. Tách validation thuần khỏi `utils/guard.ts`; không để validation helper kéo HTTP concern vào Application.

**Exit criteria:** Application/Domain/Infrastructure không import `utils/http`; API là nơi duy nhất map Application Error thành HTTP response.

### Phase B — Hoàn thiện Domain contracts và Persistence adapters

1. Chuyển `domain/mappers.ts` sang `infrastructure/persistence/mappers/`.
2. Định nghĩa Domain/Application records không phụ thuộc DB Row hoặc mapper function.
3. Implement Profile, Source và Activity repositories.
4. Chuyển main/per-profile/vault/backup DB lifecycle sang Infrastructure factories.
5. Chuyển backup storage và cache thành concrete adapters do Container sở hữu.
6. Gỡ global DB accessor khỏi Application và repository implementation mới.

**Exit criteria:** toàn bộ repository ports được Infrastructure triển khai; Application không còn SQL/connection access.

### Phase C — Tách Filesystem và Browser adapters

1. Tạo Profile Folder Storage adapter.
2. Tạo Source Scanner và Import Folder Reader adapters.
3. Tạo Browser Profile Data Reader adapter.
4. Di chuyển fork catalog, external process discovery, CDP và proxy bridge vào Infrastructure.
5. Chuẩn hóa Browser Launcher/Updater thành adapters; tạo Application-facing ports.
6. Chuyển system info, folder validation, logger/version và backup IO về module sở hữu tương ứng.

**Exit criteria:** không có Controller/Application import trực tiếp `utils/browser-folder`, `utils/system` hoặc root `services/` technical modules.

### Phase D — Tách và làm sạch Application use cases

1. Tách `ProfileTransferService` khỏi `ProfileService`.
2. Tách `SourceScanner` khỏi `SourceService`; tách `SourceSyncService` để điều phối sync.
3. Chuyển Import Preview thành Application use case sử dụng filesystem port.
4. Chuyển Browser Data thành Application service instance có constructor/factory injection.
5. Bổ sung Browser Session và Browser Update Application services.
6. Chuyển Import/Transfer/Update jobs sang dependency interfaces và lifecycle rõ ràng.
7. Xóa Node filesystem/database/browser imports khỏi Application.

**Exit criteria:** Application Services chỉ chứa use case orchestration và business policy; không thao tác OS, browser process, file hoặc SQLite.

### Phase E — Rewire Controllers, Container và Startup

1. Controllers chỉ nhận Application services.
2. Source Imports Controller không gọi legacy preview/validation helpers.
3. Browser Sessions/Updates Controllers không import Infrastructure types.
4. Container dùng `AppConfig`, tạo và sở hữu mọi adapter/service/controller/task.
5. Startup tasks nhận Application service/ports; không tạo global state.
6. Kiểm tra lifecycle close/dispose cho browser, updater, cache, DB và job store.
7. Giữ nguyên thứ tự startup và startup failure policy.

**Exit criteria:** Container là Composition Root thực sự; không còn legacy singleton trong active dependency graph.

### Phase F — Legacy cleanup, contract tests và security review

1. Tạo import graph và xử lý orphan/duplicate legacy modules.
2. Chỉ xóa file sau khi xác minh consumer nội bộ và consumer ngoài ZIP.
3. Test đủ 79 endpoints, response/status/payload/envelope.
4. Test migration, startup order, source sync, profile transfer, browser data và shutdown.
5. Kiểm tra multi-profile isolation và rollback/partial-failure behavior.
6. Hoàn thành CORS/auth/credential/logging/backup security review.
7. Chạy build/lint/typecheck/test trong repository gốc.

**Exit criteria:** không còn duplicate implementation; behavior/API/data compatibility được xác nhận bằng test; các dependency rules bên dưới đều pass.

---

## 3. Definition of Done cho phần còn lại

### Architecture

- [ ] Application/Domain không import Express, `fs`, `path`, `child_process`, SQLite, root `database/`, root `repositories/`, root `services/`, `utils/http`, `utils/browser-folder` hoặc `utils/system`.
- [ ] Domain không import Infrastructure, API, utils hoặc persistence mapper.
- [ ] Domain không chứa DB Row, HTTP DTO, Chrome/browser protocol type.
- [ ] Persistence mapper nằm trong Infrastructure.
- [ ] Tất cả repository ports đều có adapter implementation được Container wire.
- [ ] Profile transfer là use case riêng.
- [ ] Source scanning là adapter; Source Sync là Application orchestration.
- [ ] Browser data, launcher, updater, process discovery và folder storage có boundary/ports phù hợp.

### API và composition

- [ ] 79 route registrations được giữ nguyên method/path.
- [ ] Request/query/body, status code, response envelope và error format được xác nhận bằng contract tests.
- [ ] Controller chỉ gọi Application Service.
- [ ] Routes chỉ khai báo method/path/middleware/controller.
- [ ] API middleware/http helpers nằm trong `api/`.
- [ ] `AppError` nằm trong `application/errors/`; API middleware map sang HTTP.
- [ ] Container dùng config và là nơi duy nhất wire concrete Infrastructure.
- [ ] Không còn global singleton trong active dependency graph nếu state/lifecycle thuộc runtime instance.

### Persistence và lifecycle

- [ ] Main DB, per-profile session DB, vault DB và backup DB giữ đúng file path/schema/transaction semantics.
- [ ] Cache keys, TTL và invalidation giữ nguyên.
- [ ] Browser process, temp folders, updater jobs, import jobs và transfer jobs có owner/lifecycle xác định.
- [ ] Graceful shutdown đóng HTTP/browser runtime trước cache/database theo đúng policy.
- [ ] Multi-profile isolation không bị phá vỡ.

### Behavior và security

- [ ] Migration legacy service emails không mất dữ liệu khi một profile thất bại.
- [ ] Source reconcile/sync giữ behavior local/custom/missing-folder.
- [ ] Profile transfer giữ merge/conflict/move/duplicate/cancel/partial failure.
- [ ] Browser history/login/password/fingerprint/extension state giữ output và locking semantics.
- [ ] CORS/auth/credential/TOTP/browser DB/backup/logging đã được review và có policy xác nhận.
- [ ] Build/lint/typecheck/unit/integration tests chạy trong repository đầy đủ.

---

## 4. Các file không được xóa ngay

Một số file chưa có consumer rõ ràng trong source snapshot hoặc có thể được dùng bởi renderer/other package. Chỉ xóa sau khi tìm được toàn bộ consumer:

- `services/server-client.service.ts`
- `services/proxy-bridge.service.ts`
- `services/browser-cdp.service.ts`
- `services/browser-fork.service.ts`
- Các legacy service/job còn tồn tại sau khi đã chuyển use case mới

`server-client.service.ts` đã được plan ban đầu đánh dấu cần xác minh consumer ngoài ZIP. Không xem việc file không được Container import là bằng chứng đủ để xóa.

---

## 5. Quy tắc triển khai

1. Không đổi URL, HTTP method, payload, status code, response envelope hoặc startup order trong đợt hoàn thiện kiến trúc.
2. Không tạo folder/file chỉ để làm đẹp cây thư mục; chỉ tạo adapter/port khi có capability boundary hoặc nhu cầu test/thay thế thực tế.
3. Không tạo `BaseService`, `BaseRepository`, `BaseController` nếu không có behavior/contracts thực sự dùng chung.
4. Không tạo Application service locator hoặc truyền cả Container vào use case.
5. Không đổi DB schema, data path hoặc migration semantics trong structural refactor.
6. Không xóa legacy code khi chưa xác minh external consumer.
7. Mỗi phase phải compile/test được trong repository đầy đủ trước khi tiếp tục phase tiếp theo.

## 6. Dependency checks sau khi hoàn tất

Chạy trong thư mục source thực tế:

```bash
# Application và Domain không phụ thuộc framework, filesystem hay process implementation
grep -RInE "from 'express'|better-sqlite3|child_process|from 'fs'|from 'path'" src/application src/domain

# Application không truy cập global DB/cache/session/vault singleton
grep -RInE 'getDb\(\)|getRedis\(\)|withSessionDb\(|withVault\(' src/application

# Domain không chứa persistence mapper/DB Row/browser helper
grep -RInE 'type Row|mapEmail|mapSource|mapService|mapSession|browser-folder|utils/' src/domain

# API không import concrete infrastructure hoặc legacy service/repository singleton
grep -RInE 'infrastructure/|repositories/|services/.*\.service|utils/browser-folder|utils/system' src/api

# Không còn utility HTTP xuyên layer
grep -RInE 'utils/http|api/http|express' src/application src/domain src/infrastructure

# Container không wiring legacy global singleton
grep -RInE 'getDb|getRedis|emailRepository|sourceRepository|browserRunService\s*=' src/bootstrap/container.ts
```

> Các lệnh `grep` là guard kiểm tra nhanh; cần kết hợp typecheck, test và import graph để xác nhận đầy đủ.
