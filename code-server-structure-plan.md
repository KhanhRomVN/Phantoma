# Kế hoạch Restructure + Clean Architecture — Code Backend

> Giai đoạn 1 — Lập kế hoạch. Planner không sửa file source.
> Phạm vi quét: toàn bộ nội dung `code.zip` được cung cấp. ZIP có 64 file TypeScript, khoảng 5.276 dòng. Ngày quét: 2026-11-25.
> Mục tiêu theo yêu cầu: (1) thêm Controller; (2) Container + constructor injection ở nơi có dependency; (3) cải thiện dependency direction; (4) tách Domain khỏi HTTP/DB; (5) tách Infrastructure; (6) giữ module cohesion theo cách nhóm domain của Code (`git/`, `fs/`, `pull-request/`, `search/`).
> Đây là kế hoạch cấu trúc, không phải yêu cầu đổi API hoặc thay hành vi nghiệp vụ.

## 0. Tóm tắt

- **Hiện trạng:** Code đã có `http/`, `infra/`, `services/` và nhóm service theo domain. Tuy nhiên, Route đang gọi Service trực tiếp; chưa có Controller, `Container` hoặc app factory. Service và Repository phần lớn là object singleton, import dependency trực tiếp.
- **Vấn đề quan trọng:** `services/{project,task,session,scope,workflow,worktree,group}.service.ts` import Repository cụ thể; một số Service/Repository import helper lỗi từ `utils/http` hoặc `http/envelope`; `git-export.service.ts` phụ thuộc trực tiếp HTTP. `domain/mappers.ts` chứa mapper database row; `domain/api-types.ts` lại chứa response contract của API.
- **Mục tiêu:** Route chỉ khai báo URL/method và gắn Controller; Controller xử lý HTTP input/output; Application Service xử lý use case; Repository/Filesystem/Process/Git adapter nằm ở Infrastructure; Domain chỉ giữ mô hình và quy tắc nghiệp vụ độc lập.
- **Nguyên tắc DI:** Không chuyển mọi file thành class. Chỉ dùng constructor injection cho Controller, Application Service và adapter có dependency/state cần thay thế hoặc kiểm thử. Hàm thuần và module không trạng thái được giữ dạng function.
- **Thứ tự:** tạo composition root → thêm Controller → DI cho service nghiệp vụ → đảo dependency và tách Domain/Infrastructure → dọn shim và rà soát.
- **Không đổi hợp đồng:** giữ nguyên route, status code, JSON envelope, query/body, error semantics và startup behavior trong các phase đầu.


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
├── startup/                              # optional: application startup tasks, không quản lý server lifecycle
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
| Startup tasks | Project có application startup workflow được phép có `startup/`; Code dùng folder này cho tác vụ nghiệp vụ lúc khởi động. `bootstrap/` vẫn sở hữu process/server lifecycle |

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
        ├── startup/startup.runner.ts ──► startup tasks ──► application services
        │
        └── app.ts ──► api/routes ──► api/controllers
                          │                 │
                          └── api/middleware│
                                            └── application services

domain ──► không phụ thuộc layer khác
infrastructure ──► application ports + domain (khi cần)
api ──► application contracts/errors; không import infrastructure implementation
startup ──► application services/ports qua dependency được inject; không import bootstrap hoặc concrete infrastructure
```

`bootstrap/container.ts` là nơi duy nhất được phép biết đồng thời Application và concrete Infrastructure để wiring. `app.ts`, `api/routes/` và `api/controllers/` không được import `Container` từ `bootstrap/`. Container có thể wire startup task bằng cách inject Application Service vào task factory; `startup/` không import Container hoặc concrete Infrastructure.


## 1. Hiện trạng

### 1.1 Tổng quan cây thư mục hiện tại

```text
src/
├── config/                 # server.config.ts
├── database/               # connection.ts, integrity.ts
├── domain/                 # api-types.ts, mappers.ts
├── http/                   # auth, envelope, guard, params, sse
├── infra/                  # process-runner, git-runner, gh-runner
├── repositories/           # 12 repository dạng object
├── routes/                 # 9 route modules + routes.ts
├── services/
│   ├── fs/                 # fs-query, fs-write, image
│   ├── git/                # branch, diff, explorer, export, history, protect,
│   │                       # read, remote, repo, status, write, default-branch
│   ├── pull-request/
│   ├── search/
│   └── project/task/session/scope/worktree/workflow/group
├── utils/                  # guard.ts, http.ts (re-export compatibility)
└── index.ts
```

### 1.2 Các điểm đã xác minh trong source

| Vùng | Hiện trạng | Nhận định |
|---|---|---|
| HTTP | 9 route modules tự tạo Router và chứa callback xử lý request | Chưa có Controller; parsing, guard, gọi Service và response nằm trong Route |
| Composition | `index.ts` tạo Express app, cấu hình middleware, init DB, đăng ký root provider, mount route, listen và shutdown | Chưa tách `createApp()` khỏi startup; chưa có Composition Root riêng |
| Route dependencies | Route import trực tiếp `projectService`, `gitService`, `fsService`, `prService`… | Route gắn chặt với singleton implementation |
| Application services | Nhiều service được export dưới dạng object literal; các service CRUD import repository singleton trực tiếp | Khó thay dependency khi unit test hoặc thay implementation |
| Persistence | Repository gọi `getDb()` trực tiếp; phần lớn export object singleton | Đây là adapter DB, nhưng contract của repository chưa được tách khỏi implementation |
| Error boundary | `utils/http.ts` re-export `http/envelope`; Service và Repository dùng `AppError` từ lớp HTTP qua `utils/http` | Application/Persistence đang phụ thuộc transport HTTP |
| Path policy | `http/guard.ts` chứa `safePath` và biến module-level `rootProvider`; `index.ts` gọi `registerRootProvider()` | Global mutable state; khó tạo app độc lập trong test |
| Domain | `domain/mappers.ts` chứa `Row`, SQL row mapping và model; `domain/api-types.ts` chứa FS/Git API DTO | Domain đang trộn persistence mapping và API contract |
| Infrastructure | `infra/` mới có runner cho process/Git/GH; các thao tác Node filesystem còn nằm trong `services/fs/` | Ranh giới giữa use case và adapter chưa đồng nhất |
| Naming | `services/git/git-status.service.ts` export `gitService`; `services/git/git-read.service.ts` và `git-history.service.ts` cùng tồn tại | Cần chuẩn hóa tên export/file theo đúng domain và trách nhiệm, tránh tạo thêm module trùng |

### 1.3 Điểm phụ thuộc cần xử lý

**Service phụ thuộc Repository cụ thể:**

- `project.service.ts` → project/session/workspace-panel/worktree repositories.
- `task.service.ts` → task/tag/checklist/attachment/dependency/project repositories.
- `session.service.ts` → project/session/worktree repositories.
- `scope.service.ts` → scope/worktree repositories.
- `worktree.service.ts` → project/worktree repositories.
- `workflow.service.ts` → workflow/task repositories.
- `group.service.ts` → group repository.

**Phụ thuộc ngược vào HTTP:**

- `services/fs/fs-query.service.ts` import `AppError` từ `utils/http` và `safePath` từ `utils/guard`.
- `services/git/git-export.service.ts` import `AppError` trực tiếp từ `http/envelope`.
- `repositories/scope.repository.ts` và `repositories/worktree.repository.ts` import `AppError` từ `utils/http`.
- `http/auth.ts` import `fail` thông qua `utils/http` thay vì import trực tiếp từ HTTP envelope.
- `utils/guard.ts` và `utils/http.ts` hiện chỉ là re-export shim, nhưng vẫn còn importer.

**Khác biệt giữa file domain và file transport/persistence:**

- `domain/mappers.ts`: `Row`, `mapProject`, `mapWorktree`, `mapTask`… là mapper từ DB row, không phải domain model.
- `domain/api-types.ts`: `DirEntry`, `FileStat`, `TreeNode`, `SquareImage`, `GitStatusPayload` là shape phục vụ API/use case, không phải tất cả đều là domain entity.

### 1.4 Quy mô file đáng chú ý

| File | Dòng | Hành động |
|---|---:|---|
| `services/fs/image.service.ts` | 291 | Kiểm tra ranh giới image scanning/download và cache; chưa cần tách chỉ vì kích thước |
| `services/fs/fs-query.service.ts` | 278 | Tách path policy khỏi logic filesystem; xem xét adapter filesystem |
| `services/pull-request/pull-request.service.ts` | 243 | Tách gh process adapter khỏi use case; không chia nhỏ theo từng endpoint |
| `services/git/git-diff.service.ts` | 243 | Giữ một module diff nếu trách nhiệm vẫn cohesion |
| `routes/fs.route.ts` | 166 | Chuyển callback sang `FsController` |
| `routes/git.route.ts` | 165 | Chuyển parsing/dispatch sang `GitController`; giữ một route module vì endpoint cùng domain |
| `routes/pull-request.route.ts` | 114 | Chuyển sang `PullRequestController` |

> Số dòng là số dòng file trong ZIP; chưa có `package.json`, `tsconfig` hoặc test config của project trong ZIP nên chưa thể xác nhận lệnh build/test.

## 2. Kiến trúc đích

### 2.1 Cây thư mục mục tiêu

```text
src/
├── main.ts                              # entry point: gọi startServer(), không chứa setup
├── app.ts                               # createApp(apiControllers): Express app, không listen/init DB
├── bootstrap/
│   ├── container.ts                     # composition root: adapter → service → controller + startup task
│   └── server.ts                        # config/DB init, createContainer, createApp, listen, shutdown
├── startup/
│   ├── startup.runner.ts                # chạy tuần tự startup tasks được inject
│   └── tasks/
│       └── purge-default-branch-scopes.task.ts # gọi ScopeService qua dependency được inject
├── config/
│   └── server.config.ts
├── api/
│   ├── controllers/
│   │   ├── project.controller.ts
│   │   ├── group.controller.ts
│   │   ├── scope.controller.ts
│   │   ├── session.controller.ts
│   │   ├── task.controller.ts
│   │   ├── fs.controller.ts
│   │   ├── git.controller.ts
│   │   ├── pull-request.controller.ts
│   │   ├── search.controller.ts
│   │   └── controller-set.ts            # ApiControllers contract, không import Container
│   ├── routes/                          # khai báo method/path và gắn Controller
│   │   ├── project.route.ts
│   │   ├── group.route.ts
│   │   ├── scope.route.ts
│   │   ├── session.route.ts
│   │   ├── task.route.ts
│   │   ├── fs.route.ts
│   │   ├── git.route.ts
│   │   ├── pull-request.route.ts
│   │   ├── search.route.ts
│   │   └── routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   └── async-handler.middleware.ts   # chỉ thêm nếu Express/runtime cần wrapper
│   ├── contracts/                       # API request/response DTO
│   │   ├── filesystem.types.ts
│   │   └── git.types.ts
│   └── http/
│       ├── envelope.ts                  # map ApplicationError → HTTP response
│       ├── params.ts
│       └── sse.ts
├── application/
│   ├── errors/
│   │   └── app.error.ts                 # lỗi application độc lập Express
│   ├── ports/
│   │   ├── repositories/
│   │   ├── filesystem.port.ts
│   │   ├── git-command.port.ts
│   │   ├── process-runner.port.ts
│   │   ├── path-access.port.ts
│   │   └── github-command.port.ts
│   └── services/
│       ├── projects/                    # project + worktree
│       ├── sessions/
│       ├── scopes/
│       ├── tasks/                       # task + workflow
│       ├── groups/
│       ├── fs/
│       ├── git/
│       ├── pull-request/
│       └── search/
├── domain/
│   ├── project/
│   ├── session/
│   ├── task/
│   ├── workflow/
│   ├── group/
│   └── scope/
├── infrastructure/
│   ├── persistence/
│   │   ├── sqlite/                      # connection.ts, integrity.ts, schema/migrations nếu có
│   │   ├── repositories/                # SQLite repository implementations
│   │   └── mappers/                     # DB row ↔ application/domain model
│   ├── filesystem/                     # Node fs/image + project path access adapters
│   ├── process/                         # process-runner adapter
│   ├── git/                             # git command adapter
│   └── github/                          # gh command adapter
└── utils/                               # helper thuần, không phụ thuộc layer
```

Không giữ `src/index.ts` làm entry point thứ hai. Các `index.ts` dùng làm barrel export bên trong module vẫn hợp lệ. `api/http/` và `api/middleware/` là hai nhóm khác trách nhiệm; không tạo `src/http/` ở root. `startup/` chỉ chứa application startup workflow; không thay thế hoặc trùng trách nhiệm với `bootstrap/`.

### 2.2 Trách nhiệm từng layer

| Layer | Được phép làm | Không được làm |
|---|---|---|
| Route | Khai báo method/path, middleware, gắn controller method | Parse nghiệp vụ, gọi Repository/Service, dựng JSON response |
| Controller | Đọc params/query/body, gọi guard/validator, gọi một use case, map kết quả HTTP | Query DB, chạy Git trực tiếp, chứa business workflow dài |
| Application Service | Use case, orchestration giữa các port, validation nghiệp vụ | Import Express, `Request/Response`, `api/http/envelope`, SQLite hoặc Node fs trực tiếp |
| Domain | Entity/type/value object và invariant thực sự thuộc nghiệp vụ | HTTP DTO, DB row, filesystem path mapping, process API |
| Repository/Adapter | Triển khai port bằng SQLite, filesystem, process, Git/GH | Quyết định HTTP status hoặc import Controller |
| Bootstrap/Container | Khởi tạo dependency và vòng đời tiến trình; gọi startup runner đúng thời điểm | Chứa nghiệp vụ của Project/Task/Git hoặc tự viết startup task logic |
| Startup | Điều phối application startup tasks sau khi dependency sẵn sàng; nhận task qua injection | Init DB, tạo Container, tạo Express app, listen/shutdown hoặc truy cập Repository/Infrastructure singleton trực tiếp |

### 2.3 Dependency direction

```text
main.ts → bootstrap/server.ts → bootstrap/container.ts
                 │                    ├── tạo infrastructure adapters
                 │                    ├── inject application ports vào services
                 │                    ├── tạo controllers
                 │                    └── wire startup task dependencies
                 │
                 └── startup/startup.runner → startup tasks → application services

app.ts → api/routes → api/controllers → application/services → application/ports
                                                     │                ▲
                                                     ▼                │ implements
                                                   domain      infrastructure adapters

api/middleware + api/http → application/errors/contracts để tạo HTTP response
domain → không phụ thuộc layer khác
```

Quy tắc cụ thể:

1. Route chỉ import Controller type/instance và middleware/API helper; không import Application Service hoặc Repository.
2. Controller không import Repository hoặc concrete Infrastructure adapter.
3. Application Service chỉ phụ thuộc `domain` và `application/ports`.
4. Repository implementation không import `api`, `routes`, `controllers` hoặc Application Service.
5. Infrastructure không chứa business decision; chỉ thực thi port bằng SQLite, Node fs, child process, Git/GH.
6. `bootstrap/container.ts` là nơi duy nhất được phép import đồng thời Application và concrete Infrastructure để wiring.
7. Không sử dụng `registerRootProvider()` global; Application Service dùng `PathAccessPort`, còn `infrastructure/filesystem/project-path-access.adapter.ts` nhận root provider qua constructor.
8. `app.ts` nhận `ApiControllers`/dependencies cần thiết qua tham số; không import `Container` từ bootstrap.
9. `startup/` chỉ nhận Application Service/use case qua dependency injection; task không import singleton, Repository hoặc concrete Infrastructure. `startup.runner` chạy task tuần tự; lỗi của scope sweep phải được xử lý non-fatal như hiện tại.

### 2.4 Quy tắc Controller và DI

- Tạo một Controller theo domain/API surface: Project, Group, Scope, Session, Task, FS, Git, Pull Request, Search.
- Controller có thể là class với constructor injection vì mỗi Controller cần một hoặc nhiều Service/guard. Không tạo interface rỗng chỉ để tăng số file.
- Route dùng `createXRoutes(controller)` hoặc `registerXRoutes(router, controller)`; không tự khởi tạo singleton.
- Chuyển các service CRUD đang là object literal thành class/factory có dependency rõ ràng khi chúng có repository dependency. Ưu tiên `ProjectService`, `WorktreeService`, `SessionService`, `ScopeService`, `TaskService`, `WorkflowService`, `GroupService`.
- Repository có thể tiếp tục dùng object implementation ở giai đoạn đầu, miễn là được expose qua interface/port và được inject vào Service. Chỉ chuyển repository thành class nếu cần state, transaction context hoặc thay thế adapter.
- Không đưa toàn bộ `git`/`fs` helper vào Container nếu là hàm thuần, stateless. Inject `GitCommandPort`, `FileSystemPort` hoặc `ProcessRunnerPort` ở service có nhu cầu thay adapter.

### 2.5 Domain, API contract và Persistence

| Hiện tại | Đích | Lý do |
|---|---|---|
| `domain/mappers.ts` | `infrastructure/persistence/mappers/` | `Row` và `map*` là mapping giữa database row và model |
| `domain/api-types.ts` | `api/contracts/` | Các type `DirEntry`, `FileStat`, `TreeNode`, `GitStatusPayload` phục vụ contract/response |
| `AppError` trong `http/envelope.ts` | `application/errors/app.error.ts` | Service/Repository không phụ thuộc HTTP để ném lỗi |
| `newId()` trong `http/envelope.ts` | `utils/id.util.ts` hoặc `application/ports/id-generator.port.ts` | ID generator không phải trách nhiệm HTTP |
| `utils/guard.ts` và `http/guard.ts` | `api/http/params.ts` + `application/ports/path-access.port.ts` + `infrastructure/filesystem/project-path-access.adapter.ts` | Tách parsing, application error và filesystem path policy; Application không import API helper |
| `utils/http.ts` | xóa sau khi đổi importer | Hiện chỉ là re-export shim |

Không tạo rich Domain Model giả tạo. Chỉ thêm method/invariant vào entity khi có quy tắc nghiệp vụ thật; các shape thuần vẫn có thể là TypeScript interface.

### 2.6 Module cohesion theo mẫu Code

Giữ grouping theo domain đã có, không tách route/service thành file riêng cho từng endpoint:

| Domain | Application Service | Repository/Adapter chủ yếu |
|---|---|---|
| project | `project.service.ts`, `worktree.service.ts` | project/worktree/session/panel repositories |
| task | `task.service.ts`, `workflow.service.ts` | task/tag/checklist/attachment/dependency/workflow repositories |
| scope | `scope.service.ts` | scope/worktree repositories, default-branch Git port |
| fs | `fs-query`, `fs-write`, `image` | filesystem adapter |
| git | `services/git/*` | Git command adapter/process runner |
| pull-request | `pull-request.service.ts` | GitHub CLI adapter |
| search | `search.service.ts` | process runner (`rg`) |
| group | `group.service.ts` | group repository |

Không tạo `helpers/`, `managers/`, `handlers/` chung chung nếu chúng không có một ranh giới nghiệp vụ/technical cụ thể.

## 3. Ánh xạ file cũ → file mới

| Hiện tại | Đích | Hành động |
|---|---|---|
| `index.ts` | `main.ts` | Chuyển entry point; chỉ gọi `startServer()` sau khi giữ đúng thứ tự load config/environment |
| `scopeService.purgeAllDefaultBranches()` trong listen callback | `startup/tasks/purge-default-branch-scopes.task.ts` | Đưa startup workflow ra khỏi callback entry point; giữ trigger sau khi HTTP server đã listen và failure non-fatal |
| (chưa có) | `startup/startup.runner.ts` | Chạy tuần tự danh sách startup tasks do Container inject; không tự khởi tạo service hoặc adapter |
| (chưa có) | `app.ts` | Tạo `createApp(apiControllers)` để cấu hình Express pipeline, không listen/init DB |
| `routes/*.route.ts` | `api/routes/*.route.ts` | Chuyển route declarations vào API layer; chỉ gắn controller method |
| (chưa có) | `api/controllers/*.controller.ts` | Tạo 9 Controller theo HTTP/domain surface |
| `http/auth.ts` | `api/middleware/auth.middleware.ts` | Middleware xác thực token |
| `http/envelope.ts` + `utils/http.ts` shim | `api/http/envelope.ts` + `api/middleware/error-handler.middleware.ts` | Chuyển AppError ra Application; tách response formatter và Express error middleware; giữ legacy payload |
| `http/{envelope,params,sse}.ts` | `api/http/` | Di chuyển response/parameter/SSE helpers; giữ nguyên contract |
| `http/guard.ts` | `application/ports/path-access.port.ts` + `infrastructure/filesystem/project-path-access.adapter.ts` | Tách `safePath` thành policy adapter; `found`/validation dùng ApplicationError hoặc API param validation theo owner |
| `handle` trong `http/envelope.ts` | `api/middleware/async-handler.middleware.ts` | Tách async wrapper khỏi response envelope |
| (chưa có) | `bootstrap/container.ts` | Composition Root tạo repository/adapter → services → controllers |
| (chưa có) | `bootstrap/server.ts` | Init config/DB, create container/app, listen và shutdown |
| `services/{project,worktree,session,scope,task,workflow,group}.service.ts` | `application/services/<domain>/` | Chuyển singleton sang class/factory và inject ports khi có dependency |
| `repositories/*.repository.ts` | `infrastructure/persistence/repositories/` | Concrete SQLite adapters; giữ SQL/transaction semantics |
| `database/*` | `infrastructure/persistence/sqlite/` | Di chuyển connection/integrity, không đổi schema/transaction |
| `domain/mappers.ts` | `infrastructure/persistence/mappers/` | Chuyển DB row mapper khỏi Domain |
| `domain/api-types.ts` | `api/contracts/` | Chuyển transport DTO, giữ nguyên field names/optionality |
| `infra/process-runner.ts` | `infrastructure/process/` | Process adapter triển khai Application port |
| `infra/git-runner.ts` | `infrastructure/git/` | Git command adapter |
| `infra/gh-runner.ts` | `infrastructure/github/` | GitHub CLI adapter |
| `services/fs/*` | `application/services/fs/*` + `infrastructure/filesystem/*` | Tách use case/policy khỏi Node fs access |
| `utils/{http,guard}.ts` | xóa sau cùng | Chuyển từng trách nhiệm sang `api/http`, `application/errors` hoặc filesystem path-access adapter; xóa shim sau khi không còn importer |

## 4. Kế hoạch theo phase

> Giới hạn triển khai: mỗi task nên chạm tối đa 5 file ghi; nếu task cần nhiều hơn, chia thành các lô nhỏ có compile checkpoint. Không đổi API contract cùng lúc với việc di chuyển file.

### Phase 1 — Nền tảng Composition Root và HTTP boundary

**Mục tiêu:** có `createApp`, Container và contract controller; chưa thay business logic.

1. **1.1 — Tách app factory**
   - File: `main.ts` (rename), `app.ts` (new), `api/routes/routes.ts`.
   - Tạo `createApp(apiControllers)` để cấu hình CORS, JSON middleware, `/health`, routes, error handler. `main.ts` chỉ gọi `startServer()`.
   - DB init/listen/shutdown vẫn ở bootstrap, không nằm trong `createApp`.
   - Tiêu chí: middleware order, prefix, health payload và server lifecycle không đổi.
2. **1.2 — Tạo dependency contracts**
   - File: `api/controllers/controller-set.ts` (new), `bootstrap/container.ts` (new).
   - Khai báo `ApiControllers` theo 9 domain; Container trả các Controller được wire.
   - Không để `api/routes` import type `Container` từ `bootstrap`.
3. **1.3 — Tạo application error và tách middleware**
   - File: `application/errors/app.error.ts` (new), `api/http/envelope.ts`, `api/middleware/error-handler.middleware.ts`, `api/middleware/async-handler.middleware.ts`, `http/auth.ts` (source).
   - Chuyển `AppError` ra khỏi HTTP; `envelope` chỉ định dạng response; error middleware ánh xạ ApplicationError thành status/JSON; async wrapper có file riêng.
   - Chuyển `http/auth.ts` thành `api/middleware/auth.middleware.ts`; middleware import `fail` trực tiếp từ `api/http/envelope`.
4. **1.4 — Inject path access policy**
   - File: `application/ports/path-access.port.ts` (new), `infrastructure/filesystem/project-path-access.adapter.ts` (new), `http/guard.ts` (source), `bootstrap/container.ts`.
   - Chuyển `safePath` thành adapter triển khai `PathAccessPort`; truyền root provider vào constructor thay vì mutable global `registerRootProvider()`.
   - Application Service nhận `PathAccessPort`; API chỉ chuẩn hóa request input. Test có thể inject fake path policy.

### Phase 2 — Thêm Controller và làm mỏng Route

**Mục tiêu:** Route không gọi Service trực tiếp; giữ nguyên endpoint và response.

1. **2.1 — CRUD Controllers**: Project, Group, Scope, Session.
   - Tạo `project.controller.ts`, `group.controller.ts`, `scope.controller.ts`, `session.controller.ts`.
   - Route tương ứng nhận Controller từ `ApiControllers` và chỉ đăng ký method.
2. **2.2 — Task Controllers**: Task + Workflow.
   - Tạo/hoàn thiện `task.controller.ts`; giữ `/tasks/:id/workflow` đúng endpoint hiện tại.
   - Đưa param/body validation ra khỏi route; Service chỉ nhận input đã chuẩn hóa.
3. **2.3 — Filesystem Controller**
   - Tạo `fs.controller.ts`; chuyển safePath, query parsing, pagination/range parsing và JSON response khỏi `fs.route.ts`.
   - Không đổi quyền `trusted`, `allowSensitive`, `withinProject` hoặc behavior path guard trong task này.
4. **2.4 — Git Controller**
   - Tạo `git.controller.ts`; chuyển các helper `projectRoot`, `queryRoot`, `bodyRoot`, `scopeList`, `cloneRoots`, `fileList` và dispatch ra khỏi Route.
   - Không chia `git.route.ts` thành một route file cho từng endpoint; Git vẫn là một domain cohesion.
5. **2.5 — Pull Request và Search Controllers**
   - Tạo `pull-request.controller.ts`, `search.controller.ts`.
   - SSE lifecycle có thể dùng `api/http/sse.ts`; response/error semantics giữ nguyên.
6. **2.6 — Route composition**
   - Sửa `api/routes/routes.ts` và 9 route modules để nhận controller instances.
   - Tiêu chí: không còn import `services/` trong `api/routes/`; grep phải rỗng.

### Phase 3 — Container và constructor injection cho Application Service

**Mục tiêu:** loại bỏ dependency singleton ẩn trong service nghiệp vụ.

1. **3.1 — Repository ports**
   - Tạo interfaces cho Project, Worktree, Session, WorkspacePanel, Group, Scope, Task, TaskTag, TaskChecklist, TaskAttachment, TaskDependency, Workflow.
   - Đặt port ở `application/ports/repositories/`; không đặt interface theo implementation SQLite.
2. **3.2 — Service Project/Worktree**
   - Chuyển project/worktree service sang class; inject repository ports, branch detector, id generator và data-directory/file port cần thiết.
   - Bỏ import trực tiếp `getConfig`, `fs`, repositories singleton khỏi Application Service ở phần đã được thay bằng port.
3. **3.3 — Service Session/Scope**
   - Constructor injection cho session/scope repositories và Git default-branch port.
   - `scopeService.purgeAllDefaultBranches()` vẫn là use case của Application Service; không gọi singleton trực tiếp từ server bootstrap.
4. **3.4 — Service Task/Workflow/Group**
   - Inject các repository ports cần thiết; giữ transaction boundary hiện tại.
   - Không di chuyển transaction từ Repository sang Service nếu chưa xác định atomicity hiện tại.
5. **3.5 — Chuyển Service theo domain**
   - Move `services/fs`, `services/git`, `services/pull-request`, `services/search` vào `application/services/` theo nhóm domain; giữ shim tạm để chia nhỏ importer.
   - Chuyển `project/worktree`, `session`, `scope`, `task/workflow`, `group` vào các thư mục tương ứng trong `application/services/`.
   - Không chuyển process runner/Node fs adapter vào Application; chúng thuộc `infrastructure/`.
6. **3.6 — Container wiring**
   - Container tạo repository adapters → services → controllers theo dependency graph.
   - Không tạo container phụ theo từng request; một container cho vòng đời server.
   - Tiêu chí: Controller không import singleton service; Application Service không import `repositories/*.repository`.
7. **3.7 — Tách application startup tasks**
   - Tạo `startup/startup.runner.ts` và `startup/tasks/purge-default-branch-scopes.task.ts`.
   - Startup task nhận `ScopeService` (hoặc contract hẹp chỉ gồm `purgeAllDefaultBranches`) qua factory/constructor injection; không import singleton.
   - `bootstrap/container.ts` wire task và expose danh sách `startupTasks`; `bootstrap/server.ts` gọi runner trong callback `listen`, sau khi server đã bắt đầu nhận request.
   - Giữ behavior hiện tại: lỗi sweep chỉ ghi warning `[Code] scope startup sweep failed`, không làm server shutdown. Runner chạy tuần tự để giữ thứ tự nếu bổ sung task sau này.
   - Không chuyển DB init, Express setup, listen, signal handler hoặc shutdown vào `startup/`; các phần đó vẫn thuộc `bootstrap/server.ts`.

### Phase 4 — Dependency direction, Domain và Infrastructure

**Mục tiêu:** không còn Application/Persistence phụ thuộc HTTP; tách DB mapping và hệ thống ngoài.

1. **4.1 — Tách error và validation**
   - Chuyển `found`, `requireString` thành application validation/error helper không phụ thuộc Express.
   - `safePath` được gọi qua `PathAccessPort` từ Application Service; query parser chỉ nằm ở API boundary.
2. **4.2 — Tách DB mapping**
   - Di chuyển `domain/mappers.ts` sang `infrastructure/persistence/mappers/`.
   - Chuyển domain type thực sự sang file entity/types theo domain; không đổi JSON key.
3. **4.3 — Tách API contract**
   - Di chuyển `domain/api-types.ts` sang `api/contracts/` theo nhóm filesystem/git.
   - Không để UI/API contract được coi là domain entity; giữ exact field names và optionality.
4. **4.4 — Tách persistence adapter**
   - Di chuyển `database/` và `repositories/` sang `infrastructure/` theo mapping ở mục 3.
   - Repository chỉ throw application/persistence error; không import HTTP envelope.
5. **4.5 — Chuẩn hóa process/Git/GH ports**
   - `ProcessRunnerPort`, `GitCommandPort`, `GitHubCommandPort` được implement bởi adapter hiện tại.
   - `search`, `git`, `pull-request` nhận port; không import runner singleton trực tiếp ở nơi cần test/replace.
6. **4.6 — Filesystem boundary**
   - Tách Node `fs` access trong `services/fs/*` thành `infrastructure/filesystem` adapter theo nhóm read/write/image.
   - Service giữ use case và policy; không tạo adapter wrapper cho mỗi hàm nếu không có lợi ích thực tế.
7. **4.7 — Xóa legacy imports**
   - Đổi mọi importer `utils/http`/`utils/guard` sang module đúng trách nhiệm; xóa shim sau khi `grep` toàn source không còn tham chiếu.

### Phase 5 — Cohesion, dọn dẹp và kiểm chứng

1. **5.1 — Chuẩn hóa tên file/export**: ví dụ `git-status.service.ts` export `gitStatusService` hoặc `GitStatusService`; tránh tên export tổng quát `gitService` nếu file chỉ quản lý status.
2. **5.2 — Kiểm tra ranh giới Git**: chỉ tách service khi có trách nhiệm độc lập; `git-read.service.ts` và `git-history.service.ts` không giữ logic trùng nhau.
3. **5.3 — Xóa singleton wiring**: gỡ import object singleton ở controller/service đã chuyển sang DI; không xóa singleton của adapter chưa chuyển nếu còn nơi sử dụng.
4. **5.4 — Dọn code chết/import thừa**: xác minh importer trước khi xóa file hoặc helper.
5. **5.5 — Rà soát dependency graph và behavior**: compile, test, smoke API và Git/filesystem operations.

## 5. Checklist cho Executor

### Trước khi sửa

- [ ] Ghi lại route inventory: method, path, middleware, status code, response body.
- [ ] Ghi lại request inputs và các nhánh error của từng endpoint.
- [ ] Tạo baseline smoke cho `/health`, Project, Task/Workflow, FS, Git, Search và Pull Request.
- [ ] Xác minh toàn bộ importer ngoài ZIP trước khi xóa/rename bất kỳ file nào.

### Trong khi sửa

- [ ] Route chỉ đăng ký handler; không gọi Service/Repository.
- [ ] Controller không query DB, không chạy child process và không thao tác Node fs trực tiếp.
- [ ] Service không import Express/HTTP envelope.
- [ ] Service nhận dependency qua constructor/factory; không tự import singleton Repository.
- [ ] Repository không import `api/http`, `routes`, `controllers` hoặc Service.
- [ ] Domain không import database, Node fs, Express hoặc runner.
- [ ] Container là nơi duy nhất wiring implementation cụ thể.
- [ ] Không biến mọi helper thành class hoặc tạo interface không có khả năng thay thế thực tế.
- [ ] Giữ nguyên endpoint, JSON envelope, status code, query/body, transaction và path security.
- [ ] Không thêm comment mới nếu code tự giải thích được; không format lại vùng không liên quan.

### Kiểm tra sau mỗi phase

```bash
# Route không được import services/repositories
rg "from ['\"].*(services|repositories)/" src/routes src/api/routes

# HTTP không được phụ thuộc services/repositories
rg "from ['\"].*(services|repositories)/" src/api

# Application service không được phụ thuộc HTTP/Express/DB adapter cụ thể
rg "express|Request|Response|api/|infrastructure/|repositories/|database/" src/application

# Không còn mapper DB trong domain hoặc AppError HTTP trong repository
rg "map(Project|Worktree|Task)|interface Row|express|api/http/envelope|utils/http" src/domain src/infrastructure

# Tìm singleton import còn sót trong controller/service đã chuyển DI
rg "import \{ .*Service|import \{ .*Repository" src/api/controllers src/services
```

> Các lệnh trên là rule kiểm tra kiến trúc; cần điều chỉnh path nếu phase di chuyển thư mục chưa hoàn tất.

## 6. Giả định / Cần xác minh trước khi triển khai

1. ZIP không có `package.json`, `tsconfig`, test config và toàn bộ file cấu hình project; không xác định được chính xác build/test command.
2. `code.zip` có thể là snapshot đã qua một lần restructure; cần so với branch hiện tại trước khi áp dụng move/rename.
3. `projectService.saveAll()` có behavior xóa project không nằm trong payload; kế hoạch này không thay đổi semantics. Việc sửa hành vi phải là ticket riêng có xác nhận.
4. `trusted` trong `/fs/read-file` tác động `withinProject` và `allowSensitive`; không thay đổi quyền này trong phase Controller. Phải có quyết định bảo mật riêng trước khi đổi.
5. `scopeService.purgeAllDefaultBranches()` hiện chạy trong callback sau khi HTTP server đã listen. Startup task mới phải giữ đúng trigger này; không chuyển sang chạy trước `listen()` hoặc chặn server startup. Lỗi sweep vẫn non-fatal và chỉ ghi warning.
6. `gitExportService` đang dùng `spawn('git')` và `spawn('tar')` trực tiếp thay vì runner chung; cần giữ stream/pipe semantics khi chuyển ProcessRunnerPort.
7. Các `Repository` hiện dùng `getDb()` global. Phase đầu chỉ đảo dependency ở Application Service; inject DB connection vào từng Repository là bước sau, chỉ làm khi testability/transaction context đòi hỏi.
8. Không tạo hoặc đổi endpoint trong kế hoạch này. Nếu Controller reveal một contract/API bug, ghi issue riêng, không âm thầm đổi response.

## 7. Definition of Done

- [ ] Có Controller giữa Route và Service cho toàn bộ 9 route domain.
- [ ] Route không import Service/Repository.
- [ ] Có `createApp()` độc lập với DB init và `listen()`.
- [ ] Có Container làm composition root; constructor injection áp dụng cho dependency có ý nghĩa.
- [ ] Có `startup/` riêng cho application startup tasks; startup task không import singleton và được wire/invoke qua Container + bootstrap.
- [ ] Application Service phụ thuộc port, không phụ thuộc repository implementation.
- [ ] Application/Domain không import Express, HTTP envelope hoặc Node persistence.
- [ ] DB mapper không nằm trong Domain; API DTO không nằm trong Domain.
- [ ] Infrastructure có ranh giới rõ cho persistence, filesystem, process, Git/GH.
- [ ] Module cohesion theo domain được giữ; không sinh thêm tầng/thư mục không cần thiết.
- [ ] Build/test/smoke xác nhận API và hành vi cũ không đổi.
