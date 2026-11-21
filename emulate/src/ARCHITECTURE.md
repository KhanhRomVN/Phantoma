# Phantoma Emulate Service — Architecture

Express + TypeScript service that combines **traffic interception** (MITM proxy, CDP, eBPF, Android) with the
**Emulate API** (targets, filters, fuzzers, reports).

## 1. Layers and dependency rule

```
 main.ts ─▶ bootstrap/ ─▶ app.ts ─▶ api/ ─▶ services/ ─▶ repositories/ ─▶ database/
                                      │          │            │              storage/
                                      │          └────────────┴──────▶ domain/ · types/ · constants/ · config/ · utils/ · errors/
```

| Layer | Responsibility | May import from |
|---|---|---|
| `main.ts`, `bootstrap/` | Process entry, startup sequence, dependency wiring (composition root) | everything |
| `app.ts` | Builds the Express app (middleware → routes → error handler). No side effects, test-friendly | `api`, `constants`, `bootstrap/container` (type only) |
| `api/routes` | URL → controller wiring only. No logic | `api/controllers`, `bootstrap/container` (type only) |
| `api/controllers` | HTTP concerns: read request, validate, call a service, shape the response | `services`, `domain`, `types`, `utils`, `errors` |
| `api/middleware` | Cross-cutting Express middleware (error handler, async wrapper) | `errors`, `utils` |
| `services/*` | Business logic and integrations (proxy, CDP, eBPF, Android…). Grouped by capability | `repositories`, `domain`, `types`, `config`, `constants`, `errors`, `utils` |
| `repositories` | SQLite access via Kysely (one repository per table/aggregate) | `database`, `domain`, `storage`, `utils` |
| `storage` | File-based persistence under `~/.phantoma` (reports, fuzzer JSON files) | `config`, `domain` |
| `database` | Connection, schema types, migrations | `utils`, `config` |
| `domain` | Pure entity + input types. **No imports from other layers** | — |
| `types` | Shared cross-layer types (API envelope, proxy, CDP, mobile…) | — |
| `constants` | Static values and catalogues | `types` |
| `config` | Environment variables and on-disk paths | — |
| `utils`, `errors` | Stateless helpers, `AppError` | `types` (utils only) |
| `startup` | Interactive welcome screen + startup preferences (runs before the DB exists) | `config`, `types`, `utils` |

Rule of thumb: **arrows only point right/down.** A repository never imports a service; a service never imports a controller.

## 2. Folder structure

```
├── api
│   ├── controllers
│   │   ├── capture-method.controller.ts
│   │   ├── cdp.controller.ts
│   │   ├── ebpf.controller.ts
│   │   ├── mobile.controller.ts
│   │   ├── proxy.controller.ts
│   │   ├── fuzzer.controller.ts
│   │   ├── report.controller.ts
│   │   ├── runtime-events.controller.ts
│   │   ├── runtime-process.controller.ts
│   │   ├── target-filter.controller.ts
│   │   └── target.controller.ts
│   ├── middleware
│   │   ├── async-handler.middleware.ts
│   │   └── error-handler.middleware.ts
│   └── routes
│       ├── runtime
│       │   ├── cdp.routes.ts
│       │   ├── ebpf.routes.ts
│       │   ├── index.ts
│       │   ├── mobile.routes.ts
│       │   └── runtime-process.routes.ts
│       ├── capture-method.routes.ts
│       ├── health.routes.ts
│       ├── index.ts
│       ├── proxy.routes.ts
│       ├── fuzzer.routes.ts
│       ├── report.routes.ts
│       ├── target-filter.routes.ts
│       └── target.routes.ts
├── bootstrap
│   ├── container.ts
│   ├── proxy-event-bridge.ts
│   └── server.ts
├── config
│   ├── env.config.ts
│   ├── index.ts
│   └── paths.config.ts
├── constants
│   ├── capture-methods.constant.ts
│   ├── chrome-launcher.constant.ts
│   ├── http.constant.ts
│   ├── index.ts
│   ├── proxy-injection.constant.ts
│   └── proxy.constant.ts
├── database
│   ├── migrations
│   │   ├── 0001_initial_schema.sql
│   ├── 0002_rename_targets.sql
│   └── 0003_drop_repeater_tables.sql
│   ├── database.schema.ts
│   ├── migration.runner.ts
│   └── sqlite.connection.ts
├── domain
│   ├── fuzzer
│   │   └── fuzzer.types.ts
│   ├── index.ts
│   ├── report.entity.ts
│   ├── report.input.ts
│   ├── target-filter.entity.ts
│   ├── target-filter.input.ts
│   ├── target.entity.ts
│   └── target.input.ts
├── errors
│   └── app.error.ts
├── repositories
│   ├── report.repository.ts
│   ├── target-filter.repository.ts
│   └── target.repository.ts
├── services
│   ├── browser
│   │   ├── browser-control.service.ts
│   │   ├── cdp.service.ts
│   │   └── chrome-launcher.service.ts
│   ├── cli
│   │   ├── ebpf-capture.service.ts
│   │   ├── ebpf-sniffer.service.ts
│   │   ├── terminal-launcher.service.ts
│   │   └── tls-target-resolver.service.ts
│   ├── emulate
│   │   ├── fuzzer.service.ts
│   │   ├── report.service.ts
│   │   ├── target-filter.service.ts
│   │   └── target.service.ts
│   ├── mobile
│   │   ├── arm-translation.service.ts
│   │   ├── cert-install.service.ts
│   │   ├── device-provision.service.ts
│   │   ├── frida.service.ts
│   │   ├── logcat.service.ts
│   │   ├── mobile-device.service.ts
│   │   ├── ssl-bypass.service.ts
│   │   └── transparent-proxy.service.ts
│   ├── proxy
│   │   ├── cache
│   │   │   ├── header.cache.ts
│   │   │   └── media.cache.ts
│   │   ├── proxy-manager.service.ts
│   │   └── proxy-server.service.ts
│   ├── realtime
│   │   └── wss-hub.service.ts
│   └── runtime
│       ├── capture-method.service.ts
│       └── process-manager.service.ts
├── startup
│   ├── preferences.store.ts
│   └── welcome.screen.ts
├── storage
│   ├── fuzzer-file.storage.ts
│   └── report-file.storage.ts
├── types
│   ├── api.type.ts
│   ├── browser.type.ts
│   ├── capture-method.type.ts
│   ├── cdp.type.ts
│   ├── ebpf.type.ts
│   ├── index.ts
│   ├── mobile.type.ts
│   ├── platform.type.ts
│   ├── proxy.type.ts
│   ├── realtime.type.ts
│   └── startup.type.ts
├── utils
│   ├── async.util.ts
│   ├── error.util.ts
│   ├── http-response.util.ts
│   ├── id.util.ts
│   ├── logger.util.ts
│   └── network.util.ts
├── app.ts
└── main.ts
```

## 3. Naming conventions

* **Files and folders:** `kebab-case`. Every file ends with a suffix that states its role: `<name>.<role>.ts`.
* **Classes / types / interfaces:** `PascalCase`. **Functions / variables:** `camelCase`. **Constants:** `UPPER_SNAKE_CASE`.
* **Singletons** exported from a service file are `camelCase` instances of the class (`cdpService`, `processManager`).

| Suffix | Meaning | Example |
|---|---|---|
| `.routes.ts` | Express router factory (`createXRoutes`) | `target.routes.ts` |
| `.controller.ts` | HTTP handlers | `target.controller.ts` |
| `.middleware.ts` | Express middleware | `error-handler.middleware.ts` |
| `.service.ts` | Business logic / integration | `chrome-launcher.service.ts` |
| `.repository.ts` | SQLite persistence | `target.repository.ts` |
| `.storage.ts` | File-system persistence | `report-file.storage.ts` |
| `.entity.ts` / `.input.ts` | Domain entity / create-update payload | `target.entity.ts`, `target.input.ts` |
| `.type.ts` | Shared types | `proxy.type.ts` |
| `.constant.ts` | Static values | `http.constant.ts` |
| `.config.ts` | Configuration | `env.config.ts` |
| `.util.ts` | Stateless helper | `network.util.ts` |
| `.cache.ts` | In-memory/disk cache | `media.cache.ts` |
| `.error.ts` | Error class | `app.error.ts` |
| `.schema.ts` / `.connection.ts` / `.runner.ts` | Database internals | `database.schema.ts` |

Folders that expose a public surface have an `index.ts` barrel: `config`, `constants`, `domain`, `types`.

## 4. Request flow

```
HTTP ─▶ api/routes/*.routes.ts ─▶ api/controllers/*.controller.ts ─▶ services/** ─▶ repositories / storage ─▶ SQLite / disk
                                          │
                                          └─ errors → AppError → api/middleware/error-handler.middleware.ts → { success:false, error }
```

CRUD controllers wrap handlers with `asyncHandler`, so a thrown `AppError` (or any rejected promise) reaches the
error-handler middleware without per-handler `try/catch`.

### HTTP surface

| Mount | Purpose |
|---|---|
| `GET /health` | Liveness probe |
| `/sessions`, `/breakpoints`, `/requests/:id/{forward,drop}` | MITM proxy control (root level, legacy `{success}/{error}` shapes) |
| `/api/v1/targets/**` | Target, filter (`/:targetId/filter`), reports, fuzzers (`/:targetId/fuzzers/**`) |
| `/api/v1/capture-methods/:platform` | Capture-method catalogue |
| `/api/v1/runtime/**` | Launch/terminate, CDP, browser tools, eBPF, CLI capture, mobile |
| `/api/v1/events` | SSE stream of CDP events |
| `ws://…/ws/events` | WebSocket hub (proxy + eBPF + logcat events) |

## 5. Startup sequence (`bootstrap/server.ts`)

1. Welcome UI → host/port (skipped when stdin is not a TTY)
2. Open SQLite and run migrations
3. `createContainer()` → repositories → services
4. `bridgeProxyEventsToHub()` → proxy session events → WebSocket hub
5. `createApp(container)` → `http.createServer` → `wssHub.init(server)` → `listen`
6. `SIGINT`/`SIGTERM` → close hub and database

## 6. Where things live on disk (`config/paths.config.ts`)

```
~/.phantoma/
├── certs/                    MITM CA certificates
├── emulate/emulate.sql       SQLite database (override with EMULATE_DB_PATH)
├── emulate/{targetId}/…      Reports and fuzzers (fuzzers/{fuzzerId}/fuzzer.json + history/)
├── cdp-profiles/{targetId}/  Chrome profiles for CDP launches
├── interceptor-media/        Cached media from the proxy
└── preferences.json          Startup preferences
```

Environment variables: `EMULATE_PORT` (3002), `EMULATE_DB_PATH`, `ENV`, `LOG_LEVEL`.

## 7. Recipes

**Add a new CRUD resource (`foo`)**
1. `domain/foo.entity.ts` + `domain/foo.input.ts`, export from `domain/index.ts`
2. Table in `database/migrations/` and its type in `database/database.schema.ts`
3. `repositories/foo.repository.ts`
4. `services/emulate/foo.service.ts`
5. Register in `bootstrap/container.ts`
6. `api/controllers/foo.controller.ts` and `api/routes/foo.routes.ts`, mount in `api/routes/index.ts`

**Add a new capture method:** add an entry to `constants/capture-methods.constant.ts` and list its key in `PLATFORM_CAPTURE_METHODS`.

**Add an integration (e.g. a new device tool):** put the service in the matching `services/<capability>/` folder, expose it through a controller in `api/controllers/` and a router in `api/routes/runtime/`.

## 8. Build note

`database/migrations/*.sql` is read at runtime next to `migration.runner.js`. Make sure the build copies it to `dist/database/migrations/`.

## 9. Old → new file map

| Old | New |
|---|---|
| `database/connection.ts` | `database/sqlite.connection.ts` |
| `database/migrate.ts` | `database/migration.runner.ts` |
| `database/schema.ts` | `database/database.schema.ts` |
| `database/migrations/migratie.sql` | `database/migrations/0001_initial_schema.sql` |
| `repositories/filter.repository.ts` | `repositories/target-filter.repository.ts` |
| `repositories/report.repository.ts` | `repositories/report.repository.ts` *(unchanged)* |
| `repositories/target.repository.ts` | `repositories/target.repository.ts` *(unchanged)* |
| `repositories/repeater-file-storage.ts` | `storage/fuzzer-file.storage.ts` |
| `repositories/report-file-storage.ts` | `storage/report-file.storage.ts` |
| `services/target.service.ts` | `services/emulate/target.service.ts` |
| `services/filter.service.ts` | `services/emulate/target-filter.service.ts` |
| `services/report.service.ts` | `services/emulate/report.service.ts` |
| `services/repeater.service.ts` | `services/emulate/fuzzer.service.ts` |
| `services/proxy-manager.service.ts` | `services/proxy/proxy-manager.service.ts` |
| `services/proxy-server.service.ts` | `services/proxy/proxy-server.service.ts` |
| `services/cdp.service.ts` | `services/browser/cdp.service.ts` |
| `services/browser-control.service.ts` | `services/browser/browser-control.service.ts` |
| `services/arm-translation.service.ts` | `services/mobile/arm-translation.service.ts` |
| `services/cert-install.service.ts` | `services/mobile/cert-install.service.ts` |
| `services/device-provision.service.ts` | `services/mobile/device-provision.service.ts` |
| `services/frida.service.ts` | `services/mobile/frida.service.ts` |
| `services/logcat.service.ts` | `services/mobile/logcat.service.ts` |
| `services/mobile-device.service.ts` | `services/mobile/mobile-device.service.ts` |
| `services/ssl-bypass.service.ts` | `services/mobile/ssl-bypass.service.ts` |
| `services/transparent-proxy.service.ts` | `services/mobile/transparent-proxy.service.ts` |
| `services/cli-terminal-launcher.service.ts` | `services/cli/terminal-launcher.service.ts` |
| `services/cli-tls-target.service.ts` | `services/cli/tls-target-resolver.service.ts` |
| `services/ebpf-sniffer.service.ts` | `services/cli/ebpf-sniffer.service.ts` |
| `services/process-manager.service.ts` | `services/runtime/process-manager.service.ts` |
| `services/wss-hub.service.ts` | `services/realtime/wss-hub.service.ts` |
| `utils/header-cache.ts` | `services/proxy/cache/header.cache.ts` |
| `utils/media-cache.ts` | `services/proxy/cache/media.cache.ts` |
| `utils/injection.ts` | `constants/proxy-injection.constant.ts` |
| `utils/logger.ts` | `utils/logger.util.ts` |
| `utils/id.ts` | `utils/id.util.ts` |
| `utils/api-error.ts` | `errors/app.error.ts` |
| `utils/response.ts` | `utils/http-response.util.ts` |
| `utils/error-handler.ts` | `api/middleware/error-handler.middleware.ts` |
| `utils/preferences.ts` | `startup/preferences.store.ts` |
| `utils/welcome.ts` | `startup/welcome.screen.ts` |
| `index.ts` | `main.ts` (entry) + `app.ts` (Express factory) + `bootstrap/server.ts` (startup) + `bootstrap/container.ts` + `bootstrap/proxy-event-bridge.ts` + `api/routes/proxy.routes.ts` + `api/controllers/proxy.controller.ts` |
| `routes/routes.ts (732 lines)` | `api/routes/**` (wiring) + `api/controllers/**` (HTTP handlers) + `services/browser/chrome-launcher.service.ts` + `services/cli/ebpf-capture.service.ts` + `services/runtime/capture-method.service.ts` |
| `routes/{target,filter,report,fuzzer}.route.ts` | `api/routes/*.routes.ts` + `api/controllers/*.controller.ts` |
| `domain/emulate.ts` | `domain/*.entity.ts` + `domain/*.input.ts` (+ `domain/fuzzer/`) |
| `config/server.config.ts` | `config/env.config.ts` + `config/paths.config.ts` |
| `config/capture-methods.ts` | `constants/capture-methods.constant.ts` + `types/capture-method.type.ts` + `types/platform.type.ts` + `services/runtime/capture-method.service.ts` |
| `utils/paths.ts` | `config/paths.config.ts` |
| `services/sse-hub.service.ts` | *removed* — dead code (import was already commented out, replaced by the WebSocket hub) |
