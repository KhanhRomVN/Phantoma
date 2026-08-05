# Clean Architecture — Frontend (React/Electron)

Template Clean Architecture cho frontend. Giả định: backend là project riêng biệt, frontend giao tiếp qua API (HTTP/REST hoặc IPC). Mỗi module = 1 route duy nhất, navigation nội bộ là state (tab switching). Không có database, ORM, migrations.

---

## Cây Thư Mục Đầy Đủ

```
Module/
├── index.ts                          # Public API — export use cases + types
│
├── domain/                           # Lớp trong cùng — Business Rules (thuần TS, không React)
│   ├── entities/                     # Core business objects
│   │   ├── User.ts
│   │   ├── Order.ts
│   │   └── Product.ts
│   ├── value-objects/                # Immutable, self-validating
│   │   ├── Email.ts
│   │   ├── Money.ts
│   │   ├── OrderStatus.ts
│   │   └── Pagination.ts
│   ├── repositories/                 # Interfaces — contract cho data access (gọi API, không gọi DB)
│   │   ├── IUserRepository.ts
│   │   ├── IOrderRepository.ts
│   │   └── IProductRepository.ts
│   ├── services/                     # Domain services — logic跨越 multiple entities
│   │   ├── PricingService.ts
│   │   └── DiscountCalculator.ts
│   ├── events/                       # Domain events (phía frontend)
│   │   ├── OrderPlacedEvent.ts
│   │   └── UserLoggedInEvent.ts
│   ├── exceptions/                   # Domain-specific errors
│   │   ├── InvalidOrderError.ts
│   │   └── UnauthorizedError.ts
│   └── specifications/              # Business rule predicates
│       ├── FreeShippingSpecification.ts
│       └── PremiumUserSpecification.ts
│
├── application/                      # Lớp Use Cases — Application Business Rules
│   ├── use-cases/                    # Mỗi file = 1 use case (orchestration)
│   │   ├── user/
│   │   │   ├── RegisterUserUseCase.ts
│   │   │   ├── AuthenticateUserUseCase.ts
│   │   │   └── UpdateProfileUseCase.ts
│   │   ├── order/
│   │   │   ├── PlaceOrderUseCase.ts
│   │   │   ├── CancelOrderUseCase.ts
│   │   │   └── GetOrderHistoryUseCase.ts
│   │   └── product/
│   │       ├── SearchProductsUseCase.ts
│   │       └── GetProductDetailUseCase.ts
│   ├── dtos/                         # Data Transfer Objects — input/output của use case
│   │   ├── user/
│   │   │   ├── RegisterUserInput.ts
│   │   │   ├── RegisterUserOutput.ts
│   │   │   └── AuthenticateUserInput.ts
│   │   ├── order/
│   │   │   ├── PlaceOrderInput.ts
│   │   │   └── OrderSummaryOutput.ts
│   │   └── product/
│   │       ├── ProductSearchCriteria.ts
│   │       └── ProductDetailOutput.ts
│   ├── ports/                        # Interfaces cho infrastructure (cổng giao tiếp)
│   │   ├── ILogger.ts               # Cổng logging
│   │   ├── IEventBus.ts             # Cổng event bus (custom event, postMessage...)
│   │   ├── IHttpClient.ts           # Cổng HTTP client (axios, fetch...)
│   │   ├── IStorageService.ts       # Cổng localStorage / sessionStorage
│   │   ├── IAnalyticsService.ts     # Cổng analytics (Google Analytics, Sentry...)
│   │   └── INotificationService.ts  # Cổng toast/notification
│   ├── validators/                   # Input validation (Zod, yup...)
│   │   ├── RegisterUserValidator.ts
│   │   └── PlaceOrderValidator.ts
│   └── assemblers/                   # Map DTO ↔ Entity
│       ├── UserAssembler.ts
│       └── OrderAssembler.ts
│
├── infrastructure/                   # Lớp Adapters — triển khai interfaces
│   ├── api/                          # API clients (gọi backend)
│   │   ├── HttpClient.ts            # Triển khai IHttpClient (axios wrapper)
│   │   ├── UserApi.ts               # Gọi API /users/*
│   │   ├── OrderApi.ts              # Gọi API /orders/*
│   │   └── ProductApi.ts            # Gọi API /products/*
│   ├── repositories/                 # Triển khai I*Repository (gọi API, trả về Entity)
│   │   ├── ApiUserRepository.ts
│   │   ├── ApiOrderRepository.ts
│   │   └── ApiProductRepository.ts
│   ├── storage/                      # Browser storage implementations
│   │   ├── LocalStorageService.ts   # Triển khai IStorageService
│   │   └── SessionStorageService.ts
│   ├── event-bus/                    # Event bus implementations
│   │   ├── WindowEventBus.ts        # Triển khai IEventBus qua CustomEvent
│   │   └── ObserverEventBus.ts      # Triển khai IEventBus qua Observer pattern
│   ├── logging/                      # Logger implementations
│   │   ├── ConsoleLogger.ts
│   │   └── SentryLogger.ts
│   ├── analytics/                    # Analytics implementations
│   │   └── GoogleAnalyticsService.ts
│   ├── notification/                 # Notification implementations
│   │   └── ToastNotificationService.ts
│   ├── mappers/                      # Entity ↔ API Response (JSON → Entity)
│   │   ├── UserMapper.ts
│   │   ├── OrderMapper.ts
│   │   └── ProductMapper.ts
│   ├── config/                       # Cấu hình environment
│   │   ├── api.config.ts            # Base URL, timeout...
│   │   └── app.config.ts
│   └── di/                           # Dependency Injection container
│       ├── container.ts             # Tsyringe/Inversify setup
│       └── modules.ts               # DI module registrations
│
├── presentation/                     # Lớp ngoài cùng — React UI
│   ├── ModuleName.tsx               # Container chính — entry point của route
│   │                                  #   Chứa layout, tab bar, state chọn tab
│   │                                  #   Không chứa business logic (chỉ orchestrate)
│   │
│   ├── components/                   # Tổ chức theo tool/tab — mỗi thư mục = 1 tab
│   │   │
│   │   ├── shared/                   # UI components dùng chung giữa các tab
│   │   │   ├── HexViewer.tsx
│   │   │   ├── HighlightText.tsx
│   │   │   ├── MethodBadge.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── TrafficTable/            # Tab: HTTP Traffic
│   │   │   ├── index.tsx            # Container của tab — orchestrate sub-components
│   │   │   ├── RequestTable.tsx
│   │   │   ├── RequestDetails.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── BodyTab.tsx
│   │   │   ├── CookieTab.tsx
│   │   │   ├── HeadersTab.tsx
│   │   │   └── InitiatorTab.tsx
│   │   │
│   │   ├── Repeater/                # Tab: Repeater (phức tạp → có hooks/types/utils riêng)
│   │   │   ├── index.tsx            # Container của tab
│   │   │   ├── RequestList.tsx
│   │   │   ├── hooks/               # Hooks riêng của tab này
│   │   │   │   ├── useRepeaterPersistence.ts
│   │   │   │   └── useRepeaterHistory.ts
│   │   │   ├── types.ts             # Types riêng của tab này
│   │   │   ├── utils.ts             # Utils riêng của tab này
│   │   │   └── WorkspacePanel/
│   │   │       ├── RequestPanel/
│   │   │       │   ├── index.tsx
│   │   │       │   ├── RequestBar.tsx
│   │   │       │   ├── types.ts
│   │   │       │   ├── modal/
│   │   │       │   │   ├── PayloadValueModal.tsx
│   │   │       │   │   └── RunModal.tsx
│   │   │       │   ├── TabContent/
│   │   │       │   │   ├── BodyTab.tsx
│   │   │       │   │   ├── HeaderTab.tsx
│   │   │       │   │   ├── HistoryTab.tsx
│   │   │       │   │   ├── ParamTab.tsx
│   │   │       │   │   └── PayloadTab.tsx
│   │   │       │   └── ui/
│   │   │       └── ResponsePanel/
│   │   │           ├── index.tsx
│   │   │           └── modal/
│   │   │               └── PayloadResultModal.tsx
│   │   │
│   │   ├── Intruder/                # Tab: Intruder
│   │   │   └── index.tsx
│   │   │
│   │   ├── LogViewer/               # Tab: Log
│   │   │   └── index.tsx
│   │   │
│   │   ├── Resources/               # Tab: Resources
│   │   │   ├── index.tsx
│   │   │   ├── ResourceList.tsx
│   │   │   ├── ResourcePreview.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── SourceViewer/            # Tab: Source
│   │   │   ├── index.tsx
│   │   │   └── SourceTreeView.tsx
│   │   │
│   │   ├── DevicePanel/             # Tab: Device
│   │   │   └── index.tsx
│   │   │
│   │   ├── Compare/                 # Tab: Compare
│   │   │   └── index.tsx
│   │   │
│   │   └── TargetSidebar/           # Persistent sidebar — không phải tab, luôn hiển thị
│   │       ├── index.tsx
│   │       ├── TargetList.tsx
│   │       ├── RunningOptionTargetModal.tsx
│   │       ├── useTargetSidebar.ts
│   │       ├── utils.tsx
│   │       └── AddTargetModal/
│   │           ├── index.ts
│   │           ├── WebModal.tsx
│   │           ├── PcModal.tsx
│   │           ├── AndroidModal.tsx
│   │           ├── CliModal.tsx
│   │           └── types.ts
│   │
│   ├── hooks/                       # Module-level hooks — dùng chung giữa các tab
│   │   ├── useNetworkEvents.ts
│   │   ├── usePaginatedRequests.ts
│   │   ├── useRequestFilter.ts
│   │   ├── useTargetManagement.ts
│   │   ├── useLocalStorage.ts
│   │   ├── usePayloadStorage.ts
│   │   └── index.ts
│   │
│   ├── stores/                      # Module-level state (Zustand)
│   │   ├── network.store.ts
│   │   └── timer.store.ts
│   │
│   └── view-models/                 # Data shaping — transform Entity → UI format
│       ├── TrafficViewModel.ts
│       └── RepeaterViewModel.ts
│
├── shared/                           # Code dùng chung xuyên suốt các layer
│   ├── types/
│   │   ├── result.ts                # Result<T, E> pattern
│   │   ├── pagination.ts
│   │   └── common.types.ts
│   ├── utils/
│   │   ├── date.utils.ts
│   │   ├── string.utils.ts
│   │   ├── validation.utils.ts
│   │   └── cn.ts                    # className helper (clsx + tailwind-merge)
│   ├── constants/
│   │   ├── error-codes.ts
│   │   └── app-constants.ts
│   └── lib/                          # Third-party wrapper/adapters
│       └── query-client.ts          # TanStack Query client config
│
└── __tests__/                        # Tests — mirror cấu trúc source
    ├── domain/
    │   ├── entities/
    │   │   └── Order.test.ts
    │   └── services/
    │       └── PricingService.test.ts
    ├── application/
    │   └── use-cases/
    │       └── PlaceOrderUseCase.test.ts
    ├── infrastructure/
    │   └── repositories/
    │       └── ApiOrderRepository.test.ts
    └── presentation/
        ├── hooks/
        │   └── useRequestFilter.test.ts
        └── components/
            └── TrafficTable/
                └── FilterBar.test.tsx
```

---

## Quy Tắc Dependency

```
  presentation  ←──  infrastructure
       ↓                    ↓
  application  ←────────────┘
       ↓
    domain
```

- **Domain** — thuần TypeScript. Không import React, không import API client. Không biết gì về HTTP, localStorage, browser.
- **Application** — chỉ import từ `domain/`. Use case orchestrate entity + repository interface. Không biết UI hay API implementation.
- **Infrastructure** — import từ `domain/` (entities, repository interfaces) + `application/ports/`. Triển khai repository bằng cách gọi HTTP API, triển khai storage bằng localStorage.
- **Presentation** — import từ `application/use-cases/` + `application/dtos/`. Hook gọi use case, component render view model. Container component (`ModuleName.tsx`) chỉ orchestrate layout + tab state, không chứa business logic. Không import trực tiếp từ `infrastructure/` (mọi thứ qua DI).
- **Shared** — được import từ mọi layer (chỉ utility thuần).

---

## Luồng Dữ Liệu Qua Các Layer

```
User chọn tab "TrafficTable" → click 1 request → click "Send to Repeater"
        │
        ▼
presentation/components/TrafficTable/index.tsx
        │  onClick → gọi handleSendToRepeater(request)
        ▼
presentation/ModuleName.tsx  (container — quản lý state tab hiện tại)
        │  setSelectedTool('repeater')
        │  addToRepeater(request.id)
        ▼
presentation/components/Repeater/index.tsx
        │  useRepeaterPersistence() → lưu ID xuống localStorage
        │  useNetworkStore() → lấy request data từ store
        │  hiển thị RequestPanel
        ▼
(người dùng chỉnh sửa request → nhấn "Send")
        │
        ▼
presentation/components/Repeater/hooks/useRepeaterPersistence.ts
        │  gọi SendRepeaterRequestUseCase.execute(input)
        ▼
application/use-cases/repeater/SendRepeaterRequestUseCase.ts
        │  1. Validate input
        │  2. Gọi IRepeaterRepository.send(request)
        │  3. Trả về response
        ▼
infrastructure/repositories/ApiRepeaterRepository.ts
        │  POST /api/repeater/send  (qua IHttpClient)
        │  Map JSON response → entity
        ▼
     Backend API
```

---

## Tổ Chức Components Theo Tool/Tab

Đây là pattern quan trọng nhất trong `presentation/`. Mỗi thư mục con của `components/` đại diện cho 1 tool/tab trong module.

```
presentation/components/
├── shared/                  ← Components dùng chung giữa các tab (MethodBadge, StatusBadge...)
├── TrafficTable/            ← Tab 1
├── Repeater/                ← Tab 2
├── Intruder/                ← Tab 3
├── LogViewer/               ← Tab 4
├── Resources/               ← Tab 5
├── SourceViewer/            ← Tab 6
├── DevicePanel/             ← Tab 7
├── Compare/                 ← Tab 8
└── TargetSidebar/           ← Persistent UI (không phải tab, luôn hiển thị)
```

**Quy tắc:**
- Tab đơn giản (1-2 components) → 1 file `index.tsx` là đủ.
- Tab phức tạp (nhiều sub-panel, modal, tab con) → có thêm `hooks/`, `types.ts`, `utils.ts` riêng bên trong thư mục tab đó.
- Tab quá phức tạp (Repeater) → chia tiếp thành `WorkspacePanel/`, `RequestPanel/`, `ResponsePanel/`.
- Container component chính (`ModuleName.tsx`) chỉ làm nhiệm vụ: render layout, tab bar, chọn tab hiện tại qua state — không chứa logic nghiệp vụ.

---

## Quy Ước Đặt Tên File

| Layer | Pattern | Ví dụ |
|-------|---------|-------|
| Entity | `{Tên}.ts` | `Order.ts`, `User.ts` |
| Value Object | `{Tên}.ts` | `Email.ts`, `Money.ts` |
| Repository Interface | `I{Tên}Repository.ts` | `IOrderRepository.ts` |
| Domain Service | `{Tên}Service.ts` hoặc `{ĐộngTừ}{DanhTừ}.ts` | `PricingService.ts`, `DiscountCalculator.ts` |
| Domain Event | `{Tên}Event.ts` | `OrderPlacedEvent.ts` |
| Domain Exception | `{Tên}Error.ts` | `InvalidOrderError.ts` |
| Specification | `{Tên}Specification.ts` | `FreeShippingSpecification.ts` |
| Use Case | `{ĐộngTừ}{DanhTừ}UseCase.ts` | `PlaceOrderUseCase.ts` |
| DTO | `{UseCase}Input.ts` / `{UseCase}Output.ts` | `PlaceOrderInput.ts` |
| Port | `I{Tên}.ts` | `IHttpClient.ts`, `ILogger.ts` |
| API Client | `{Tên}Api.ts` | `OrderApi.ts` |
| Repository Impl | `Api{Tên}Repository.ts` | `ApiOrderRepository.ts` |
| Mapper | `{Tên}Mapper.ts` | `OrderMapper.ts` |
| Config | `{tên}.config.ts` | `api.config.ts` |
| DI Container | `container.ts` | |
| Container Component | `{ModuleName}.tsx` (PascalCase) | `Emulate.tsx`, `Dashboard.tsx` |
| Tab Container | `index.tsx` trong thư mục tab | `TrafficTable/index.tsx` |
| UI Component | `{Tên}.tsx` | `RequestTable.tsx`, `FilterBar.tsx` |
| Hook | `use{Tên}.ts` | `useRequestFilter.ts` |
| Store | `{tên}.store.ts` | `network.store.ts` |
| View Model | `{Tên}ViewModel.ts` | `TrafficViewModel.ts` |
| Test | `{Tên}.test.ts` | `Order.test.ts` |

---

## Frontend Khác Backend Ở Đâu?

| Khía cạnh | Backend | Frontend |
|-----------|---------|----------|
| Repository implementation | Gọi database (SQL/NoSQL) | Gọi HTTP API |
| Persistence | ORM models, migrations, seeds | localStorage, IndexedDB (cache) |
| Controllers | HTTP controllers (Express/Fastify) | Không có — thay bằng hooks + event handlers |
| Routing | Server-side route definitions | Mỗi module = 1 route, tab切换 = state |
| Use case output | Trả về HTTP response | Cập nhật store → re-render UI |
| Authentication | JWT verify, session | Lưu token, gắn header |
| Logging | File/SaaS (Winston, Pino) | Console, gửi lên Sentry/LogRocket |
| DI Container | Application-scoped (singleton) | Module-scoped |

---

## Ví Dụ Tối Giản (Frontend Module Nhỏ)

Module có 2 tab + 1 sidebar, ít business logic:

```
MyModule/
├── index.ts
├── domain/
│   ├── entities/
│   │   └── Item.ts
│   └── repositories/
│       └── IItemRepository.ts
├── application/
│   ├── use-cases/
│   │   ├── ListItemsUseCase.ts
│   │   └── DeleteItemUseCase.ts
│   ├── dtos/
│   │   └── ListItemsInput.ts
│   └── ports/
│       └── IHttpClient.ts
├── infrastructure/
│   ├── api/
│   │   └── ItemApi.ts
│   ├── repositories/
│   │   └── ApiItemRepository.ts
│   └── mappers/
│       └── ItemMapper.ts
├── presentation/
│   ├── MyModule.tsx                 # Container — layout + tab state
│   ├── components/
│   │   ├── shared/
│   │   │   └── StatusBadge.tsx
│   │   ├── ItemList/                # Tab 1
│   │   │   ├── index.tsx
│   │   │   └── ItemRow.tsx
│   │   ├── ItemDetail/              # Tab 2
│   │   │   └── index.tsx
│   │   └── Sidebar/
│   │       └── index.tsx
│   ├── hooks/
│   │   └── useItemList.ts
│   └── stores/
│       └── item.store.ts
└── shared/
    └── utils/
        └── cn.ts
```

**~22 file** — vẫn giữ dependency rule, container component mỏng, components tổ chức theo tab.