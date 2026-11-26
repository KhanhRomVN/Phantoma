# Kế hoạch Restructure + Clean Architecture — Profile Server

> Giai đoạn 1 — Lập kế hoạch. Planner không sửa source code trong ZIP.
> Phạm vi quét: toàn bộ `profile(1).zip` được cung cấp. ZIP có 46 file TypeScript, khoảng 5.854 dòng; 8 route modules với 79 endpoint. Ngày quét: 2026-11-25.
> Mục tiêu: chuẩn hóa theo baseline chung của các server Phantoma: `main.ts`, `app.ts`, `bootstrap/`, `startup/` bắt buộc, `api/`, `application/`, `domain/`, `infrastructure/`; bổ sung Controller, Container và constructor injection; cải thiện dependency direction, Domain separation, Infrastructure separation và giữ Module Cohesion theo mẫu Code.
> Đây là kế hoạch cấu trúc. Không thay đổi URL, HTTP method, payload, status code, response envelope, hành vi quản lý profile/browser hoặc thứ tự startup trong các phase đầu.

## 0. Tóm tắt

- **Hiện trạng:** 46 file TypeScript / khoảng 5.854 dòng. Server có Express, SQLite chính, SQLite theo profile (session/vault), backup database, Redis-compatible cache, 5 repository modules, 8 route modules và nhiều service module. Toàn bộ lifecycle nằm trong `index.ts`; Route gọi trực tiếp service singleton; chưa có Controller, `app.ts` hoặc Container.
- **Vấn đề chính:** `email.route.ts` (347 dòng) trộn profile CRUD/transfer, profile activity và browser data; `source.route.ts` (128 dòng) trộn source CRUD/sync, system folder validation, import preview và background jobs. `email.service.ts` (500 dòng) vừa quản lý profile vừa xử lý transfer/merge/copy folder. `source.service.ts` (299 dòng) vừa điều phối source vừa scan filesystem và parse Chrome profile. `utils/browser-folder.ts` (828 dòng) gom profile folder lifecycle, copy/move, browser metadata, history, login, password và fingerprint database access.
- **Dependency direction:** Application service import concrete repository, config singleton, cache và filesystem helper. Repository cũng truy cập global DB, filesystem, config và `AppError` từ HTTP helper. `domain/mappers.ts` thực chất là persistence mapper/API projection. `utils/http.ts` trộn Application Error, Express middleware, response envelope và parameter parsing.
- **Mục tiêu:** Routes chỉ khai báo route; Controllers xử lý HTTP mapping; Application Services tổ chức use case; Domain sở hữu model và business invariant; Infrastructure triển khai SQLite, profile filesystem, browser process/data, cache, system info, backup và external process. Container là composition root duy nhất wiring concrete adapter.
- **Startup bắt buộc:** Mọi server đều có `startup/startup.runner.ts`. Profile startup phải giữ thứ tự: banner/config → main DB → migrate legacy service emails → dọn browser temp dirs → reconcile sources → sync các local source phù hợp → listen → auto-install browser nếu thiếu. Các bước trước listen và sau listen cần được phân phase rõ ràng.
- **Quy mô refactor:** 5 phase; ưu tiên foundation/lifecycle, controller extraction, DI + ports, domain/infrastructure split, sau cùng kiểm thử tương thích. Không tách file chỉ theo số dòng; ưu tiên boundary nghiệp vụ và adapter thực tế.
- **Ràng buộc:** ZIP không kèm `package.json`, `tsconfig`, test config, renderer source hoặc API client contract. Không tự giả định build/test command, không đổi renderer-facing API contract khi chưa đối chiếu consumer.

## Chuẩn kiến trúc chung áp dụng cho mọi server

Code, Emulate, Proxy và Profile dùng chung root architecture. Chỉ các module nghiệp vụ và technical adapters được phép khác nhau. `startup/` là bắt buộc ở mọi server; không coi đây là folder tùy chọn.

### Cấu trúc root chuẩn

```text
src/
├── main.ts
├── app.ts
├── bootstrap/
│   ├── container.ts
│   └── server.ts
├── startup/
│   ├── startup.runner.ts
│   ├── presentation/
│   └── tasks/
├── config/
├── api/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── contracts/
│   └── http/
├── application/
│   ├── errors/
│   ├── ports/
│   └── services/
├── domain/
├── infrastructure/
│   └── persistence/
│       ├── sqlite/
│       ├── repositories/
│       └── mappers/
└── utils/
```

### Quy ước bắt buộc

| Thành phần | Quy ước |
|---|---|
| `main.ts` | Entry point duy nhất ở root; nạp environment trước config và gọi `startServer()` |
| `app.ts` | Export `createApp()`; dựng Express pipeline, không init DB, không tạo Container, không listen |
| `bootstrap/container.ts` | Composition Root; tạo persistence/cache/browser/process adapters, application services, Controllers và startup dependencies |
| `bootstrap/server.ts` | Điều phối DB/cache init, Container, `createApp`, HTTP listen, signal handlers và graceful shutdown |
| `startup/` | Bắt buộc; `startup.runner.ts` điều phối pre-listen/post-listen tasks; không sở hữu DB connection, listen hoặc process shutdown |
| `api/` | Toàn bộ HTTP transport: Controllers, Routes, middleware, contracts và HTTP helpers; không tạo root `http/` |
| `application/` | Use cases, ports và application errors; không import Express, SQLite, Node fs, child process hoặc concrete adapter |
| `domain/` | Entity, value object, enum và invariant nghiệp vụ; không chứa DB Row, HTTP DTO hoặc browser/process protocol types |
| `infrastructure/` | Concrete SQLite, repository, filesystem, browser, cache, process, system, backup và logging adapters |
| Constants / Types | Đặt cạnh module sở hữu; không tạo root `constants/` hoặc root `types/` để gom mọi thứ |
| Errors | `application/errors/` giữ lỗi use case; `api/middleware/error-handler.middleware.ts` ánh xạ sang HTTP response; không giữ root `errors/` |

### Dependency direction

```text
main.ts
  └── bootstrap/server.ts
        ├── bootstrap/container.ts ──► infrastructure adapters
        │                                │ implements
        │                                ▼
        │                         application ports
        │                                ▲
        │                                │ used by
        │                         application services ──► domain
        │                                ▲
        │                                │
        ├── startup/startup.runner.ts ──► startup tasks ──► application services/ports
        │
        └── app.ts ──► api/routes ──► api/controllers ──► application services

Domain        ──► không phụ thuộc layer khác
Infrastructure ──► application ports + domain khi cần
API           ──► application services/contracts/errors; không import concrete infrastructure
Startup       ──► application services/ports qua dependencies được inject
```

`bootstrap/container.ts` là nơi duy nhất biết cả Application và concrete Infrastructure để wiring. `app.ts`, `api/routes/`, `api/controllers/`, `application/` và `startup/` không được import `Container` hoặc concrete repository/service singleton.

## 1. Hiện trạng

### 1.1 Cây thư mục hiện tại

```text
src/
├── cache/
│   ├── email.cache.ts
│   └── service_email.cache.ts
├── config/
│   └── server.config.ts
├── database/
│   ├── backup.ts
│   ├── connection.ts
│   ├── session.ts
│   ├── sql.ts
│   └── vault.ts
├── domain/
│   └── mappers.ts
├── index.ts
├── repositories/
│   ├── email.repository.ts
│   ├── query.repository.ts
│   ├── service.repository.ts
│   ├── service_email.repository.ts
│   └── session.repository.ts
├── routes/
│   ├── browser-run.route.ts
│   ├── browser-update.route.ts
│   ├── email.route.ts
│   ├── query.route.ts
│   ├── routes.ts
│   ├── service.route.ts
│   ├── service_email.route.ts
│   ├── session.route.ts
│   └── source.route.ts
├── services/
│   ├── backup.service.ts
│   ├── browser-fork.service.ts
│   ├── browser-run.service.ts
│   ├── browser-update.service.ts
│   ├── email.service.ts
│   ├── external-browser.service.ts
│   ├── import-job.service.ts
│   ├── import-preview.service.ts
│   ├── query.service.ts
│   ├── server-client.service.ts
│   ├── service.service.ts
│   ├── service_email.service.ts
│   ├── session.service.ts
│   ├── source.service.ts
│   └── transfer-job.service.ts
└── utils/
    ├── browser-folder.ts
    ├── guard.ts
    ├── http.ts
    ├── logger.ts
    ├── system.ts
    ├── version.ts
    └── welcome.ts
```

### 1.2 Quy mô và file cần ưu tiên

| File | Dòng | Vai trò hiện tại / nhận định |
|---|---:|---|
| `utils/browser-folder.ts` | 828 | Trộn profile folder lifecycle, copy/move, browser executable, session/history/login/password/fingerprint DB access; cần chia theo adapter capability |
| `services/email.service.ts` | 500 | Profile CRUD, relations/cache, folder provisioning và transfer/merge; cần tách transfer use case khỏi profile CRUD |
| `routes/email.route.ts` | 347 | 34 endpoint; trộn profile, activity, browsing và browser data; cần tách theo capability |
| `services/browser-run.service.ts` | 310 | Browser process lifecycle, temp directories, in-memory active process state; Application orchestration + process adapter hiện bị trộn |
| `services/source.service.ts` | 299 | CRUD/import/preview/reconcile/sync và Chrome profile scan/parse; cần tách source use case với source scanner |
| `repositories/service.repository.ts` | 275 | Trong một file có source repository, service catalog repository và nhiều profile activity child repositories |
| `services/browser-update.service.ts` | 236 | Download/extract executable, network access, filesystem và job state; phần binary update thuộc Infrastructure |
| `services/import-job.service.ts` | 171 | In-memory job state, progress/cancellation và import orchestration; cần inject job store/runner dependencies |
| `services/transfer-job.service.ts` | 124 | In-memory transfer job state và cancellation; cần quản lý lifecycle qua Container |
| `services/external-browser.service.ts` | 179 | Quét external browser/process; thuộc Infrastructure/browser adapter |
| `domain/mappers.ts` | 107 | Chuyển DB row thành output model; không phải Domain logic |
| `database/connection.ts` | 150 | Main SQLite connection/schema/migrations và global connection |
| `database/vault.ts` | 105 | Per-profile service email vault DB và legacy database lookup |
| `database/backup.ts` | 149 | Backup/mirror database implementation |
| `index.ts` | 100 | Express setup, DB init, migrations, sync source, listen và shutdown |

### 1.3 API inventory

Tổng cộng 79 endpoint được khai báo trong 8 route modules. Refactor Controller/Route phải giữ nguyên method, path, status và response.

| Route hiện tại | Endpoint | Trách nhiệm hiện tại | Hướng tách đích |
|---|---:|---|---|
| `email.route.ts` | 34 | Profile CRUD/bulk/transfer, footprints, scripts, devices, browsing, browser metadata/data | `profiles`, `profile-activity`, `profile-browser-data` controllers/routes |
| `source.route.ts` | 18 | Source CRUD/import/sync, system folder validate/preview/read, import job, transfer job | `sources`, `source-imports`, `profile-jobs` controllers/routes |
| `session.route.ts` | 6 | Per-profile session records | `sessions` controller/route |
| `query.route.ts` | 5 | Saved query CRUD | `queries` controller/route |
| `service.route.ts` | 5 | Service catalog CRUD | `services` controller/route |
| `browser-run.route.ts` | 4 | Browser launch/status/stop/runtime operations | `browser-sessions` controller/route |
| `service_email.route.ts` | 4 | Service email CRUD for a profile | `service-emails` controller/route |
| `browser-update.route.ts` | 3 | Browser version/install operations | `browser-updates` controller/route |

**Quy tắc:** chỉ di chuyển nơi khai báo route và handler. Không đổi `/api/v1` prefix, URL, HTTP method, query/body field, response envelope, status code hoặc semantics trong phase restructure. Đặc biệt giữ nguyên `/profiles` URL vì route hiện tại ghi chú renderer vẫn gọi prefix đó (`routes/email.route.ts:28`).

### 1.4 Các vấn đề đã xác minh

| ID | Mức | Vấn đề | Bằng chứng |
|---|---|---|---|
| PF01 | Cao | `index.ts` làm cả Express composition, health endpoint, DB init, migration, cleanup, source reconcile/sync, listen và shutdown | `index.ts:1-100` |
| PF02 | Cao | Không có Controller boundary; 8 route modules gọi service singleton trực tiếp | `routes/email.route.ts:1-27`; `routes/source.route.ts:1-9`; `routes/routes.ts:1-21` |
| PF03 | Cao | `email.route.ts` trộn Profile CRUD/transfer, activity child resources, browser data và system device fingerprint; trực tiếp import low-level browser-folder functions | `routes/email.route.ts:1-27,69-77,80-184,186-209,211-347` |
| PF04 | Cao | `source.route.ts` trộn source resource, system folder validation/preview, import preview, transfer jobs và import jobs | `routes/source.route.ts:1-8,13-73,75-126` |
| PF05 | Cao | `email.service.ts` trộn profile CRUD/cache/relations với transfer planning, conflict comparison, merge, folder move/copy | `services/email.service.ts:93-197,199-307,308-487` |
| PF06 | Cao | `browser-folder.ts` là module 828 dòng, trộn folder operations, copy/move transfer, browser executable, session/history, cookies/login, password và fingerprint SQLite | `utils/browser-folder.ts:24-193,231-362,370-398,411-441,445-689,709-828` |
| PF07 | Cao | `source.service.ts` trộn source application workflow, filesystem checks, Chrome profile scanning/parsing, import preview và sync | `services/source.service.ts:18-112,114-239,240-300` |
| PF08 | Trung | `service.repository.ts` gộp source, service catalog và 4 loại child activity repositories | `repositories/service.repository.ts:29-134,136-177,179-276` |
| PF09 | Trung | `service_email.repository.ts` vừa repository vừa chứa legacy migration procedure được gọi từ root bootstrap | `repositories/service_email.repository.ts:36-94,96-133`; `index.ts:8,55` |
| PF10 | Trung | Repository phụ thuộc global DB, filesystem, config, system helper, Domain mapper và HTTP AppError | `repositories/service.repository.ts:1-27,42-59,85-126` |
| PF11 | Trung | `domain/mappers.ts` là persistence mapping layer, không phải business Domain | `repositories/service.repository.ts:17-25`; `domain/mappers.ts:1-107` |
| PF12 | Trung | `utils/http.ts` trộn AppError, Express error middleware, response envelope, handler wrapper và request validation | `utils/http.ts:1-50`; được dùng từ route, repository và service |
| PF13 | Trung | `utils/guard.ts` phụ thuộc AppError từ HTTP helper, khiến validation helper ngoài API layer bị kéo theo HTTP concern | `utils/guard.ts:1-7` |
| PF14 | Trung | Browser process, updater, fork discovery và external process scanning nằm ngang hàng Application Services dù trực tiếp phụ thuộc OS/network/fs/child_process | `services/browser-run.service.ts:1-310`; `browser-update.service.ts:1-236`; `browser-fork.service.ts:1-108`; `external-browser.service.ts:1-179` |
| PF15 | Trung | `browserRunService`, browser updater, job services và cache giữ module-level process/job/cache state; lifecycle khó kiểm soát khi test hoặc tạo nhiều app instance | `services/browser-run.service.ts`; `services/browser-update.service.ts:22-27,76-77`; `services/import-job.service.ts`; `services/transfer-job.service.ts`; `cache/email.cache.ts:1-44` |
| PF16 | Trung | Source/email/application services phụ thuộc trực tiếp các repository singleton, cache singleton và global config | `services/email.service.ts:1-40`; `services/source.service.ts:1-17`; `services/service_email.service.ts`; `services/session.service.ts` |
| PF17 | Trung | Main DB, per-profile session DB, service-email vault DB và backup DB chưa được nhóm thành persistence adapters riêng | `database/connection.ts`; `database/session.ts`; `database/vault.ts`; `database/backup.ts` |
| PF18 | Trung | `utils/system.ts` chứa OS/system info và folder validation; `utils/logger.ts` là logging adapter; `utils/welcome.ts` là startup presentation, không phải pure utility | `utils/system.ts:1-139`; `utils/logger.ts:1-167`; `utils/welcome.ts:1-85` |
| PF19 | Trung | Import preview, folder validation và browser profile scan bị gọi trực tiếp từ Route hoặc Application service thay vì inject scanner/validator adapter | `routes/source.route.ts:7-8,57-73`; `services/source.service.ts:38-112`; `services/import-preview.service.ts` |
| PF20 | Thấp | `server-client.service.ts` không có consumer nội bộ trong ZIP; config `AppConfig` không khai báo `serverUrl`, nên quan hệ với server khác chưa được xác minh | `services/server-client.service.ts:1-13`; `config/server.config.ts:4-10,22-36` |
| PF21 | Cao | CORS hiện cho phép `origin: '*'`; Profile xử lý dữ liệu đăng nhập, password, TOTP/session browser và credential. ZIP không thể hiện auth middleware | `index.ts:24-30`; `routes/email.route.ts:211-347`; `utils/browser-folder.ts:511-578,709-828` |

### 1.5 Startup hiện tại cần bảo toàn

Nguồn sự thật: `index.ts:49-97`.

| Thứ tự | Hành động hiện tại | Vị trí đích | Quy tắc bảo toàn |
|---:|---|---|---|
| 1 | `printBanner()` | `startup/presentation/server-banner.ts` | In trước config/DB như hiện tại |
| 2 | `getConfig()` + `initDb(cfg.dbPath)` | `bootstrap/server.ts` + infrastructure persistence | DB phải sẵn sàng trước migration/reconcile |
| 3 | `migrateLegacyServiceEmails()` | `startup/tasks/migrate-legacy-service-emails.task.ts` gọi migration port | Giữ migration trước temp cleanup và source sync; giữ semantics per-record/error logging hiện tại |
| 4 | `browserRunService.sweepTempDirs()` | `startup/tasks/sweep-browser-temp-dirs.task.ts` | Chạy sau main DB init, trước source reconcile |
| 5 | `sourceService.reconcile()` | `startup/tasks/reconcile-and-sync-local-sources.task.ts` | Giữ trước `list()` và sync |
| 6 | `sourceService.list()`; warning khi không có source; log từng source; kiểm tra folder tồn tại; `syncSource()` với source local có location hợp lệ | Cùng startup task hoặc task con được gọi theo thứ tự | Không sync remote/non-local source; giữ warning khi folder missing và lần lượt await từng source |
| 7 | Mount routes và error handler | `app.ts` | App factory dựng Express middleware/route; không gắn migration hoặc business startup vào đây |
| 8 | `app.listen()` | `bootstrap/server.ts` | Chỉ listen sau pre-listen startup tasks thành công theo semantics hiện tại |
| 9 | `printStarted()` | `startup/presentation/server-banner.ts` | Chỉ chạy trong listen callback |
| 10 | `browserUpdateService.autoInstallIfMissing()` | `startup/tasks/auto-install-missing-browser.task.ts` — phase `after-listen` | Chỉ chạy sau listen; lỗi non-fatal và warning như hiện tại |
| 11 | SIGTERM/SIGINT: close HTTP, browser shutdown, Redis close, DB close, exit | `bootstrap/server.ts` | Graceful shutdown; thứ tự dừng runtime trước khi đóng dependency |

**Phân phase runner:** `startup.runner.ts` hỗ trợ danh sách task `before-listen` và `after-listen`, chạy tuần tự. `bootstrap/server.ts` gọi pre-listen phase trước `listen()`, sau đó gọi post-listen phase từ listen callback. Runner không tự mở DB, tạo Container hoặc listen.

## 2. Kiến trúc đích

### 2.1 Cây thư mục mục tiêu

Đây là cây đích được định hướng theo capability, không phải yêu cầu tạo file rỗng. Chỉ tạo port/adapter khi có boundary thực sự cần thay thế hoặc test độc lập.

```text
src/
├── main.ts
├── app.ts
│
├── bootstrap/
│   ├── container.ts
│   └── server.ts
│
├── startup/
│   ├── startup.runner.ts
│   ├── presentation/
│   │   └── server-banner.ts
│   └── tasks/
│       ├── migrate-legacy-service-emails.task.ts
│       ├── sweep-browser-temp-dirs.task.ts
│       ├── reconcile-and-sync-local-sources.task.ts
│       └── auto-install-missing-browser.task.ts
│
├── config/
│   └── server.config.ts
│
├── api/
│   ├── controllers/
│   │   ├── profiles.controller.ts
│   │   ├── profile-activity.controller.ts
│   │   ├── profile-browser-data.controller.ts
│   │   ├── sources.controller.ts
│   │   ├── source-imports.controller.ts
│   │   ├── profile-jobs.controller.ts
│   │   ├── sessions.controller.ts
│   │   ├── queries.controller.ts
│   │   ├── services.controller.ts
│   │   ├── service-emails.controller.ts
│   │   ├── browser-sessions.controller.ts
│   │   └── browser-updates.controller.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── profiles.routes.ts
│   │   ├── profile-activity.routes.ts
│   │   ├── profile-browser-data.routes.ts
│   │   ├── sources.routes.ts
│   │   ├── source-imports.routes.ts
│   │   ├── profile-jobs.routes.ts
│   │   ├── sessions.routes.ts
│   │   ├── queries.routes.ts
│   │   ├── services.routes.ts
│   │   ├── service-emails.routes.ts
│   │   ├── browser-sessions.routes.ts
│   │   └── browser-updates.routes.ts
│   ├── middleware/
│   │   ├── async-handler.middleware.ts
│   │   └── error-handler.middleware.ts
│   ├── contracts/
│   └── http/
│       ├── response.ts
│       └── params.ts
│
├── application/
│   ├── errors/
│   │   └── app.error.ts
│   ├── ports/
│   │   ├── repositories/
│   │   ├── storage/
│   │   ├── browser/
│   │   ├── cache/
│   │   ├── process/
│   │   ├── system/
│   │   └── jobs/
│   └── services/
│       ├── profiles/
│       │   ├── profile.service.ts
│       │   └── profile-transfer.service.ts
│       ├── profile-activity/
│       │   └── profile-activity.service.ts
│       ├── sources/
│       │   ├── source.service.ts
│       │   └── source-sync.service.ts
│       ├── browser-sessions/
│       │   └── browser-session.service.ts
│       ├── browser-data/
│       │   └── profile-browser-data.service.ts
│       ├── browser-updates/
│       │   └── browser-update.service.ts
│       ├── sessions/
│       │   └── session.service.ts
│       ├── service-catalog/
│       │   └── service.service.ts
│       ├── service-emails/
│       │   └── service-email.service.ts
│       ├── queries/
│       │   └── query.service.ts
│       ├── imports/
│       │   ├── import-preview.service.ts
│       │   └── import-job.service.ts
│       ├── transfers/
│       │   └── transfer-job.service.ts
│       └── backups/
│           └── backup.service.ts
│
├── domain/
│   ├── profiles/
│   ├── sources/
│   ├── sessions/
│   ├── service-catalog/
│   └── queries/
│
├── infrastructure/
│   ├── persistence/
│   │   ├── sqlite/
│   │   │   ├── main/
│   │   │   ├── per-profile/
│   │   │   └── backup/
│   │   ├── repositories/
│   │   └── mappers/
│   ├── storage/
│   │   ├── profile-folders/
│   │   └── backups/
│   ├── filesystem/
│   │   ├── source-scanner/
│   │   └── import-folders/
│   ├── browser/
│   │   ├── catalog/
│   │   ├── launcher/
│   │   ├── updater/
│   │   ├── external-process/
│   │   └── profile-data/
│   ├── cache/
│   ├── process/
│   ├── system/
│   └── logging/
│
└── utils/
```

`api/contracts/` chỉ chứa transport DTO dùng bởi HTTP. Entity/value object thuộc Domain; DB row thuộc Infrastructure; browser/Chrome protocol type thuộc adapter sở hữu. Không tạo root `types/`, `constants/`, `errors/`, `http/` hoặc `startup/` phụ ở nơi khác.

### 2.2 Trách nhiệm từng layer

| Layer | Chịu trách nhiệm | Không được làm |
|---|---|---|
| API Routes | Khai báo method/path, gắn middleware và Controller | Parse nghiệp vụ phức tạp, gọi repository, import browser-folder hoặc service singleton |
| API Controllers | Validate/normalize HTTP input, gọi use case, ánh xạ output/status/response | Tự thao tác SQLite, filesystem, browser process hoặc cache |
| Application Services | Profile CRUD/transfer, source reconcile/sync, browser session use cases, activity/query/catalog workflows | Import Express, `better-sqlite3`, `fs`, `child_process`, concrete adapters |
| Application Ports | Contract cho profile/source/session/activity repositories, folder storage, browser launcher/data reader, cache, job state, system info | Import implementation hoặc framework |
| Domain | Profile/source/session/query/service catalog models và business invariants có thật | Biết browser executable, Chrome SQLite layout, HTTP DTO hoặc DB Row |
| Infrastructure Persistence | Main SQLite, per-profile session/vault DB, backup DB, repositories và row mappers | Chứa orchestration của HTTP/startup |
| Infrastructure Browser | Browser discovery/launch/stop/update, external process discovery, đọc browser profile data | Quyết định HTTP status hoặc giữ business merge policy |
| Infrastructure Filesystem | Profile folder provision/remove, source scanning, safe copy/move và import folder IO | Tự quyết định use case profile transfer hoặc ownership policy |
| Startup | Điều phối task theo phase và trình tự; dùng dependency được inject | Listen, init Container, tự tạo global singleton hoặc chứa implementation DB |
| Bootstrap | Composition Root, init/close resources, HTTP listen, signal handlers | Chứa profile/source business rules |

### 2.3 Module Cohesion — nhóm theo năng lực nghiệp vụ

Giữ cách nhóm theo module nghiệp vụ như Code; không chia toàn bộ dự án thành `controllers/`, `services/`, `helpers/` chung rồi để các phần liên quan rải rác.

| Module | Use cases/ownership | Infrastructure liên quan |
|---|---|---|
| `profiles` | Profile CRUD, bulk update/delete, relation summary, folder open, transfer preview/merge policy | Profile repository, profile folder storage, profile file store |
| `profile-activity` | Footprints, script runs, device activities, browsing entries và range queries | Activity repositories, profile browser-data reader |
| `sources` | Source CRUD/import, reconcile, scan/sync local Chrome profile | Source repository, source scanner, filesystem validation |
| `browser-sessions` | Launch/status/stop browser process, active session state, stale temp cleanup | Browser launcher, process manager, temp-folder storage |
| `browser-data` | Folder info, avatar, login/session detection, history, saved logins, passwords, extension state, fingerprint history | Browser profile data reader, per-profile SQLite adapters |
| `browser-updates` | Version status, download/install update job, auto-install use case | Network downloader, archive extractor, filesystem, browser catalog |
| `sessions` | Per-profile session record CRUD | Per-profile session database/repository |
| `service-catalog` | Service template/catalog CRUD | Main SQLite repository |
| `service-emails` | Credentials/service-email data attached to a profile | Per-profile vault database, encryption/cache adapter |
| `queries` | Saved query CRUD | Main SQLite repository |
| `imports` | Folder preview, file parsing, import job progress/cancellation | Import folder reader, job store |
| `transfers` | Async profile transfer job lifecycle | Job store + ProfileTransferService |
| `backups` | Backup trigger and coordination | Backup database/file storage |

Không tạo module chỉ vì một file đang tồn tại. Ví dụ `browser-fork` và `external-browser` có thể là sub-capability trong `infrastructure/browser/`; không nhất thiết tạo Application Service nếu chúng chỉ cung cấp dữ liệu kỹ thuật.

## 3. Dependency Injection và Composition Root

### 3.1 Quy tắc DI

- Application Service nhận repository/storage/browser/process/cache/job ports qua constructor.
- Infrastructure Repository nhận database connection hoặc connection provider qua constructor/factory; không gọi global `getDb()`.
- Module state như active browser process, import jobs, transfer jobs, browser updater jobs và Redis client phải thuộc instance do Container tạo và quản lý.
- Controller nhận Application Service qua constructor/factory; Route nhận Controller đã được Container tạo, không tự import singleton.
- Startup task nhận dependency qua constructor/factory. Không import `bootstrap/container.ts` hoặc concrete repository.
- Chỉ inject các dependency thực sự cần; không tạo một `AppContainer` interface khổng lồ làm service locator trong Application.

### 3.2 Container wiring minh họa

```ts
export function createContainer(config: AppConfig) {
  const mainDatabase = createMainDatabase(config.dbPath);
  const cache = createEmailCache(config);
  const sessionDatabaseFactory = createSessionDatabaseFactory(config);
  const vaultDatabaseFactory = createVaultDatabaseFactory(config);

  const profileRepository = new SqliteProfileRepository(mainDatabase);
  const sourceRepository = new SqliteSourceRepository(mainDatabase);
  const activityRepository = new SqliteProfileActivityRepository(mainDatabase);

  const profileFolderStorage = new LocalProfileFolderStorage(config.profilesDir);
  const sourceScanner = new ChromeSourceScanner();
  const browserLauncher = new LocalBrowserLauncher();
  const browserDataReader = new ChromeProfileDataReader(sessionDatabaseFactory, vaultDatabaseFactory);
  const jobStore = new InMemoryJobStore();

  const profileTransferService = new ProfileTransferService(
    profileRepository,
    profileFolderStorage,
  );
  const profileService = new ProfileService(profileRepository, profileFolderStorage, cache);
  const sourceService = new SourceService(sourceRepository, sourceScanner, profileService);
  const browserSessionService = new BrowserSessionService(browserLauncher, profileRepository);

  return {
    services: {
      profileService,
      profileTransferService,
      sourceService,
      browserSessionService,
    },
    controllers: createControllers(/* inject only required services */),
    startupTasks: createStartupTasks(/* inject migration, source, browser services */),
    close: async () => {
      await browserLauncher.shutdownAll();
      await cache.close();
      await mainDatabase.close();
    },
  };
}
```

Đây là wiring minh họa, không phải code copy nguyên trạng. Cần bổ sung các service/repository còn lại theo đúng module thực tế và giữ connection semantics hiện có của main DB, per-profile session DB, vault DB và backup DB.

### 3.3 Error ownership

```text
application/errors/app.error.ts
        │
        ▼
api/middleware/error-handler.middleware.ts
        │ maps
        ▼
HTTP status + current response envelope
```

`AppError` không import Express. Repository không import HTTP error. Nếu Infrastructure gặp lỗi hệ thống, adapter ném lỗi kỹ thuật hoặc map thành application error ở boundary được chỉ định; không phụ thuộc `api/http`.

## 4. Mapping file cũ → file mới

### 4.1 Entry point, startup và API

| Hiện tại | Đích đề xuất | Hành động |
|---|---|---|
| `index.ts` | `main.ts`, `app.ts`, `bootstrap/server.ts` | Tách dotenv/entry, Express factory, DB/container/listen/shutdown |
| `index.ts:51` + `utils/welcome.ts` | `startup/presentation/server-banner.ts` | Chuyển `printBanner` / `printStarted`; giữ thứ tự và output |
| `index.ts:55` | `startup/tasks/migrate-legacy-service-emails.task.ts` | Startup task gọi migration port |
| `index.ts:56` | `startup/tasks/sweep-browser-temp-dirs.task.ts` | Startup task gọi browser session service/port |
| `index.ts:58-71` | `startup/tasks/reconcile-and-sync-local-sources.task.ts` | Task điều phối reconcile, list, warnings và local sync tuần tự |
| `index.ts:79-82` | `startup/tasks/auto-install-missing-browser.task.ts` | Phase `after-listen`; giữ non-fatal catch/log |
| `index.ts:84-93` | `bootstrap/server.ts` | Graceful shutdown và resource disposal |
| `routes/email.route.ts` | `api/routes/{profiles,profile-activity,profile-browser-data}.routes.ts` + controllers | Tách 34 endpoint theo capability, giữ URL |
| `routes/source.route.ts` | `api/routes/{sources,source-imports,profile-jobs}.routes.ts` + controllers | Tách source CRUD/sync, system import preview, async jobs |
| `routes/session.route.ts` | `api/routes/sessions.routes.ts` | Giữ endpoint và response |
| `routes/query.route.ts` | `api/routes/queries.routes.ts` | Giữ endpoint và response |
| `routes/service.route.ts` | `api/routes/services.routes.ts` | Giữ endpoint và response |
| `routes/service_email.route.ts` | `api/routes/service-emails.routes.ts` | Giữ endpoint và response |
| `routes/browser-run.route.ts` | `api/routes/browser-sessions.routes.ts` | Giữ endpoint và response |
| `routes/browser-update.route.ts` | `api/routes/browser-updates.routes.ts` | Giữ endpoint và response |
| `routes/routes.ts` | `api/routes/index.ts` | Chỉ mount router/controller; không chứa business logic |

### 4.2 Application services và module cohesion

| Hiện tại | Đích đề xuất | Hành động |
|---|---|---|
| `services/email.service.ts` — CRUD/cache/relations | `application/services/profiles/profile.service.ts` | Giữ profile use cases, inject ProfileRepository, folder port và cache port |
| `services/email.service.ts` — transfer planning/merge/move | `application/services/profiles/profile-transfer.service.ts` | Tách transfer policy và orchestration; IO folder qua port |
| Child service exports trong `email.service.ts` | `application/services/profile-activity/profile-activity.service.ts` | Gom footprint/script/device/browsing use cases, inject activity ports |
| `services/source.service.ts` | `application/services/sources/source.service.ts` + `source-sync.service.ts` | Use case source tách khỏi scanner và FS parsing |
| `services/browser-run.service.ts` | `application/services/browser-sessions/browser-session.service.ts` | Giữ use-case lifecycle; child process và active process registry qua ports |
| `services/browser-update.service.ts` | `application/services/browser-updates/browser-update.service.ts` | Giữ job/status policy; download/extract thực hiện bởi Infrastructure |
| `services/import-preview.service.ts` | `application/services/imports/import-preview.service.ts` | Giữ preview rules; đọc folder/file qua adapter |
| `services/import-job.service.ts` | `application/services/imports/import-job.service.ts` | Giữ progress/cancel semantics; inject JobStore và import use case |
| `services/transfer-job.service.ts` | `application/services/transfers/transfer-job.service.ts` | Inject JobStore + ProfileTransferService |
| `services/session.service.ts` | `application/services/sessions/session.service.ts` | Inject SessionRepository |
| `services/query.service.ts` | `application/services/queries/query.service.ts` | Inject QueryRepository |
| `services/service.service.ts` | `application/services/service-catalog/service.service.ts` | Inject ServiceCatalogRepository |
| `services/service_email.service.ts` | `application/services/service-emails/service-email.service.ts` | Inject ServiceEmailRepository và cache port |
| `services/backup.service.ts` | `application/services/backups/backup.service.ts` | Điều phối backup qua port |
| `services/browser-fork.service.ts` | `infrastructure/browser/catalog/` | Chuyển binary/fork definitions/discovery nếu chỉ là OS/browser capability |
| `services/external-browser.service.ts` | `infrastructure/browser/external-process/` | Chuyển process scanning và browser detection |
| `services/server-client.service.ts` | Chưa di chuyển đến khi xác minh consumer/config | Xem mục 6; không giữ orphan service chỉ để lấp structure |

### 4.3 Infrastructure, persistence và shared helpers

| Hiện tại | Đích đề xuất | Hành động |
|---|---|---|
| `database/connection.ts` + `database/sql.ts` | `infrastructure/persistence/sqlite/main/` | Main DB connection/schema/query helpers; inject connection |
| `database/session.ts` | `infrastructure/persistence/sqlite/per-profile/session-database.ts` | Factory quản lý session DB theo profile |
| `database/vault.ts` | `infrastructure/persistence/sqlite/per-profile/vault-database.ts` | Factory quản lý service-email/vault DB per profile |
| `database/backup.ts` | `infrastructure/persistence/sqlite/backup/` | Backup database adapter |
| `repositories/email.repository.ts` | `infrastructure/persistence/repositories/profile.repository.ts` + profile file adapter khi cần | Tách DB metadata với email/profile JSON file IO |
| `repositories/query.repository.ts` | `infrastructure/persistence/repositories/query.repository.ts` | Inject main DB |
| `repositories/service.repository.ts` | `service-catalog`, `source`, `profile-activity` repositories riêng | Tách source (1), catalog (1), child activity repositories (4) |
| `repositories/service_email.repository.ts` | `infrastructure/persistence/repositories/service-email.repository.ts` | Repository chỉ CRUD; legacy migration tách thành migration adapter |
| `domain/mappers.ts` | `infrastructure/persistence/mappers/` | Mapper DB/JSON row ra Application/Domain model |
| `utils/browser-folder.ts` — folder provision/copy/move | `infrastructure/storage/profile-folders/` | Folder lifecycle, safe copy/move và transfer IO |
| `utils/browser-folder.ts` — browser profile DB readers | `infrastructure/browser/profile-data/` | History/login/password/fingerprint/extension readers; inject profile paths/DB factories |
| `utils/browser-folder.ts` — kind/path/name pure policy | `domain/profiles/` hoặc `infrastructure/browser/` tùy semantics | Chỉ đưa vào Domain nếu là business invariant thuần; path/executable/browser kind kỹ thuật ở adapter |
| `utils/system.ts` | `infrastructure/system/` | Device fingerprint, OS info và folder validation |
| `utils/logger.ts` | `infrastructure/logging/` | Logging adapter/factory được Container quản lý |
| `utils/http.ts` | `application/errors/` + `api/http/` + `api/middleware/` | Tách AppError, response/params, async/error middleware |
| `utils/guard.ts` | `api/http/params.ts` hoặc pure `utils/` nếu dùng ngoài HTTP | Không phụ thuộc Express error middleware |
| `utils/version.ts` | `infrastructure/browser/` nếu version parser chỉ phục vụ binary; hoặc module sở hữu | Không để root utils làm nơi chứa helper riêng browser |
| `cache/email.cache.ts` + `cache/service_email.cache.ts` | `infrastructure/cache/` | Cache adapter, expose lifecycle `close()`; không để service dùng singleton |

## 5. Kế hoạch triển khai

Mỗi phase phải giữ server chạy được và không thay đổi behavior. Chia task nhỏ; mỗi task nên giới hạn số file ghi, có test/verification riêng và không thực hiện đồng thời route contract change với structural move.

### Phase 1 — Foundation, Composition Root và Startup

1. Tạo `main.ts`, `app.ts`, `bootstrap/container.ts`, `bootstrap/server.ts`.
2. Tách Express pipeline, `/health`, CORS/body parser/request logger/error handler sang `app.ts`/`api`.
3. Khởi tạo main DB, cache, per-profile DB factories và runtime managers trong Container.
4. Tạo `startup/startup.runner.ts` với phase `before-listen` và `after-listen`.
5. Tạo startup tasks theo đúng thứ tự đã ghi ở mục 1.5; giữ warning/failure policy hiện tại.
6. Chuyển SIGTERM/SIGINT, browser shutdown, Redis close và DB close về `bootstrap/server.ts`.
7. Chưa đổi tên URL, response, DB schema hoặc logic sync.

**Điều kiện hoàn tất:** server khởi động/shutdown giống trước; startup task log cho thấy đúng thứ tự; lỗi auto-install sau listen vẫn non-fatal.

### Phase 2 — Controller và Route extraction

1. Tạo controller cho 79 endpoint; routes chỉ khai báo path/method và bind controller method.
2. Chia `email.route.ts` theo profile CRUD/transfer, activity, browser data.
3. Chia `source.route.ts` thành source management, source/import preview và import/transfer jobs.
4. Giữ toàn bộ path prefix `/api/v1`, `/profiles`, `/sources`, `/system`, `/browser`, `/queries`, `/services`, `/sessions`.
5. Chuyển request parsing/status/response mapping vào Controller và API helpers.
6. Không để Controller import `utils/browser-folder`, `utils/system`, repository hoặc singleton service.

**Điều kiện hoàn tất:** test snapshot/API contract xác nhận 79 endpoint không đổi; mỗi route handler chỉ gọi Controller; Controller không thao tác trực tiếp filesystem/SQLite.

### Phase 3 — Constructor Injection và Application Ports

1. Chuyển Profile, Source, Session, Query, Service Catalog, Service Email và Activity services sang constructor injection.
2. Khai báo repository ports ở `application/ports/repositories/`.
3. Khai báo storage/browser/process/cache/system/job ports chỉ cho boundary được dùng thực tế.
4. Chuyển repository từ global `getDb()` sang nhận DB connection/repository context qua constructor.
5. Chuyển Redis/cache, browser process registry, import/transfer/update jobs thành instance có lifecycle do Container sở hữu.
6. Inject services vào Controllers và startup tasks qua Container; không sử dụng service locator trong Application.
7. Tách migration runner khỏi `service_email.repository.ts`; chỉ migration adapter được phép biết legacy schema.

**Điều kiện hoàn tất:** unit test Application Service có thể thay repository/storage/browser adapter bằng fake; không có singleton service import trực tiếp ở API/Application.

### Phase 4 — Domain và Infrastructure Separation

1. Di chuyển DB row mapper khỏi `domain/mappers.ts` sang `infrastructure/persistence/mappers/`.
2. Tách `browser-folder.ts` thành profile folder storage, folder transfer, browser profile data reader và các pure profile/browser policy thực sự cần thiết.
3. Tách `source.service.ts`: source use case không tự scan Chrome profile hoặc đọc file `Preferences`; SourceScanner adapter thực hiện IO/parse.
4. Tách `email.service.ts`: profile CRUD và profile transfer/merge orchestration thành hai application services; giữ transfer policy trong Application/Domain, folder IO ở Infrastructure.
5. Tách `service.repository.ts` thành source, service catalog và activity repositories.
6. Gom main/per-profile/vault/backup SQLite vào persistence infrastructure; giữ nguyên DB file path, schema và migration semantics.
7. Chuyển browser launch/update/fork/external-process, system info, logger, cache và backup implementation sang Infrastructure.
8. Tách AppError khỏi HTTP; đảm bảo Repository/Infrastructure không import API middleware/helper.

**Điều kiện hoàn tất:** Application/Domain không import Express, SQLite, fs, child_process hoặc concrete Infrastructure; Domain không chứa DTO/DB Row/browser protocol type.

### Phase 5 — Cohesion, lifecycle, verification và hardening

1. Rà soát import graph và module ownership; chỉ giữ public exports cần thiết.
2. Kiểm tra cache invalidation, job cancellation, progress events và process shutdown.
3. Kiểm tra multi-profile isolation: session DB/vault DB/profile directory không dùng nhầm profile context.
4. Kiểm tra transfer move/duplicate, conflict policy, rollback/partial failure và cancellation.
5. Kiểm tra source reconcile/sync với local Chrome, custom source, missing folder và empty source list.
6. Kiểm tra browser launch/stop, temp cleanup, auto-install và update job progress.
7. Security review riêng cho CORS/auth, credential/password/TOTP, browser DB access, sensitive response logging và backup files.
8. Loại bỏ orphan code sau khi đã đối chiếu renderer/client; không xóa `server-client.service.ts` trước khi xác minh consumer ngoài ZIP.

**Điều kiện hoàn tất:** build/lint/test theo repository gốc; API contract, startup/shutdown và data compatibility được xác nhận.

## 6. Giả định / Cần xác minh trước khi triển khai

1. `migrateLegacyServiceEmails()` hiện chạy sau `initDb()` và trước `browserRunService.sweepTempDirs()`; cần giữ thứ tự và xác định migration hiện idempotent đến đâu trước khi thay đổi.
2. Nếu migration một profile thất bại, log và giữ legacy data như hiện tại; không xóa bảng/file nguồn khi chưa xác minh toàn bộ dữ liệu đã chuyển thành công.
3. `sweepTempDirs()` chạy trước source reconciliation; không đổi pattern thư mục hoặc tiêu chí xóa khi chưa kiểm tra browser process còn active.
4. `sourceService.reconcile()` và `sourceService.list()` có thể reconcile dữ liệu source; cần tránh gọi lặp tạo tác động phụ khi chuyển startup task và Controller.
5. Startup chỉ sync source có `type === 'local'` và `location` hợp lệ; source folder missing chỉ warning theo logic hiện tại. Không tự chuyển tất cả source thành local.
6. `browserUpdateService.autoInstallIfMissing()` chạy sau khi server listen và lỗi non-fatal; không block readiness hoặc làm server exit.
7. `email.route.ts:28` ghi rõ URL `/profiles` vẫn đang được renderer dùng. Không đổi path sang `/emails` hoặc đổi naming contract ở đợt restructure này.
8. `email.service.ts` có caching/relations và transfer conflict policy; cần test trước khi tách để tránh đổi thứ tự copy/move, rekey hoặc cache invalidation.
9. `browser-folder.ts` đọc nhiều SQLite DB của browser (history/password/fingerprint/login). Cần giữ temp-copy/locking semantics và không đọc/ghi profile DB đang được browser sử dụng theo cách gây corruption.
10. `service.repository.ts` gộp source repository, catalog repository và activity child store. Trước khi tách, kiểm tra cùng DB handle/transaction semantics và cascade behavior.
11. `database/session.ts`, `database/vault.ts`, `database/backup.ts` có vòng đời/file path khác main DB; không gộp thành một global connection nếu sẽ làm sai isolation per profile.
12. `cache/email.cache.ts` dùng `ioredis-mock` trong ZIP. Cần xác minh runtime backend và mục đích trước khi thay bằng Redis client thật hoặc đổi cache semantics.
13. `server-client.service.ts` không có consumer nội bộ trong ZIP; `AppConfig` cũng không có `serverUrl`. Cần kiểm tra renderer/other package hoặc xóa sau khi chứng minh dead code.
14. ZIP không có package.json/tsconfig/test. Không thể xác nhận build command, module format, alias, lint rules hoặc test runner.
15. `cors({ origin: '*' })` đang bật và ZIP không cho thấy authentication middleware; Profile xử lý browser credential/password/TOTP/session data. Cần security review riêng, không gộp thay đổi security vào structural refactor mà không có policy rõ ràng.
16. Startup output (`printBanner` / `printStarted`), readiness endpoint `/health`, request logging và shutdown exit semantics phải được giữ trong phase đầu.

## 7. Definition of Done

- [ ] Có `main.ts`, `app.ts`, `bootstrap/container.ts`, `bootstrap/server.ts` và `startup/startup.runner.ts`.
- [ ] `startup/` có pre-listen và post-listen phase; task được inject, chạy đúng thứ tự và không trực tiếp phụ thuộc concrete infrastructure.
- [ ] `main.ts` là entry point duy nhất; `app.ts` không listen hoặc tạo Container.
- [ ] Tất cả Controllers được Container tạo/wire; Routes không import service singleton.
- [ ] 79 endpoint giữ nguyên HTTP method, path, request/query/body, status và response contract.
- [ ] `/health` giữ nguyên response `{ status: 'ok', service: 'phantoma-profile-server' }`.
- [ ] URL `/profiles` và các child paths không bị đổi; renderer contract không bị thay đổi.
- [ ] Profile CRUD, bulk update/delete, transfer preview/move/duplicate, conflict policy và cancellation giữ nguyên.
- [ ] Source reconcile/sync và source import preview giữ nguyên local/custom source behavior.
- [ ] Browser launch/stop, active session registry, temp cleanup, browser update/install job giữ nguyên semantics.
- [ ] History, saved logins, password, fingerprint, avatar, extension state và session readers giữ nguyên output/locking behavior.
- [ ] Migration legacy service emails chạy trước source sync và không làm mất dữ liệu khi lỗi.
- [ ] Main DB, per-profile session DB, vault DB, backup DB và Redis/cache có lifecycle được Container quản lý.
- [ ] Application/Domain không import Express, SQLite, Node fs/child_process hoặc concrete Infrastructure.
- [ ] Domain không chứa persistence mapper, DB Row hoặc HTTP/browser protocol DTO.
- [ ] Repository không gọi global `getDb()` và không import `AppError` từ HTTP layer.
- [ ] Graceful shutdown dừng HTTP/browser runtime trước khi đóng cache/database.
- [ ] CORS/auth/password/TOTP/browser credential handling được review riêng; không mặc định coi `origin: '*'` là production-safe.
- [ ] Build, lint, unit/integration tests chạy theo scripts thực tế của repository gốc.

---

## Phụ lục A — Nguyên tắc dành cho Executor

1. Thực hiện theo phase, không restructure toàn bộ server trong một lần.
2. Không đổi endpoint, payload, status code, error format hoặc browser behavior nếu task chỉ yêu cầu thay đổi cấu trúc.
3. Mỗi use case chỉ có một nơi sở hữu. Controller không chứa business workflow; Application Service không chứa Express/SQLite/fs/process code.
4. Không tạo `BaseController`, `BaseRepository`, `BaseService` chỉ để giảm vài dòng boilerplate. Chỉ trừu tượng hóa khi có nhiều implementation hoặc contract thực sự dùng chung.
5. Constructor injection được ưu tiên; không biến Container thành service locator và không import Container từ Application/API/Startup.
6. Không tạo file `index.ts` barrel tràn lan. Chỉ tạo public entry point khi cần boundary import ổn định.
7. Không tạo root `types/`, `constants/`, `helpers/`, `managers/` để gom file không rõ ownership.
8. Không giữ singleton mutable state trong module nếu state đó cần shutdown, test isolation hoặc nhiều instance; đưa state vào instance do Container sở hữu.
9. DB schema/data migration là thay đổi riêng; không chỉnh schema chỉ vì di chuyển file.
10. Khi không xác định được consumer (renderer/other server), ghi rõ điểm cần xác minh; không tự xóa hoặc đổi contract.

## Phụ lục B — Kiểm tra dependency sau refactor

```bash
# Application và Domain không được import framework/persistence/process implementation
grep -RInE "from 'express'|better-sqlite3|child_process|from 'fs'|from 'path'" src/application src/domain

# Không giữ DB mapper ở Domain
grep -RInE 'type Row|mapEmail|mapSource|mapService' src/domain

# Không gọi global DB accessor từ Application
grep -RIn 'getDb()' src/application

# API không được import concrete repositories hoặc legacy singleton services
grep -RInE 'repositories/|services/.*\.service' src/api

# Không có HTTP helper trong Infrastructure/Application ngoài AppError contract
grep -RInE 'utils/http|api/http|express' src/application src/infrastructure
```

