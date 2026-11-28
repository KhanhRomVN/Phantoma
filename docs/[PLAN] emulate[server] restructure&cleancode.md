# Kế hoạch Restructure + Clean Architecture — Emulate Backend

> Giai đoạn 1 — Lập kế hoạch. Planner không sửa file source.
> Phạm vi quét: toàn bộ nội dung `emulate.zip` được cung cấp. ZIP có 107 file TypeScript, khoảng 8.823 dòng. Ngày quét: 2026-11-25.
> Mục tiêu theo yêu cầu: (1) chuẩn hóa Controller; (2) hoàn thiện Container + constructor injection ở nơi cần; (3) sửa dependency direction; (4) tách Domain; (5) tách Infrastructure; (6) tổ chức module cohesion theo cách Code nhóm service theo domain.
> Không thay đổi API contract, response shape hoặc hành vi proxy/runtime trong các phase di chuyển ban đầu.

## 0. Tóm tắt

- **Hiện trạng:** Emulate đã có `app.ts`, `bootstrap/container.ts`, Controller, Route factory và một số Service class được constructor injection. Đây là nền tảng tốt hơn Code ở composition và HTTP separation.
- **Vấn đề chính:** DI chưa phủ toàn hệ thống. Container chỉ khởi tạo 4 Application Service (`Target`, `TargetFilter`, `Fuzzer`, `Report`); 7 Controller dạng object còn import singleton trực tiếp. `api/routes/index.ts` và `app.ts` import kiểu `Container` từ `bootstrap`, tạo dependency ngược từ API/app vào composition root.
- **Domain:** `domain/` hiện chủ yếu là data interfaces/input DTO; root `types/` trộn Domain, API contract, protocol event và startup types. Repository/Service vẫn phụ thuộc concrete class; `TargetService` tự dùng filesystem/config, `ReportRepository` tự `new ReportFileStorage()`.
- **Infrastructure:** `services/browser`, `cli`, `mobile`, `proxy`, `realtime`, `runtime` phần lớn là integration/OS adapters nhưng đang đặt cùng cấp với application services `services/emulate`. `proxy-server.service.ts` khoảng 960 dòng là điểm nóng lớn nhất.
- **Mục tiêu:** giữ `api/` là adapter HTTP; tách `application/` cho use cases và ports; `domain/` chứa business model/rules; `infrastructure/` chứa SQLite, storage, browser/CDP, process/CLI, mobile, proxy và realtime adapters. Nhóm file theo domain/subsystem, không tạo thư mục theo từng endpoint.
- **Chiến lược:** không viết lại đồng loạt. Tận dụng class/DI đang có; mở rộng Container, đảo dependency tại boundary rồi mới di chuyển file.


## Chuẩn kiến trúc chung áp dụng cho cả hai server

Hai server phải tuân thủ cùng một quy ước ở cấp kiến trúc. Khác biệt chỉ được phép nằm ở module nghiệp vụ, adapter kỹ thuật và capability mà từng server thực sự sử dụng. Không tạo folder rỗng chỉ để hai cây thư mục giống nhau.

### Cấu trúc root chuẩn

```text
src/
├── main.ts
├── app.ts
├── bootstrap/
│   ├── container.ts
│   └── server.ts
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

| Thành phần | Quy ước chung |
|---|---|
| Entry point | Chỉ dùng `main.ts` ở root; file này gọi `startServer()` và không tự cấu hình Express/DB |
| App factory | `app.ts` export `createApp(...)`; chỉ tạo Express app và middleware/route pipeline, không listen hoặc tự khởi tạo Container |
| Bootstrap | `bootstrap/container.ts` là Composition Root; `bootstrap/server.ts` quản lý init, listen, lifecycle và shutdown |
| HTTP adapter | Controller, Route, middleware, DTO và HTTP helper đều thuộc `api/`; không tạo `src/http/` song song |
| Application | Use case, ports và `application/errors/`; không import Express, SQLite, Node filesystem hoặc concrete adapter |
| Domain | Chỉ chứa business model, value object, invariant và business vocabulary thực sự |
| Infrastructure | Concrete adapter cho database, repositories, filesystem, process và các integration kỹ thuật |
| Constants | Đặt cạnh module sở hữu; chỉ tạo `shared/constants/` khi có nhiều consumer thực sự dùng chung |
| Types | Đặt cạnh owner: domain, application port, API contract hoặc infrastructure adapter; không tạo root `types/` tổng hợp |
| Errors | Application error đặt tại `application/errors/`; HTTP middleware ánh xạ error sang status/body; không giữ root `errors/` |
| Startup riêng | Không phải layer bắt buộc. Capability startup/CLI riêng được đặt dưới `bootstrap/` hoặc adapter phù hợp, không tạo root `startup/` mặc định |

### Dependency direction chuẩn

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
        └── app.ts ──► api/routes ──► api/controllers
                          │                 │
                          └── api/middleware│
                                            └── application services

domain ──► không phụ thuộc layer khác
infrastructure ──► application ports + domain (khi cần)
api ──► application contracts/errors; không import infrastructure implementation
```

`bootstrap/container.ts` là nơi duy nhất được phép biết đồng thời Application và concrete Infrastructure để wiring. `app.ts`, `api/routes/` và `api/controllers/` không được import `Container` từ `bootstrap/`.


## 1. Hiện trạng

### 1.1 Cây thư mục hiện tại

```text
src/
├── api/
│   ├── controllers/          # 11 controllers: 4 class + 7 object singleton
│   ├── middleware/           # async-handler, error-handler
│   └── routes/               # route factories; runtime/ tách CDP/eBPF/mobile/process
├── bootstrap/                # container, server, proxy-event-bridge
├── config/                    # env, paths
├── constants/                 # capture methods, proxy, HTTP, Chrome launcher
├── database/                  # SQLite connection, schema, migrations
├── domain/                    # Target, TargetFilter, Report, Fuzzer types/inputs
├── errors/                    # AppError
├── repositories/              # Target, TargetFilter, Report
├── services/
│   ├── browser/                # browser control, CDP, Chrome launcher
│   ├── cli/                    # eBPF capture/sniffer, terminal, TLS resolver
│   ├── emulate/                # Target, Filter, Fuzzer, Report application services
│   ├── mobile/                 # Android/Frida/cert/logcat/provision/proxy operations
│   ├── proxy/                  # proxy manager/server/cache
│   ├── realtime/               # WebSocket hub, network normalizer
│   └── runtime/                # capture method, process manager
├── startup/                    # preferences store, welcome screen
├── storage/                    # Fuzzer file storage, Report file storage
├── types/                      # API, browser, capture, CDP, eBPF, mobile, platform,
│                              # proxy, realtime, startup types
├── utils/                      # async, error, HTTP response, ID, logger, network...
├── app.ts
└── main.ts
```

### 1.2 Controller, Route và Container

| Thành phần | Hiện trạng | Hướng xử lý |
|---|---|---|
| `TargetController` | Class, nhận `TargetService` qua constructor | Giữ mẫu này |
| `TargetFilterController` | Class, nhận `TargetFilterService` | Giữ mẫu này |
| `FuzzerController` | Class, nhận `FuzzerService` | Giữ mẫu này |
| `ReportController` | Class, nhận `ReportService` | Giữ mẫu này |
| `capture-method.controller.ts` | Object controller, import `getCaptureMethodsForPlatform` trực tiếp | Chuẩn hóa thành class/factory, inject catalogue provider nếu có state/biến thể |
| `cdp.controller.ts` | Object controller, import `cdpService`, `executeBrowserTool`, `processManager` | Inject browser/runtime use cases; controller không orchestration 3 adapter |
| `ebpf.controller.ts` | Object controller, import `ebpfCaptureService` | Inject eBPF use case/port |
| `mobile.controller.ts` | Object controller, import trực tiếp 5 mobile/proxy services | Tách orchestration vào Mobile Application Service; Controller nhận một use case facade |
| `proxy.controller.ts` | Object controller, import `proxyManager`; tự catch/log và trả legacy response | Inject Proxy Session Service; giữ response legacy trước khi có migration contract riêng |
| `runtime-events.controller.ts` | Object controller, import `cdpService` | Inject event stream/event source abstraction |
| `runtime-process.controller.ts` | Object controller, import Chrome launcher, process manager, eBPF | Inject runtime-process use case |
| `bootstrap/container.ts` | Chỉ tạo 4 service CRUD và repositories/storage liên quan | Mở rộng thành composition root đầy đủ |
| `api/routes/index.ts` | Tạo 4 class Controller từ Container, các Controller còn lại dùng singleton import | Nhận `ApiControllers` từ composition root |

Hiện chỉ có bốn Controller được lấy từ `container.*Service`. Các Controller còn lại không được tạo bởi Container.

### 1.3 Dependency direction đang sai hoặc chưa hoàn chỉnh

1. `app.ts` import `Container` từ `bootstrap/container.ts`; trong khi `bootstrap/server.ts` import `createApp()` từ `app.ts`. `api/routes/index.ts` cũng import `Container` từ bootstrap. API/app không nên phụ thuộc type của composition root.
2. Application Service phụ thuộc concrete Repository:
   - `TargetService` → `TargetRepository`.
   - `TargetFilterService` → `TargetFilterRepository`.
   - `ReportService` → `ReportRepository`.
   - `FuzzerService` → `FuzzerFileStorage`.
3. `TargetService` trực tiếp import Node `fs` và `getTargetDir()`; xóa target đang trộn business use case với file storage.
4. `ReportRepository` tự tạo `ReportFileStorage` trong field initializer; dependency không thể thay bằng fake adapter từ Container.
5. `bootstrap/proxy-event-bridge.ts` import trực tiếp `proxyManager`, `cdpService`, `wssHub`, `networkNormalizer`; startup cũng import singleton `wssHub`/`scopeService`.
6. Controller dạng object import singleton từ `services/*`; Container không quản lý vòng đời các adapter có state như CDP session, ProxyManager, ProcessManager và WebSocket Hub.

### 1.4 Domain và Types hiện tại

| Vùng | Nội dung | Vấn đề |
|---|---|---|
| `domain/` | Target/TargetFilter/Report entities và inputs; Fuzzer models + inputs | Entity và input DTO nằm gần nhau nhưng chưa phân biệt rõ internal model với HTTP payload |
| `types/api.type.ts` | API envelope | Thuộc API/transport, không phải Domain |
| `types/browser.type.ts`, `cdp.type.ts` | Browser launch/CDP protocol | Thuộc browser infrastructure/protocol |
| `types/ebpf.type.ts`, `mobile.type.ts` | eBPF/device status/provision result | Thuộc adapter/protocol hoặc API contract tùy consumer |
| `types/proxy.type.ts`, `realtime.type.ts` | Breakpoint/proxy/WebSocket messages | Thuộc proxy/realtime contract; không nên gom vào Domain chung |
| `domain/targets/platform.type.ts` | `TargetPlatform`, `Platform` | Business vocabulary; nên chuyển về Domain Target nếu là platform của Target |
| `types/startup.type.ts` | Preferences/server address/start options | Cần tách: Preferences thuộc storage adapter; ServerAddress/StartedOptions thuộc CLI bootstrap |
| `domain/report.entity.ts` | Có `file_path` dạng path vật lý/đường dẫn storage | Cần xác minh frontend có cần field này; cân nhắc chuyển sang response DTO, không đổi contract ngay |

### 1.5 File lớn và vùng rủi ro

| File | Dòng | Nhận định |
|---|---:|---|
| `services/proxy/proxy-server.service.ts` | 960 | Điểm nóng; cần phân vùng trách nhiệm event, request interception, TLS/HTTP forwarding, WebSocket và lifecycle sau khi lập bản đồ hàm |
| `startup/welcome.screen.ts` | 549 | Presentation/startup CLI, không phải application service |
| `services/browser/browser-control.service.ts` | 399 | Application-level browser actions đang phụ thuộc CDP/process implementation |
| `services/browser/cdp.service.ts` | 393 | Infrastructure adapter/stateful CDP session |
| `services/cli/ebpf-sniffer.service.ts` | 384 | Process/CLI adapter; cần tách runner/lifecycle nếu logic thực sự độc lập |
| `services/emulate/fuzzer.service.ts` | 304 | Use case + fuzzer file persistence; cần tách qua port nhưng không chia theo từng method |
| `services/proxy/proxy-manager.service.ts` | 136 | Session manager có state, cần sở hữu bởi Container |
| `api/controllers/mobile.controller.ts` | 119 | Controller đang điều phối nhiều service; logic orchestration nên chuyển lên Application Service |

> Dòng là số dòng file trong ZIP. Không có package/tsconfig/test config ở ZIP nên chưa xác nhận được lệnh build/test của repository gốc.

## 2. Kiến trúc đích

### 2.1 Cây thư mục mục tiêu

```text
src/
├── main.ts
├── app.ts
├── bootstrap/
│   ├── container.ts
│   ├── server.ts
│   └── cli/
│       └── welcome.screen.ts            # CLI preflight riêng của Emulate, nếu giữ prompt trước server
├── config/
├── api/
│   ├── controllers/
│   │   ├── capture-method.controller.ts
│   │   ├── cdp.controller.ts
│   │   ├── ebpf.controller.ts
│   │   ├── fuzzer.controller.ts
│   │   ├── mobile.controller.ts
│   │   ├── proxy.controller.ts
│   │   ├── report.controller.ts
│   │   ├── runtime-events.controller.ts
│   │   ├── runtime-process.controller.ts
│   │   ├── target-filter.controller.ts
│   │   ├── target.controller.ts
│   │   └── controller-set.ts            # ApiControllers contract, không import Container
│   ├── routes/
│   │   ├── runtime/
│   │   └── ...
│   ├── middleware/
│   │   ├── async-handler.middleware.ts
│   │   └── error-handler.middleware.ts
│   ├── contracts/                      # HTTP/WebSocket payloads thực sự public
│   └── http/
│       └── response.ts                 # JSON envelope helper; không tạo root http/
├── application/
│   ├── errors/
│   │   └── app.error.ts
│   ├── ports/
│   │   ├── repositories/
│   │   ├── storage/
│   │   ├── browser.port.ts
│   │   ├── process.port.ts
│   │   ├── proxy.port.ts
│   │   ├── mobile.port.ts
│   │   └── event-publisher.port.ts
│   └── services/
│       ├── targets/
│       ├── target-filters/
│       ├── fuzzers/
│       ├── reports/
│       ├── browser/
│       ├── proxy/
│       ├── runtime/
│       └── capture-methods/
├── domain/
│   ├── targets/
│   ├── target-filters/
│   ├── fuzzers/
│   └── reports/
├── infrastructure/
│   ├── persistence/
│   │   ├── sqlite/                      # connection, schema, migrations
│   │   ├── repositories/                # SQLite implementations
│   │   └── mappers/
│   ├── storage/                         # preferences, FuzzerFileStorage, ReportFileStorage
│   ├── filesystem/
│   ├── browser/                         # CDP, Chrome launcher
│   ├── process/                         # ProcessManager/process runner
│   ├── cli/                             # eBPF, terminal, TLS target adapters
│   ├── mobile/                          # ADB/Genymotion/Frida/cert/logcat adapters
│   ├── proxy/                           # MITM server, cache, proxy runtime
│   └── realtime/                       # WebSocket hub, network normalizer
└── utils/                               # helper thuần, không giữ service singleton
```

Không giữ root `constants/`, root `errors/` hoặc root `types/`: constants và types được chuyển về module sở hữu; `AppError` ở `application/errors/`. CLI welcome screen được chuyển vào `bootstrap/cli/` vì đây là bước preflight trước khi khởi động server; preferences JSON là file-storage adapter trong `infrastructure/storage/`.

### 2.2 Phân định các nhóm hiện tại

| Hiện tại | Đích đề xuất | Vì sao |
|---|---|---|
| `services/emulate/target.service.ts` | `application/services/targets/target.service.ts` | Use case quản lý Target |
| `services/emulate/target-filter.service.ts` | `application/services/target-filters/target-filter.service.ts` | Use case/filter policy |
| `services/emulate/fuzzer.service.ts` | `application/services/fuzzers/fuzzer.service.ts` | Quản lý fuzzer, payload, history; storage qua port |
| `services/emulate/report.service.ts` | `application/services/reports/report.service.ts` | Use case report; repository qua port |
| `services/browser/browser-control.service.ts` | `application/services/browser/browser-control.service.ts` | Điều phối thao tác browser; inject Browser/CDP port |
| `services/proxy/proxy-manager.service.ts` | `application/services/proxy/proxy-session.service.ts` (chỉ nếu xác nhận là use-case/session orchestration) | Quản lý vòng đời session; inject ProxyServerFactory |
| `services/runtime/capture-method.service.ts` | `application/services/capture-methods/` | Chọn/cung cấp capability theo platform |
| `services/browser/cdp.service.ts` | `infrastructure/browser/cdp.adapter.ts` | Kết nối CDP và giữ state session |
| `services/browser/chrome-launcher.service.ts` | `infrastructure/browser/chrome-launcher.adapter.ts` | Khởi chạy Chrome/Chromium |
| `services/cli/*` | `infrastructure/cli/` hoặc `infrastructure/process/` | Tương tác process/CLI/OS |
| `services/mobile/*` | `infrastructure/mobile/` | ADB, Genymotion, Frida, cert, logcat, proxy device |
| `services/proxy/proxy-server.service.ts` | `infrastructure/proxy/proxy-server.ts` | MITM server và network I/O |
| `services/proxy/cache/*` | `infrastructure/proxy/cache/` | Cache phục vụ proxy adapter |
| `services/realtime/*` | `infrastructure/realtime/` | WebSocket transport và event normalization |
| `services/runtime/process-manager.service.ts` | `infrastructure/process/process-manager.ts` | Quản lý child process |
| `repositories/*` | `infrastructure/persistence/repositories/` | Persistence adapter |
| `storage/*` | `infrastructure/storage/` | Filesystem storage implementation |
| `database/*` | `infrastructure/persistence/sqlite/` | Driver/schema/migration |
| `types/api.type.ts` | `api/contracts/api-envelope.type.ts` | Transport contract |
| `types/platform.type.ts` | `domain/targets/target-platform.type.ts` | Business vocabulary, nếu chỉ dùng cho Target |

### 2.3 Dependency direction

```text
main.ts → bootstrap/server.ts → bootstrap/container.ts
                                      │
                                      ├── tạo infrastructure adapters
                                      ├── inject application ports vào services
                                      ├── tạo 11 controllers
                                      └── sở hữu lifecycle của adapter có state

app.ts → api/routes → api/controllers → application/services → application/ports
                                                     │                ▲
                                                     ▼                │ implements
                                                   domain      infrastructure adapters

bootstrap/cli/welcome.screen.ts → startup preflight; không thuộc Domain/Application use case
domain → không phụ thuộc layer nào
api → không import concrete Infrastructure implementation
```

Quy tắc:

1. `main.ts` chỉ gọi `startServer()`; `bootstrap/server.ts` điều phối startup/shutdown.
2. `app.ts` nhận `ApiControllers`/API dependencies qua tham số, không import `Container`.
3. `api/routes/index.ts` chỉ nhận `ApiControllers`; không import `Container` hoặc concrete singleton.
4. Application Service chỉ phụ thuộc `domain` và `application/ports`; không import Express, SQLite, Node fs, child process, CDP, WebSocket hoặc concrete service adapter.
5. Infrastructure adapters triển khai ports; không import Controller/Route.
6. Container là Composition Root duy nhất biết đồng thời Application và concrete Infrastructure.
7. Stateful adapter (CDP, ProxyManager, ProcessManager, WebSocket Hub) được Container tạo và sở hữu lifecycle; pure utility/constants không cần DI.
8. Event bridge nhận dependency qua tham số; không import singleton từ `services/`.

### 2.4 Container và Controller

**Container cần quản lý:**

- Repository adapters: Target, TargetFilter, Report.
- Storage adapters: Fuzzer storage, Report storage, target data-directory storage.
- Application services: Target, TargetFilter, Fuzzer, Report, Browser Control, Proxy Session, Runtime Process/Mobile orchestration nếu có use case.
- Infrastructure stateful adapters: CDP, Chrome launcher, eBPF, ProcessManager, ProxyManager/ProxyServerFactory, WebSocket Hub, NetworkNormalizer.
- Controllers: toàn bộ 11 controllers.
- Runtime bridge: `bridgeProxyEventsToHub` nhận object dependencies từ Container.

Không cần đưa constants, pure parser, ID helper, `network.util` không trạng thái hoặc function thuần vào Container.

**Chuẩn hóa Controller:**

- Ưu tiên class cho Controller cần dependency.
- `createXRoutes(controller)` chỉ đăng ký method, không import singleton.
- Controller chịu trách nhiệm HTTP input/output và status code; nghiệp vụ điều phối nhiều adapter chuyển thành Application Service.
- Dùng `asyncHandler`/error middleware nhất quán, nhưng `proxy.controller.ts` hiện ghi rõ response legacy `{ success }`/`{ error }`. Không thay response envelope trước khi frontend contract được kiểm tra.

### 2.5 Domain và API contracts

| Nội dung hiện tại | Nơi chịu trách nhiệm mới |
|---|---|
| Target/TargetFilter/Fuzzer/Report entity | `domain/<domain>/` |
| Create/Update inputs | `api/contracts/` nếu chỉ là HTTP payload; `application` command nếu dùng độc lập transport |
| `Envelope<T>` | `api/contracts/` |
| Browser/CDP/eBPF/mobile/proxy protocol types | `infrastructure/<adapter>/contracts/` hoặc `api/contracts/` nếu được gửi ra renderer |
| `TargetPlatform` | `domain/targets/` nếu là khái niệm nghiệp vụ |
| Startup Preferences/ServerAddress | `Preferences` ở `infrastructure/storage/`; `ServerAddress`/`StartedOptions` ở `bootstrap/cli/` |
| `Report.file_path` | Cần xác minh; có khả năng là response/storage detail, không phải invariant của Report entity |
| `AppError` | `application/errors/app.error.ts`; API middleware chuyển thành HTTP status/body |

Không tạo Domain Model phong phú nếu nghiệp vụ hiện chỉ cần data record. Chỉ đưa quy tắc vào Domain khi có invariant kiểm chứng được.

## 3. Ánh xạ file cũ → file mới

| Hiện tại | Đích | Hành động |
|---|---|---|
| `main.ts` | `main.ts` | Giữ làm entry point; chỉ gọi `startServer()` và giữ `dotenv/config` là import đầu tiên |
| `app.ts` | `app.ts` | Giữ `createApp(ApiControllers)`; không import `Container` hoặc tự init DB/listen |
| `api/controllers/*` | `api/controllers/*` | Chuẩn hóa 7 object controllers thành class/factory có dependency explicit; giữ 4 class hiện có |
| `api/routes/*` | `api/routes/*` | Nhận `ApiControllers`; chỉ khai báo route và middleware |
| `api/middleware/*` | `api/middleware/*` | Giữ async/error middleware tại API boundary; bổ sung auth nếu API cần |
| (chưa có) | `api/controllers/controller-set.ts` | Định nghĩa `ApiControllers` contract, không phụ thuộc Container |
| `bootstrap/container.ts` | `bootstrap/container.ts` | Mở rộng composition root để wire toàn bộ controller/use case/adapter stateful |
| `bootstrap/server.ts` | `bootstrap/server.ts` | Giữ lifecycle DB, HTTP, WebSocket, event bridge và shutdown |
| `bootstrap/proxy-event-bridge.ts` | `bootstrap/proxy-event-bridge.ts` | Inject event sources/hub qua tham số, không import singleton |
| `startup/welcome.screen.ts` | `bootstrap/cli/welcome.screen.ts` | Chuyển CLI preflight presentation trước server startup |
| `startup/preferences.store.ts` | `infrastructure/storage/preferences.store.ts` | File JSON preferences là storage adapter; inject file path từ config thay vì đọc config singleton trực tiếp |
| `database/*` | `infrastructure/persistence/sqlite/` | SQLite connection/schema/migrations |
| `repositories/*` | `infrastructure/persistence/repositories/` | Concrete persistence adapters, implement repository ports |
| `storage/*` | `infrastructure/storage/` | File storage implementations và preferences storage |
| `services/emulate/*` | `application/services/{targets,target-filters,fuzzers,reports}/` | Use cases; inject repository/storage ports |
| `services/browser/browser-control.service.ts` | `application/services/browser/` | Giữ orchestration/use case; inject browser ports |
| `services/browser/{cdp,chrome-launcher}.service.ts` | `infrastructure/browser/` | CDP session và Chrome launcher adapters |
| `services/cli/*` | `infrastructure/cli/` hoặc `infrastructure/process/` | OS/process integration, phân theo responsibility |
| `services/mobile/*` | `infrastructure/mobile/` | Device/OS adapters; phần orchestration chuyển thành Application use case nếu thực sự có flow |
| `services/proxy/proxy-server.service.ts` và `cache/*` | `infrastructure/proxy/` | Proxy runtime/cache adapters; tách trách nhiệm sau khi map state/event |
| `services/proxy/proxy-manager.service.ts` | `application/services/proxy/` hoặc `infrastructure/proxy/` | Chốt vị trí theo việc là use-case orchestration hay runtime lifecycle manager |
| `services/realtime/*` | `infrastructure/realtime/` | WebSocket/event transport adapters |
| `services/runtime/process-manager.service.ts` | `infrastructure/process/` | Process lifecycle adapter |
| `constants/*` | module sở hữu constant | Không giữ root constants; capture methods → Application capability; Chrome → browser infra; HTTP → `api/http`; proxy → proxy infra |
| `errors/app.error.ts` | `application/errors/app.error.ts` | Application error độc lập HTTP |
| `types/*` | `domain/`, `api/contracts/`, `infrastructure/*/contracts/`, `infrastructure/storage/`, `bootstrap/cli/` | Phân loại theo owner; `Preferences` đi cùng storage adapter, `ServerAddress`/`StartedOptions` thuộc CLI bootstrap; xóa root `types/` sau khi cập nhật importer |
| `utils/http-response.util.ts` | `api/http/response.ts` | Đây là HTTP response helper vì phụ thuộc Express `Response`; không giữ trong generic utils |

## 4. Kế hoạch theo phase

> Di chuyển theo nhóm domain, mỗi task giữ build xanh. Không đổi format response hay network event schema trong cùng commit với move file.

### Phase 1 — Chuẩn hóa API composition và Controller

**Mục tiêu:** gỡ phụ thuộc `api/app → bootstrap`; tất cả routes dùng Controller instances.

1. **1.1 — Tách API dependency contract**
   - File: `api/controllers/controller-set.ts` (new), `app.ts`, `api/routes/index.ts`, `bootstrap/container.ts`.
   - Khai báo `ApiControllers` ở API boundary; `app.ts` nhận `ApiControllers`, không import `Container` từ bootstrap.
   - `bootstrap/container.ts` vẫn là nơi build instances nhưng API không biết loại Container.
2. **1.2 — Chuẩn hóa Controller factory**
   - File: `api/controllers/capture-method.controller.ts`, `api/routes/capture-method.routes.ts`, `api/routes/index.ts`.
   - Truyền Controller/catalogue qua route factory; giữ nguyên path và payload.
3. **1.3 — Proxy Controller**
   - File: `api/controllers/proxy.controller.ts`, `api/routes/proxy.routes.ts`.
   - Chuyển object controller sang instance; inject proxy-session dependency; giữ response legacy và error mapping.
4. **1.4 — CDP và runtime-events Controllers**
   - File: `api/controllers/cdp.controller.ts`, `api/controllers/runtime-events.controller.ts`, route runtime tương ứng.
   - Inject CDP/browser/event source; Controller không import global singleton.
5. **1.5 — eBPF và runtime-process Controllers**
   - File: `api/controllers/ebpf.controller.ts`, `api/controllers/runtime-process.controller.ts`, route runtime tương ứng.
   - Inject runtime use cases, không để controller tự khởi tạo process/adapter.
6. **1.6 — Mobile Controller**
   - File: `api/controllers/mobile.controller.ts`, route runtime/mobile tương ứng.
   - Tách orchestration nhiều mobile adapter ra `MobileAutomationService`; Controller chỉ parse request và trả response.
7. **1.7 — Route registry**
   - File: `api/routes/index.ts`, `api/routes/runtime/index.ts`, `app.ts`.
   - Toàn bộ Controller được truyền vào route factory; grep import trực tiếp `services/*` trong `api/controllers` và `api/routes` phải được xử lý.

### Phase 2 — Hoàn thiện Container và constructor injection

**Mục tiêu:** Container quản lý dependency có state; services phụ thuộc abstraction thay vì concrete classes.

1. **2.1 — Khai báo ports cho persistence/storage**
   - File: `application/ports/repositories/target.repository.port.ts`, `target-filter.repository.port.ts`, `report.repository.port.ts`, `application/ports/storage/fuzzer-storage.port.ts`, `report-storage.port.ts`.
   - Tách contract khỏi concrete repository/storage.
2. **2.2 — Inject Target dependencies**
   - File: `services/emulate/target.service.ts`, `repositories/target.repository.ts`, `bootstrap/container.ts`.
   - `TargetService` nhận TargetRepositoryPort + TargetDirectoryStoragePort; bỏ `fs` và `getTargetDir()` khỏi Application Service.
3. **2.3 — Inject TargetFilter/Report**
   - File: `target-filter.service.ts`, `report.service.ts`, `target-http-filter.repository.ts`, `report.repository.ts`.
   - `ReportRepository` nhận `ReportFileStorage` qua constructor; không `new ReportFileStorage()` bên trong repository.
4. **2.4 — Inject Fuzzer storage**
   - File: `fuzzer.service.ts`, `fuzzer-file.storage.ts`, `bootstrap/container.ts`.
   - FuzzerService chỉ biết storage port; file JSON layout giữ nguyên.
5. **2.5 — Container tạo toàn bộ stateful adapters**
   - File: `bootstrap/container.ts`, `bootstrap/server.ts`.
   - Container khởi tạo CDP, ProcessManager, ProxyManager, WebSocket Hub, NetworkNormalizer, mobile/CLI adapters và controllers.
   - Không đưa pure helpers/constants vào Container.
6. **2.6 — Inject lifecycle/event bridge**
   - File: `bootstrap/proxy-event-bridge.ts`, `bootstrap/server.ts`, `services/realtime/wss-hub.service.ts` (hoặc adapter path mới).
   - Event bridge nhận dependency object; shutdown dừng đúng resource từ Container, không import singleton toàn cục.
7. **2.7 — Runtime orchestration services**
   - File: `application/services/browser/*`, `application/services/proxy/*`, `application/services/runtime/*`, controllers tương ứng (chia thành các task ≤5 file).
   - Controller không phối hợp trực tiếp nhiều adapter; use case facade sẽ phối hợp qua ports.

### Phase 3 — Domain separation và error boundary

**Mục tiêu:** Domain độc lập HTTP, DB và protocol của adapter.

1. **3.1 — Application errors**
   - File: `application/errors/app.error.ts`, `api/middleware/error-handler.middleware.ts`, `utils/error.util.ts`.
   - Tách error semantic khỏi HTTP response; middleware ánh xạ error sang status/body.
2. **3.2 — Domain Target/Filter**
   - File: `domain/target.entity.ts` → `domain/targets/target.entity.ts`; `domain/target.input.ts` → `domain/targets/target.input.ts`; `domain/target-filter.entity.ts` → `domain/target-filters/target-filter.entity.ts`; `domain/target-filter.input.ts` → `domain/target-filters/target-filter.input.ts`; `types/platform.type.ts` → `domain/targets/target-platform.type.ts`.
   - Gom business vocabulary theo domain; inputs nào chỉ phục vụ HTTP chuyển sang API command/DTO nhưng giữ wire compatibility.
3. **3.3 — Domain Fuzzer/Report**
   - File: `domain/fuzzer/fuzzer.types.ts` → `domain/fuzzers/fuzzer.types.ts`; `domain/report.entity.ts`/`domain/report.input.ts` → `domain/reports/`.
   - Phân biệt persisted model, domain entity và HTTP payload. Xác minh `Report.file_path` trước khi di chuyển.
4. **3.4 — Phân loại và loại bỏ root `types/`**
   - Theo lô: API envelope/contracts; browser/CDP; eBPF; mobile; proxy/realtime; startup.
   - Tách `Preferences` sang `infrastructure/storage/preferences.types.ts`; `ServerAddress` và `StartedOptions` sang `bootstrap/cli/startup.types.ts`.
   - Chuyển type đúng owner, tránh tạo `shared/types` thay thế nếu type chỉ có một adapter dùng.
5. **3.5 — Loại bỏ HTTP transport khỏi Application**
   - `AppError`/validation không import Express; service không trả `Response`; các response presenter nằm ở Controller/API contract.

### Phase 4 — Infrastructure separation và module cohesion

**Mục tiêu:** nhóm các adapter kỹ thuật riêng và đưa Application Service về đúng vai trò.

1. **4.1 — Persistence/Storage**
   - Di chuyển `database/` và `repositories/` vào `infrastructure/persistence/`; di chuyển `storage/` và preferences file adapter vào `infrastructure/storage/`.
   - Repository triển khai application ports; storage implementation được inject.
2. **4.2 — Browser boundary**
   - Chuyển `cdp.service.ts` và `chrome-launcher.service.ts` thành `infrastructure/browser` adapters.
   - Giữ `browser-control.service.ts` ở Application; inject `BrowserSessionPort`/`BrowserAutomationPort`.
3. **4.3 — Process/CLI boundary**
   - Chuyển `process-manager`, eBPF capture/sniffer, terminal launcher, TLS target resolver vào `infrastructure/process`/`infrastructure/cli`.
   - Quản lý spawn/kill/stdout/stderr trong adapter; không để Controller nắm child process.
4. **4.4 — Mobile boundary**
   - Chuyển ADB/Genymotion/Frida/cert/logcat/SSL/transparent proxy adapters vào `infrastructure/mobile`.
   - Application Mobile service phối hợp thao tác theo use case; không tạo facade nếu các adapter không được phối hợp chung.
5. **4.5 — Proxy boundary**
   - Chuyển `proxy-server.service.ts` và cache sang `infrastructure/proxy`.
   - Tách các trách nhiệm trong file 960 dòng sau khi lập bản đồ: session lifecycle, HTTP request/response, WebSocket, breakpoint, TLS/certificate và event emission. Chỉ tạo module khi có state/contract riêng.
6. **4.6 — Realtime boundary**
   - Chuyển WebSocket Hub và NetworkNormalizer vào `infrastructure/realtime`; expose EventPublisher/EventStream ports cho Application/API.
7. **4.7 — Nhóm Application theo domain**
   - Gom `Target`, `TargetFilter`, `Fuzzer`, `Report`, `Browser`, `Proxy`, `Runtime`, `CaptureMethod` vào `application/services/<domain>/`.
   - Không gom tất cả vào một `services/` phẳng; không tạo 1 service cho từng route.

### Phase 5 — Cohesion, dọn dẹp và kiểm chứng

1. **5.1 — Chuẩn hóa export/lifecycle**: bỏ export singleton ở adapter đã được Container tạo; giữ function thuần dưới dạng function.
2. **5.2 — Rà soát module ownership**: target/fuzzer/report use case không import trực tiếp infra; Browser Control không import `cdpService` singleton; Proxy use case không tự `new ProxyServer` ngoài factory.
3. **5.3 — Rà soát startup**: `welcome.screen`, preferences, config, DB init, HTTP listen, WebSocket init và shutdown có thứ tự rõ ràng; `main.ts` vẫn giữ `dotenv/config` là import đầu tiên.
4. **5.4 — Dọn type/error/utils**: chỉ xóa shim sau khi grep toàn repo; không tạo barrel import vòng.
5. **5.5 — Rà soát file lớn**: `proxy-server.service.ts` là ưu tiên; `welcome.screen.ts` chỉ tách nếu phần UI/startup có trách nhiệm độc lập.
6. **5.6 — Smoke/integration**: Target CRUD, filter upsert, Fuzzer/payload/history, Report file storage, proxy session, intercept/breakpoint, CDP/browser, eBPF, mobile, WebSocket events, startup/shutdown.

## 5. Quy tắc Module Cohesion theo mẫu Code

- Nhóm theo capability/domain trong Application layer: `targets`, `target-filters`, `fuzzers`, `reports`, `browser`, `proxy`, `runtime`, `capture-methods`.
- Nhóm theo công nghệ trong Infrastructure layer: `persistence`, `storage`, `browser`, `process`, `cli`, `mobile`, `proxy`, `realtime`.
- Chỉ một owner cho mỗi type; không tạo root `types/` chung cho mọi protocol.
- Không tách file chỉ vì một file dài. Đầu tiên map các responsibility/entry point/state; sau đó tách theo boundary có thể test/thay thế độc lập.
- Không để API Controller điều phối chuỗi 3–5 adapter. Tạo Application Service khi chuỗi đó là use case; không tạo Service chỉ làm pass-through một method.
- Không để adapter import Adapter khác trực tiếp khi có thể wiring ở Container; riêng adapter phối hợp nội bộ cùng subsystem chỉ giữ nếu đó là một implementation detail rõ ràng.

## 6. Checklist cho Executor

### Dependency và DI

- [ ] `app.ts` không import `bootstrap/container.ts`.
- [ ] `api/routes/index.ts` không import `Container` từ bootstrap.
- [ ] Tất cả Controller nhận dependency qua constructor/factory; không import global singleton.
- [ ] Container tạo các singleton stateful đúng một lần và sở hữu lifecycle.
- [ ] Application Service phụ thuộc interfaces ở `application/ports`, không phụ thuộc concrete Repository/Storage/Browser/CDP/Proxy/Process class.
- [ ] Repository/Storage/Browser/Proxy/Process adapter implement port; không import API.
- [ ] Event bridge nhận dependency qua tham số; không import singleton.

### Domain/API/Infrastructure

- [ ] Domain không import Express, SQLite, `fs`, child process, CDP hoặc WebSocket.
- [ ] API DTO/envelope không nằm trong Domain.
- [ ] DB schema/row mapping nằm trong `infrastructure/persistence/`.
- [ ] Protocol type chỉ ở owner tương ứng hoặc API contract nếu thực sự gửi qua HTTP/WebSocket.
- [ ] Report path/file metadata được phân loại theo consumer; không đổi response contract trong phase move.
- [ ] Infrastructure chỉ chứa integration/driver/adapter; Application chỉ chứa use case/orchestration.

### Hành vi và chất lượng

- [ ] Giữ nguyên routes, payload, status code và legacy response shape.
- [ ] Giữ nguyên WebSocket channel/event payload và thứ tự lifecycle.
- [ ] Proxy request forwarding, breakpoint pause/resolve/drop, TLS và WebSocket tunneling không đổi.
- [ ] Giữ thứ tự startup: dotenv → welcome/config → DB → container → event bridge → app/server → WebSocket → listen; shutdown dừng resource trước DB close.
- [ ] Không thêm class/interface/folder nếu không tạo boundary có ý nghĩa.
- [ ] Không format lại vùng code không liên quan; không thêm comment mới nếu không cần thiết.

### Script kiểm tra sau phase

```bash
# API không import service implementation trực tiếp
rg "from ['\"].*services/" src/api

# App/API không phụ thuộc bootstrap Container
rg "bootstrap/container|Container" src/app.ts src/api

# Application không import infrastructure implementation
rg "from ['\"].*(repositories|storage|services/(browser|cli|mobile|proxy|realtime|runtime))/" src/application

# Domain không import technology/framework
rg "express|better-sqlite|sqlite|node:fs|from ['\"]fs|child_process|ws" src/domain

# Adapter singleton không còn được import trực tiếp từ controllers/bootstrap bridge
rg "import \{ (proxyManager|cdpService|wssHub|processManager|ebpfCaptureService) \}" src/api src/bootstrap
```

## 7. Giả định / Cần xác minh trước khi triển khai

1. ZIP không có `package.json`, `tsconfig`, test config hoặc toàn bộ cấu hình root; cần dùng metadata từ repository gốc để chọn build/test command.
2. `Report.file_path` có thể là field tương thích với frontend; không xóa/đổi tên trước khi truy toàn bộ consumer.
3. `ProxyManager` có thể là application session orchestrator hoặc infrastructure runtime manager; xác định qua toàn bộ event/lifecycle call sites trước khi chốt vị trí.
4. `BrowserControlService` đang điều phối nhiều CDP/process operation; cần lập dependency map từng method trước khi tạo Browser port để tránh một port quá rộng.
5. `MobileController` hiện import 5 mobile/proxy modules; cần xác định chuỗi nghiệp vụ nào thuộc Mobile use case và thao tác nào chỉ là lệnh adapter.
6. `RuntimeProcessController` đang import Chrome launcher, ProcessManager và eBPF capture; không gộp tất cả thành một interface khổng lồ. Có thể tách theo use case launch/stop/capture.
7. `proxy-server.service.ts` 960 dòng cần được phân tích theo vùng state/event và ownership trước khi chia. Không tự động tách mỗi nhóm method thành một class.
8. `welcome.screen.ts` là terminal UI startup; không đưa vào Application Domain. Nếu refactor, giữ thứ tự prompt và config resolution hiện tại.
9. `ReportRepository` hiện tự tạo `ReportFileStorage`; chuyển qua constructor phải giữ base path và path traversal/security behavior y hệt.
10. `TargetService.delete()` hiện xóa data folder sau khi delete repository thành công; khi chuyển sang storage port phải giữ đúng thứ tự và semantics failure.
11. `bootstrap/server.ts` đang dùng singleton `wssHub`/`scopeService`; cần xem toàn bộ shutdown behavior và event listener cleanup khi biến thành instance.
12. Type trong root `types/` có thể đang được import ngoài phạm vi ZIP (renderer/main process); trước khi di chuyển cần quét toàn monorepo và có shim nếu cần.

## 8. Definition of Done

- [ ] 11 Controller được tạo/wire nhất quán; không còn controller import singleton service.
- [ ] API/app không phụ thuộc kiểu `Container` từ bootstrap.
- [ ] Container sở hữu các stateful services/adapters và lifecycle shutdown.
- [ ] Application Service phụ thuộc ports, không phụ thuộc repository/storage/OS implementation.
- [ ] Domain chỉ giữ business model/rules; API, persistence và protocol types được phân loại đúng owner.
- [ ] Infrastructure được chia theo subsystem và adapter: persistence, storage, filesystem, browser, process/CLI, mobile, proxy, realtime.
- [ ] Application Service cohesion theo domain; không tạo pass-through service hoặc folder dư thừa.
- [ ] Không thay đổi API/WS contracts và hành vi proxy/runtime ngoài các ticket được duyệt riêng.
- [ ] Build/test/smoke xác nhận CRUD, fuzzing, reports, proxy/CDP/eBPF/mobile/realtime hoạt động như trước.
