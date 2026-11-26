# Kế hoạch Restructure + Clean Architecture — Proxy Server

> Giai đoạn 1 — Lập kế hoạch. Planner không sửa source code trong ZIP.
> Phạm vi quét: toàn bộ `proxy(1).zip` được cung cấp. ZIP có 26 file TypeScript, khoảng 3.511 dòng; 4 route modules với 31 endpoint. Ngày quét: 2026-11-25.
> Mục tiêu: chuẩn hóa theo baseline chung của các server Phantoma: `main.ts`, `app.ts`, `bootstrap/`, `startup/` bắt buộc, `api/`, `application/`, `domain/`, `infrastructure/`; bổ sung Controller, Container và constructor injection; cải thiện dependency direction, Domain separation, Infrastructure separation và giữ Module Cohesion theo mẫu Code.
> Đây là kế hoạch cấu trúc. Không đổi endpoint, payload, status code, JSON envelope, quy tắc proxy/VPN hoặc thứ tự lifecycle trong các phase đầu.

## 0. Tóm tắt

- **Hiện trạng:** 26 file / khoảng 3.511 dòng. Server có Express, SQLite, 3 repository, 4 route modules và 9 service modules. Toàn bộ khởi tạo nằm trong `index.ts`; Route gọi trực tiếp các service singleton; chưa có `app.ts`, Controller hoặc Container.
- **Vấn đề chính:** `vpn.service.ts` (749 dòng) và `ip-lookup.service.ts` (456 dòng) là hai file lớn nhất. `vpn.service.ts` trộn CRUD tài khoản, provider registry, credential processing, filesystem, child process, port allocation và runtime state. `warp.service.ts` cũng trộn application flow với process/filesystem/database. `check.service.ts` phụ thuộc trực tiếp repository, network probe và IP lookup; event emitter đang gắn với singleton module.
- **Dependency direction:** Application service import concrete repository; service/import helper phụ thuộc `AppError` từ `utils/http`; `utils/process.ts` cũng import HTTP error; `domain/mappers.ts` thực chất là SQLite row mapper và API projection, không phải Domain.
- **Mục tiêu:** Routes chỉ khai báo endpoint và controller; Controller xử lý HTTP input/output; Application Service chứa use case; Domain chứa model/rule nghiệp vụ độc lập; Infrastructure triển khai SQLite, process, network probe, IP lookup, CDP login và scheduler. Container là composition root duy nhất wiring concrete adapter.
- **Startup:** mọi server đều bắt buộc có `startup/startup.runner.ts`. Proxy cần startup tasks để tạo nguồn mặc định, khôi phục các nguồn VPN/WARP tích hợp, dọn WARP ephemeral state và bật monitor đúng thời điểm. `bootstrap/` vẫn quản lý database connection, HTTP listen và shutdown.
- **Quy mô refactor:** 5 phase; có thể chia theo từng domain/capability. Không tách file chỉ theo số dòng; `vpn.service.ts` cần phân tích theo account lifecycle, provider activation và process runtime trước khi chia.
- **Ràng buộc:** ZIP không kèm `package.json`, `tsconfig`, test config hoặc renderer contracts. Không tự giả định lệnh build/test hay thay đổi response type khi chưa đối chiếu repository đầy đủ.

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
| `app.ts` | Export `createApp(apiControllers)`; dựng Express pipeline, không init DB, không tạo Container, không listen |
| `bootstrap/container.ts` | Composition Root; tạo DB adapters, ports, application services, controllers và startup task dependencies |
| `bootstrap/server.ts` | Điều phối DB init, Container, `createApp`, HTTP listen, signal handlers và graceful shutdown |
| `startup/` | Bắt buộc; `startup.runner.ts` chạy preflight/seed/reconcile/warmup tasks theo phase; không sở hữu listen hoặc process shutdown |
| `api/` | Toàn bộ HTTP transport: Controller, Route, middleware, contracts và HTTP helper; không tạo root `http/` |
| `application/` | Use case, ports và application errors; không import Express, SQLite, Node fs, child process hoặc concrete adapter |
| `domain/` | Entity, value object, enum và invariant nghiệp vụ; không chứa DB Row, HTTP DTO hoặc process/browser types |
| `infrastructure/` | Concrete SQLite, repository, filesystem, process, network, browser/CDP, scheduler và logging adapters |
| Constants / Types | Đặt cạnh module sở hữu; không tạo root `constants/` hoặc root `types/` để gom mọi thứ |
| Errors | `application/errors/` giữ lỗi use case; `api/middleware/error-handler` ánh xạ sang HTTP response; không giữ root `errors/` |

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
        ├── startup/startup.runner.ts ──► startup tasks ──► application services
        │
        └── app.ts ──► api/routes ──► api/controllers ──► application services

Domain       ──► không phụ thuộc layer khác
Infrastructure ──► application ports + domain khi cần
API          ──► application services/contracts/errors; không import concrete infrastructure
Startup      ──► application services/ports qua dependencies được inject
```

`bootstrap/container.ts` là nơi duy nhất biết cả Application và concrete Infrastructure để wiring. `app.ts`, `api/routes/`, `api/controllers/`, `application/` và `startup/` không được import `Container` hoặc concrete repository/service singleton.

## 1. Hiện trạng

### 1.1 Cây thư mục hiện tại

```text
src/
├── config/
│   └── server.config.ts
├── database/
│   ├── connection.ts
│   └── sql.ts
├── domain/
│   └── mappers.ts
├── repositories/
│   ├── account.repository.ts
│   ├── proxy.repository.ts
│   └── source.repository.ts
├── routes/
│   ├── proxy.route.ts
│   ├── source.route.ts
│   ├── vpn.route.ts
│   ├── warp.route.ts
│   └── routes.ts
├── services/
│   ├── check.service.ts
│   ├── fxa-cdp.service.ts
│   ├── ip-lookup.service.ts
│   ├── monitor.service.ts
│   ├── probe.service.ts
│   ├── proxy.service.ts
│   ├── source.service.ts
│   ├── vpn.service.ts
│   └── warp.service.ts
├── utils/
│   ├── http.ts
│   ├── logger.ts
│   ├── process.ts
│   └── welcome.ts
└── index.ts
```

### 1.2 Quy mô file

| File | Dòng | Vai trò hiện tại / nhận định |
|---|---:|---|
| `services/vpn.service.ts` | 749 | CRUD VPN account, provider definition, activation, process launch, in-memory runtime state và virtual proxy mapping; cần tách theo boundary thật |
| `services/ip-lookup.service.ts` | 456 | Gọi nhiều external IP providers, merge dữ liệu, timeout và in-memory cache; thiên về integration adapter |
| `services/fxa-cdp.service.ts` | 237 | Spawn Chrome, CDP WebSocket và thu thập Mozilla/Firefox account login; infrastructure browser adapter |
| `services/probe.service.ts` | 212 | TCP/TLS, HTTP CONNECT, SOCKS4/5 handshake và xác định exit IP; network adapter |
| `services/warp.service.ts` | 190 | Quản lý WARP process, data directory, registration, runtime map và DB proxy record |
| `services/proxy.service.ts` | 204 | Validation, uniqueness, CRUD, bulk import và mapping Proxy; application use case nhưng phụ thuộc repository trực tiếp |
| `services/check.service.ts` | 118 | Điều phối probe, health status, history, lookup IP, persistence và EventEmitter |
| `utils/logger.ts` | 167 | Logging adapter, không phải pure utility |
| `database/connection.ts` | 157 | SQLite schema, migration và global connection |
| `utils/welcome.ts` | 85 | Terminal banner và thông tin endpoint lúc server start |
| `index.ts` | 81 | Express, CORS, JSON parser, health route, DB init, seed, listen, monitor start và shutdown |

### 1.3 Các điểm đã xác minh trong source

| ID | Mức | Vấn đề | Bằng chứng |
|---|---|---|---|
| P01 | Cao | `index.ts` vừa dựng Express, middleware, health endpoint, init DB, chạy seed/cleanup, mount route, listen và shutdown | `index.ts:1-81` |
| P02 | Cao | Route gọi singleton service trực tiếp; chưa có Controller boundary | `routes/proxy.route.ts:1-6,15-88`; `routes/source.route.ts:1-5,10-39`; `routes/vpn.route.ts:1-3,8-45`; `routes/warp.route.ts:1-3,8-22` |
| P03 | Cao | Không có Composition Root/Container; repository/service state nằm ở module singleton | `repositories/*.repository.ts` export object; `services/*.service.ts` export object; `index.ts:7-10` |
| P04 | Cao | `vpn.service.ts` trộn account use case với process, filesystem, provider implementation, network port probing, credential và runtime state | `vpn.service.ts:1-13,21-66,68-124,129-212,308-446,515-741` |
| P05 | Cao | `warp.service.ts` trực tiếp phụ thuộc child process, fs, path, config, repositories và process helpers | `warp.service.ts:1-10,27-65,67-189` |
| P06 | Trung | `check.service.ts` vừa điều phối nghiệp vụ health check, vừa gọi repository/network/IP lookup trực tiếp và sở hữu EventEmitter singleton | `check.service.ts:1-8,17-19,21-28,40-79,92-119` |
| P07 | Trung | `monitor.service.ts` quản lý timer và gọi thẳng `checkService` singleton; `getConfig()` là global dependency | `monitor.service.ts:1-4,7-35` |
| P08 | Trung | `domain/mappers.ts` chứa `Row = Record<string, any>` và chuyển SQLite row thành public Source/Proxy shape; không phải Domain layer | `domain/mappers.ts:1-58` |
| P09 | Trung | `utils/http.ts` ghép `AppError`, Express middleware/RequestHandler, response envelope, validation, param và ID generation | `utils/http.ts:1-59` |
| P10 | Trung | `AppError` từ HTTP helper bị import bởi process/network/service layer; process infrastructure bị kéo phụ thuộc ngược HTTP | `utils/process.ts:1-4,8-18`; `services/vpn.service.ts:10`; `services/warp.service.ts:7`; `services/proxy.service.ts:6` |
| P11 | Trung | Application Service phụ thuộc concrete repository và lấy config global | `proxy.service.ts:1-6`; `source.service.ts:1-5`; `check.service.ts:1-8`; `vpn.service.ts:5-13`; `warp.service.ts:4-10` |
| P12 | Trung | SQLite repositories gọi `getDb()` global; không nhận connection qua constructor/factory | `repositories/account.repository.ts:1-4,22-71`; `proxy.repository.ts:1-4,50-98`; `source.repository.ts:1-4,14-37` |
| P13 | Trung | `ip-lookup.service.ts` là external provider integration/cache nhưng đặt ngang hàng với application services; có nhiều provider-specific raw response types | `ip-lookup.service.ts:50-58,83-90,96-340,419-456` |
| P14 | Trung | `probe.service.ts` là network protocol adapter nhưng đang đặt trong `services/` | `probe.service.ts:1-3,99-212` |
| P15 | Trung | `fxa-cdp.service.ts` là browser/process/CDP integration nhưng đang đặt trong `services/` | `fxa-cdp.service.ts:1-12,20-29,46-89,90-238` |
| P16 | Trung | `utils/process.ts` chứa command execution, TCP port probing, free-port allocation và child stream log collection; không phải pure utility | `utils/process.ts:1-65` |
| P17 | Thấp | Startup và banner presentation bị trộn vào root `index.ts`/`utils/`; chưa có startup runner dù có 4 tác vụ chuẩn bị và monitor background | `index.ts:13-14,46-63`; `utils/welcome.ts:45-86` |

### 1.4 API inventory

| Route module hiện tại | Số endpoint | Nghiệp vụ |
|---|---:|---|
| `proxy.route.ts` | 11 | Proxy CRUD, bulk import/delete, key list, test, event stream |
| `source.route.ts` | 7 | Source CRUD, stats và test source |
| `vpn.route.ts` | 9 | VPN providers/accounts, activate/start/stop |
| `warp.route.ts` | 4 | WARP status, tạo proxy và start/stop |
| **Tổng** | **31** | Giữ nguyên URL và response contract |

Health endpoint `/health` được khai báo trực tiếp trong `index.ts:42-44`; chuyển vào `app.ts` hoặc `health` route độc lập, không tính trong 31 API endpoint trên.

### 1.5 Startup hiện tại

`index.ts:46-63` cho thấy thứ tự:

1. `printBanner()`.
2. Resolve config và `initDb(cfg.dbPath)`.
3. `sourceService.ensureDefault()`.
4. `warpService.ensureSource()`.
5. `warpService.purgeAccounts()`.
6. `vpnService.ensureDefaults()`.
7. Mount API và error handler.
8. Listen HTTP; khi listen thành công thì `printStarted()` và `monitorService.start()`.

Shutdown tại `index.ts:65-74`: stop monitor → stop all VPN instances → close HTTP server → close DB → `process.exit(0)`. Thứ tự này phải được giữ trong giai đoạn chuyển kiến trúc; graceful shutdown có thể được cải thiện riêng sau khi có test.

## 2. Kiến trúc đích

### 2.1 Cây thư mục mục tiêu

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
│   │   └── server-banner.ts
│   └── tasks/
│       ├── initialize-proxy-sources.task.ts
│       ├── purge-ephemeral-warp-state.task.ts
│       ├── ensure-vpn-defaults.task.ts
│       └── start-proxy-monitor.task.ts
├── config/
│   └── server.config.ts
├── api/
│   ├── controllers/
│   │   ├── source.controller.ts
│   │   ├── proxy.controller.ts
│   │   ├── vpn.controller.ts
│   │   └── warp.controller.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── source.routes.ts
│   │   ├── proxy.routes.ts
│   │   ├── vpn.routes.ts
│   │   └── warp.routes.ts
│   ├── middleware/
│   │   ├── async-handler.middleware.ts
│   │   └── error-handler.middleware.ts
│   ├── contracts/
│   │   ├── source.contract.ts
│   │   ├── proxy.contract.ts
│   │   ├── vpn.contract.ts
│   │   └── warp.contract.ts
│   └── http/
│       ├── response.ts
│       ├── params.ts
│       └── sse.ts
├── application/
│   ├── errors/
│   │   └── app.error.ts
│   ├── ports/
│   │   ├── repositories/
│   │   │   ├── source.repository.port.ts
│   │   │   ├── proxy.repository.port.ts
│   │   │   └── account.repository.port.ts
│   │   ├── network/
│   │   │   ├── proxy-probe.port.ts
│   │   │   └── ip-lookup.port.ts
│   │   ├── process/
│   │   │   ├── vpn-runtime.port.ts
│   │   │   └── warp-runtime.port.ts
│   │   ├── browser/
│   │   │   └── fxa-login-capture.port.ts
│   │   └── scheduling/
│   │       └── interval-scheduler.port.ts
│   └── services/
│       ├── sources/
│       │   └── source.service.ts
│       ├── proxies/
│       │   └── proxy.service.ts
│       ├── health-check/
│       │   ├── proxy-health.service.ts
│       │   └── proxy-monitor.service.ts
│       ├── vpn/
│       │   ├── vpn-account.service.ts
│       │   └── vpn-runtime.service.ts
│       └── warp/
│           └── warp-proxy.service.ts
├── domain/
│   ├── sources/
│   │   └── source.entity.ts
│   ├── proxies/
│   │   ├── proxy.entity.ts
│   │   └── proxy-policy.ts
│   └── vpn/
│       └── vpn-account.entity.ts
├── infrastructure/
│   ├── persistence/
│   │   ├── sqlite/
│   │   │   ├── connection.ts
│   │   │   ├── schema.ts
│   │   │   ├── sql.helpers.ts
│   │   │   └── migrations/
│   │   ├── repositories/
│   │   │   ├── sqlite-source.repository.ts
│   │   │   ├── sqlite-proxy.repository.ts
│   │   │   └── sqlite-account.repository.ts
│   │   └── mappers/
│   │       ├── source.mapper.ts
│   │       └── proxy.mapper.ts
│   ├── network/
│   │   ├── proxy-probe.adapter.ts
│   │   └── ip-lookup.adapter.ts
│   ├── process/
│   │   ├── process-runner.adapter.ts
│   │   ├── vpn-process-manager.ts
│   │   └── warp-process-manager.ts
│   ├── vpn/
│   │   └── providers/
│   │       ├── warp.provider.ts
│   │       ├── foxhole.provider.ts
│   │       └── proton.provider.ts
│   ├── browser/
│   │   └── fxa-cdp-login.adapter.ts
│   ├── scheduling/
│   │   └── interval-scheduler.adapter.ts
│   └── logging/
│       └── logger.ts
└── utils/
    └── pure helpers only
```

Cây trên biểu diễn boundary đích, không yêu cầu tạo file rỗng. Một adapter có thể giữ function module nếu không có state; adapter có state/process/cache phải được tạo và sở hữu bởi Container.

### 2.2 Trách nhiệm từng layer

| Layer | Trách nhiệm | Không được làm |
|---|---|---|
| API Route | URL, HTTP method, middleware, gắn controller | Parse nghiệp vụ phức tạp, gọi Repository/Service singleton, chứa business rule |
| Controller | Đọc `Request`, validate transport-level input, gọi Application Service, map status/body | Truy cập SQLite, spawn process, chạy health-check logic |
| Application Service | Source/Proxy/VPN/WARP use cases; orchestration; policy và error nghiệp vụ | Import Express, `better-sqlite3`, `fs`, `child_process`, `net`, `tls`, concrete adapters |
| Domain | Source, Proxy, VPN account model và invariants thực sự cần thiết | DB row, raw external provider response, HTTP DTO, runtime child process |
| Infrastructure Persistence | SQLite schema, migrations, repositories và mapper | Trả `Response` hoặc quyết định HTTP status |
| Infrastructure Network | Probe protocol, gọi/merge external IP lookup providers | Quyết định use case nào cần probe hoặc cập nhật domain state |
| Infrastructure Process/Browser | Process lifecycle, provider-specific launch, CDP login capture | Import Application Service hoặc Route |
| Startup | Điều phối ensure-default/reconcile/cleanup/warmup/start monitor qua dependencies được inject | Tự init DB, tạo Express, listen, shutdown hoặc import singleton |
| Bootstrap | Tạo Container, init DB, gọi startup phase, tạo app, listen và dispose | Chứa business rule Source/Proxy/VPN |

### 2.3 Module Cohesion theo mẫu Code

Nhóm module theo capability/domain, không nhóm theo loại file toàn cục và không tạo một thư mục service cho mỗi endpoint.

- `sources/`: source CRUD, default source, built-in VPN source ownership.
- `proxies/`: Proxy CRUD, import, duplicate validation, stats và client-editable fields.
- `health-check/`: probe orchestration, state transition (healthy/degraded/dead), success rate/history, enrichment và event publication.
- `vpn/`: VPN account CRUD/activation/runtime use cases. Provider-specific command, credential file và child process phải nằm ở infrastructure.
- `warp/`: WARP device registration, ephemeral proxy lifecycle và runtime. Không trộn WARP vào Proxy CRUD chỉ vì cùng trả Proxy view.

Không tạo root `managers/`, `handlers/`, `helpers/` để gom file không rõ owner. `vpn` và `warp` có thể dùng chung process adapter qua port nhưng giữ module nghiệp vụ riêng.

### 2.4 Controller và Route

| Controller | Route hiện tại được phục vụ | Trách nhiệm |
|---|---|---|
| `SourceController` | `source.route.ts` | List/create/get/update/remove source, source stats và test source |
| `ProxyController` | `proxy.route.ts` | Proxy CRUD, bulk import/delete, keys, test/testMany và SSE events |
| `VpnController` | `vpn.route.ts` | Provider list, account CRUD, activate/start/stop |
| `WarpController` | `warp.route.ts` | WARP status, create/start/stop proxy |

Mỗi Route module được tạo bằng factory và nhận Controller dependency. Controller không import `bootstrap/container.ts`; `createApp()` nhận một `ApiControllers` contract từ composition root. SSE dùng `api/http/sse.ts` hoặc helper tương đương để đóng event listener/timer khi request đóng.

### 2.5 Container và constructor injection

Container tối thiểu tạo:

1. Một SQLite connection và các repository adapter nhận connection qua constructor/factory.
2. Process runner, proxy probe, IP lookup adapter, FXA/CDP login adapter, interval scheduler.
3. Application service instances: Source, Proxy, Health Check, Monitor, VPN Account/Runtime và WARP.
4. Bốn Controller instance, `ApiControllers` và startup tasks.
5. `dispose()`/resource registry để dừng monitor, VPN/WARP processes và đóng DB đúng một lần.

Không chuyển mọi function thành class. Dùng constructor injection cho stateful service, Controller và service có nhiều dependency. Pure mapper/validator có thể là function. Không tạo singleton module-level `Map`, `EventEmitter` hoặc timer ngoài instance lifecycle.

### 2.6 Domain, Contracts và Persistence

- `domain/mappers.ts` phải chuyển khỏi Domain. `Row`, `mapSource` và `mapProxy` là persistence mapping; đặt dưới `infrastructure/persistence/mappers/`.
- `api/contracts/` chứa input/output shape mà HTTP/renderer trao đổi. Không để `Request` hoặc response envelope đi vào Domain.
- `domain/proxies/proxy.entity.ts` chỉ chứa field/invariant nghiệp vụ thực sự; `ProxyStatsRow` hoặc raw SQLite columns không phải Domain entity.
- `application/errors/app.error.ts` là transport-neutral. Error middleware map application error code/type sang status code mà vẫn giữ `{ success, data }` / `{ success, error }` theo contract hiện tại.
- `database/sql.ts` và schema/migrations thuộc SQLite infrastructure; Repository Port đặt ở `application/ports/repositories/`.

## 3. Ánh xạ file cũ → file mới

| Hiện tại | Đích đề xuất | Ghi chú |
|---|---|---|
| `index.ts` | `main.ts` + `bootstrap/server.ts` | `main.ts` chỉ gọi `startServer`; server lifecycle tách khỏi app factory |
| (chưa có) | `app.ts` | `createApp(controllers)` tạo middleware, health route, API routes và error handler |
| (chưa có) | `bootstrap/container.ts` | Composition Root tạo repositories, adapters, services, controllers, startup runner |
| (chưa có) | `startup/startup.runner.ts` | Chạy các startup phase theo đúng thời điểm |
| `utils/welcome.ts` | `startup/presentation/server-banner.ts` | Terminal presentation trước/sau listen, không phải generic utils |
| `routes/*.route.ts` | `api/routes/*.routes.ts` + `api/controllers/*.controller.ts` | Giữ nguyên URL; tách HTTP callback khỏi use case |
| `utils/http.ts` | `api/http/response.ts`, `api/http/params.ts`, `api/middleware/*`, `application/errors/app.error.ts` | Tách theo transport vs application error; giữ envelope |
| `database/connection.ts` | `infrastructure/persistence/sqlite/connection.ts` + `schema.ts`/`migrations/` | Loại global DB dependency dần, inject connection |
| `database/sql.ts` | `infrastructure/persistence/sqlite/sql.helpers.ts` | Helper SQL chỉ được persistence adapter dùng |
| `repositories/*.repository.ts` | `infrastructure/persistence/repositories/*.ts` | Concrete SQLite adapters; implement Application ports |
| `domain/mappers.ts` | `infrastructure/persistence/mappers/*.mapper.ts` | Row → model/view mapping là persistence responsibility |
| `services/source.service.ts` | `application/services/sources/source.service.ts` | Inject SourceRepository port; giữ ensureDefault use case |
| `services/proxy.service.ts` | `application/services/proxies/proxy.service.ts` | Inject ProxyRepository + SourceRepository ports; giữ validation/duplicate/business rules |
| `services/check.service.ts` | `application/services/health-check/proxy-health.service.ts` | Tách EventPublisher/ports; giữ history/status semantics |
| `services/monitor.service.ts` | `application/services/health-check/proxy-monitor.service.ts` | Timer qua scheduler port hoặc runtime adapter; Container sở hữu lifecycle |
| `services/vpn.service.ts` | Application `vpn-account.service.ts` + `vpn-runtime.service.ts`; provider/process adapters | Phải phân tích theo vùng account/activation/runtime; không đổi provider behavior |
| `services/warp.service.ts` | `application/services/warp/warp-proxy.service.ts` + `infrastructure/process/warp-process-manager.ts` | Use case tách khỏi file/process/child management |
| `services/probe.service.ts` | `infrastructure/network/proxy-probe.adapter.ts` | Socket/protocol implementation |
| `services/ip-lookup.service.ts` | `infrastructure/network/ip-lookup.adapter.ts` | External providers, timeout, merge và cache |
| `services/fxa-cdp.service.ts` | `infrastructure/browser/fxa-cdp-login.adapter.ts` | Spawn browser/CDP; expose port contract |
| `utils/process.ts` | `infrastructure/process/process-runner.adapter.ts` + network port helpers nếu cần | Không import AppError HTTP; map process failure về infrastructure/application error phù hợp |
| `utils/logger.ts` | `infrastructure/logging/logger.ts` | Logging adapter được inject |

## 4. Kế hoạch theo phase

### Phase 1 — Tách composition root và HTTP boundary

1. **1.1 — Entry point và app factory**
   - Tạo `main.ts`, `app.ts`, `bootstrap/server.ts`.
   - `app.ts` tạo Express, cors, JSON parser, request logger, `/health`, API mount và error middleware.
   - `bootstrap/server.ts` giữ DB init, listen, signal handling và cleanup.
   - Chưa đổi CORS/auth policy hoặc health response trong phase restructure.
2. **1.2 — Tạo Container**
   - Tạo `bootstrap/container.ts`, ban đầu có thể wire các service hiện tại để giảm phạm vi thay đổi.
   - Tạo `ApiControllers` interface và route factories nhận controller object.
3. **1.3 — Tạo startup runner**
   - Chuyển `printBanner`/`printStarted` sang `startup/presentation/server-banner.ts`.
   - Tạo task `initialize-proxy-sources` để giữ thứ tự `source.ensureDefault` → `warp.ensureSource` → `warp.purgeAccounts` → `vpn.ensureDefaults` sau DB init, trước khi listen.
   - Tạo task `start-proxy-monitor` chạy sau khi HTTP listen thành công.
   - Startup task nhận dependencies qua factory/constructor; không import singleton.
4. **1.4 — Chuẩn hóa HTTP helper**
   - Tách `handle`, `json/fail`, `param/requireString`, `errorHandler` sang `api/`.
   - Chuyển AppError ra `application/errors`; giữ nguyên error status và body.

### Phase 2 — Thêm Controller và làm mỏng Route

1. **2.1 — SourceController**: chuyển 7 endpoint từ `source.route.ts`; Route giữ method/path/controller method.
2. **2.2 — ProxyController**: chuyển 11 endpoint; SSE listener cleanup phải giữ đúng khi client ngắt kết nối.
3. **2.3 — VpnController**: chuyển 9 endpoint; giữ thứ tự activate/start/stop và async semantics.
4. **2.4 — WarpController**: chuyển 4 endpoint.
5. **2.5 — Kiểm tra hợp đồng**: snapshot route list, payload, status code, error envelope và event payload; không đổi URL.

### Phase 3 — Container, Ports và constructor injection

1. **3.1 — Persistence ports**: khai báo SourceRepository, ProxyRepository, AccountRepository trong `application/ports/repositories/`.
2. **3.2 — SQLite adapters**: chuyển global `getDb()` sang connection được tạo tại bootstrap và truyền vào Repository adapter. Không đổi schema/migration cùng lúc với đổi DI.
3. **3.3 — Source/Proxy Service**: constructor injection repository ports, bỏ import concrete singleton; giữ nguyên validation, duplicate check, generated name và bulk skip outcome.
4. **3.4 — Health Check**: inject ProxyRepository, ProbePort, IpLookupPort, EventPublisher và config values; chuyển EventEmitter về instance-owned publisher.
5. **3.5 — VPN/WARP runtime**: inject repository, provider registry, process runtime, FXA capture và file/data-dir port; Container giữ instance stateful duy nhất.
6. **3.6 — Monitor lifecycle**: inject HealthCheckService + Scheduler; start/stop được gọi từ startup task và bootstrap disposal, không dùng module timer global.

### Phase 4 — Dependency direction, Domain và Infrastructure

1. **4.1 — Error boundary**: Application Service/Repository không import `utils/http`; thay `AppError` bằng Application error trung lập. HTTP middleware thực hiện mapping.
2. **4.2 — Domain separation**: chuyển Row mappers ra Infrastructure; tạo entity/value object chỉ khi có invariant thật (Proxy protocol, ownership, status, Source kind). Không tạo model trùng API DTO.
3. **4.3 — Process adapter**: chuyển `utils/process.ts`; process runner không phụ thuộc Express/AppError; `probePort/freePort/waitForPort` thuộc runtime/network adapter.
4. **4.4 — Network adapters**: chuyển probe và IP lookup ra Infrastructure; Application chỉ phụ thuộc ports. Giữ nguyên providers, timeout, merge/vote, cache TTL và handshake semantics.
5. **4.5 — VPN provider split**: tách `PROVIDERS`/provider launch definitions khỏi use case; đặt provider-specific command, env, account file và launch ở `infrastructure/vpn/providers/`. Application Service không còn import child_process/fs/net/path.
6. **4.6 — FXA/CDP adapter**: đưa browser discovery, user data copy, process spawn và CDP WebSocket vào Infrastructure; Application chỉ gọi FxaLoginCapturePort.

### Phase 5 — Cohesion, lifecycle và kiểm chứng

1. **5.1 — Dọn singleton**: không còn service/repository/adapter stateful được import trực tiếp từ Route, Controller hoặc Application Service.
2. **5.2 — Module ownership**: Source/Proxy/VPN/WARP/Health Check có trách nhiệm riêng; không chuyển file chỉ vì tên service hoặc số dòng.
3. **5.3 — Startup/shutdown**: startup phases trước/sau listen rõ ràng; stop monitor và VPN/WARP instances trước khi đóng DB; không gọi `process.exit` trước cleanup hoàn tất.
4. **5.4 — Rà soát file lớn**: `vpn.service.ts` tách theo account/activation/runtime/provider; `ip-lookup.service.ts` tách provider definitions và orchestrator nếu điều đó cải thiện testability, không tách mỗi provider thành class vô nghĩa.
5. **5.5 — Test/integration**: Source CRUD/default, Proxy CRUD/bulk validation, check protocol success/failure, health status/history, IP lookup fallback/cache, VPN provider activation/start/stop, WARP register/start/stop, SSE disconnect cleanup, startup/shutdown.

## 5. Checklist cho Executor

### Trước khi sửa

- [ ] Kiểm tra package scripts, tsconfig, lint/test config ở repository gốc; ZIP hiện tại không chứa các file này.
- [ ] Lập snapshot 31 endpoint + `/health`, response envelope, status code và SSE event format.
- [ ] Lập call graph của `vpn.service.ts` và `warp.service.ts` trước khi tách process/runtime.
- [ ] Xác nhận renderer contracts tương ứng Proxy/VPN/WARP; ZIP không chứa các type frontend được comment trong mapper.

### Trong khi sửa

- [ ] `main.ts` là entry point duy nhất; không giữ root `index.ts` chạy song song.
- [ ] `app.ts` không import Container hoặc khởi tạo DB.
- [ ] Có `startup/startup.runner.ts` và task set được inject.
- [ ] Route không import `services/*` hoặc `repositories/*` concrete.
- [ ] Controller không import SQLite/process/network adapter.
- [ ] Application Service không import Express, Node fs/child_process/net/tls hoặc concrete adapter.
- [ ] Repository implement port và nhận DB connection được inject; không tự gọi global `getDb()`.
- [ ] Domain không chứa `Row`, mapper SQL hoặc API DTO.
- [ ] Container sở hữu timer, EventEmitter, process maps và child processes.
- [ ] Không thay đổi HTTP/renderer contract hoặc provider launch arguments.

### Script kiểm tra sau mỗi phase

```bash
# Tìm route/controller còn phụ thuộc trực tiếp service singleton
grep -RIn "from '../services\|from '../../services" src/api

# Application không được import framework/infra cụ thể
grep -RInE "from 'express'|better-sqlite3|child_process|from 'fs'|from 'net'|from 'tls'" src/application src/domain

# Không để DB row mapper ở Domain
grep -RInE 'type Row|mapProxy|mapSource' src/domain

# Không còn singleton getDb() trong application layer
grep -RIn 'getDb()' src/application
```

## 6. Giả định / Cần xác minh trước khi triển khai

1. `sourceService.ensureDefault()` tạo Source loại normal mặc định; phải giữ nguyên điều kiện và tên `Default`.
2. `warpService.ensureSource()` tạo built-in ephemeral source `Cloudflare WARP`; `purgeAccounts()` xóa proxy/device data ephemeral theo startup behavior. Không đổi dữ liệu bị xóa khi chưa xác minh backup/migration semantics.
3. `vpnService.ensureDefaults()` có thể tạo built-in VPN source/provider rows; kiểm tra exact provider/source identity trước khi tách.
4. `monitorService.start()` chỉ chạy sau listen thành công; giữ initial tick + interval behavior và `monitorIntervalMs = 0` disable semantics.
5. `vpn.service.ts` có `instances` và `extras` Map ở module scope; cần bảo đảm một runtime manager instance cho mỗi server process, không tạo nhiều instance khi test/app factory được gọi nhiều lần.
6. `checkService.events` đang được consumer sử dụng bởi SSE route; chuyển event publisher phải giữ event name `update` và payload mapProxy hiện tại.
7. `probe.service.ts` dùng `api.ipify.org:80`, HTTP CONNECT và SOCKS4/5 handshakes; không đổi target/header/timeout khi chỉ restructure.
8. `ip-lookup.service.ts` có 4 nguồn dữ liệu và merge strategy; không thay đổi ưu tiên provider, voting hoặc fallback trong refactor cấu trúc.
9. `fxa-cdp.service.ts` chạy Chrome/CDP để thu thập session login. Giữ nguyên security flags, cleanup user-data-dir và cancellation/timeout semantics.
10. ZIP không có package.json/tsconfig/test. Không thể xác nhận build command, test runner, lint rules hoặc runtime module format từ file được cung cấp.
11. `cors({ origin: '*' })` và ZIP không cho thấy authentication middleware. Proxy API xử lý credential và có thể điều khiển process VPN; cần security review riêng. Không âm thầm đổi auth/CORS cùng phase restructure.
12. Logger có module-level factory và debug statements; chuẩn hóa qua infrastructure/logging, nhưng không xóa log hữu ích hoặc thay format mà không đối chiếu consumer.

## 7. Definition of Done

- [ ] Có `main.ts`, `app.ts`, `bootstrap/container.ts`, `bootstrap/server.ts` và `startup/startup.runner.ts`.
- [ ] Startup tasks giữ đúng thứ tự chuẩn bị source/VPN/WARP và start monitor sau listen.
- [ ] Bốn Controller được tạo từ Container; Routes chỉ khai báo endpoint và gắn Controller.
- [ ] 31 endpoint + `/health` giữ nguyên method, path, request/response, status và error envelope.
- [ ] API SSE giữ event format, heartbeat và cleanup listener/timer khi client disconnect.
- [ ] Application services phụ thuộc ports, không import SQLite/Express/Node process/network implementation.
- [ ] Domain không chứa persistence mapper, DB Row hoặc transport DTO.
- [ ] Infrastructure adapters được Container sở hữu; không còn timer/process/EventEmitter singleton ngoài lifecycle.
- [ ] VPN/WARP provider command, credentials, process start/stop và proxy mapping không đổi hành vi.
- [ ] DB schema/migrations và dữ liệu hiện có không bị thay đổi ngoài phạm vi có migration riêng được kiểm chứng.
- [ ] Startup failure, non-fatal task behavior và graceful shutdown được test.
- [ ] Build, lint, unit/integration tests chạy theo scripts thực tế của repository gốc.
