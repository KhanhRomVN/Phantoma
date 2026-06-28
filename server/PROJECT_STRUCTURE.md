# Kiến trúc Backend Golang Chuẩn Chỉnh — Hướng dẫn cho Phantoma

Tài liệu này định nghĩa **cấu trúc dự án chuẩn** cho Phantoma server, áp dụng **Clean Architecture** kết hợp **Domain-Driven Design (DDD)** và **Feature-based organization**. Mục tiêu: scale lên hàng trăm tính năng mà không bị rối, dễ bảo trì, dễ test, và dễ onboard thành viên mới.

---

## 1. Nguyên tắc cốt lõi

| Nguyên tắc | Mô tả |
|------------|-------|
| **Loose Coupling** | Các layer chỉ giao tiếp qua interface, không phụ thuộc trực tiếp vào implementation |
| **Dependency Inversion** | Layer cao (domain) không phụ thuộc vào layer thấp (infrastructure) |
| **Feature-based Organization** | Code được nhóm theo **tính năng** (feature), không theo kiểu "MVC truyền thống" (controllers/, models/, services/) |
| **Separation of Concerns** | Handler → UseCase → Repository → Infrastructure, mỗi layer chỉ làm đúng 1 việc |
| **Explicit Dependencies** | Tất cả dependencies được inject qua constructor (không dùng global state) |

---

## 2. Cấu trúc thư mục chi tiết

```
server/
├── cmd/
│   └── api/
│       └── main.go                    # Entrypoint: DI container, server startup
│
├── internal/
│   ├── app/                           # Application core (business logic)
│   │   ├── domain/                    # Entity, Value Object, Domain errors
│   │   │   ├── target/
│   │   │   │   ├── entity.go
│   │   │   │   ├── value_objects.go
│   │   │   │   └── errors.go
│   │   │   ├── scan/
│   │   │   │   ├── entity.go
│   │   │   │   └── errors.go
│   │   │   └── user/                  # (ví dụ nếu có auth)
│   │   │       ├── entity.go
│   │   │       └── errors.go
│   │   │
│   │   ├── usecase/                   # UseCase / Service layer
│   │   │   ├── target/
│   │   │   │   ├── create.go
│   │   │   │   ├── list.go
│   │   │   │   ├── get_by_id.go
│   │   │   │   ├── update.go
│   │   │   │   └── delete.go
│   │   │   ├── scan/
│   │   │   │   ├── port_scanner.go
│   │   │   │   ├── vulnerability_scanner.go
│   │   │   │   └── pipeline_runner.go
│   │   │   └── wireless/
│   │   │       ├── deauth_attack.go
│   │   │       ├── pmkid_capture.go
│   │   │       └── wps_bruteforce.go
│   │   │
│   │   └── port/                      # Interface definitions cho infrastructure
│   │       ├── repository.go          # TargetRepository, ScanResultRepository
│   │       ├── scanner.go             # Scanner interface (cho các tool)
│   │       ├── container_executor.go  # Docker exec interface
│   │       └── logger.go              # Logger interface
│   │
│   ├── infrastructure/                # Implementation của các port
│   │   ├── repository/
│   │   │   ├── sqlite/
│   │   │   │   ├── target_repo.go     # implements port.TargetRepository
│   │   │   │   └── scan_result_repo.go
│   │   │   └── memory/                # (cho test)
│   │   │       └── target_repo.go
│   │   │
│   │   ├── container/
│   │   │   └── docker_executor.go     # implements port.ContainerExecutor
│   │   │
│   │   ├── logger/
│   │   │   └── zerolog_adapter.go     # implements port.Logger
│   │   │
│   │   └── config/
│   │       └── loader.go              # Load config từ env / file
│   │
│   ├── handler/                       # HTTP handlers (delivery layer)
│   │   ├── health/
│   │   │   └── health.go
│   │   ├── target/
│   │   │   ├── handler.go
│   │   │   └── dto.go                 # Request/Response DTOs
│   │   ├── scan/
│   │   │   ├── nmap_handler.go
│   │   │   ├── nuclei_handler.go
│   │   │   └── dto.go
│   │   ├── wireless/
│   │   │   ├── airodump_handler.go
│   │   │   ├── aireplay_handler.go
│   │   │   └── dto.go
│   │   └── tools/                     # Mỗi tool 1 file handler
│   │       ├── amass_handler.go
│   │       ├── dork_handler.go
│   │       └── ...
│   │
│   ├── middleware/                    # HTTP middleware
│   │   ├── logger.go
│   │   ├── cors.go
│   │   ├── auth.go                    # (nếu có)
│   │   ├── ratelimit.go
│   │   └── recovery.go
│   │
│   └── routes/                        # Route registration
│       ├── router.go                  # Wire up tất cả routes
│       ├── health.go
│       ├── target.go
│       ├── scan.go
│       └── wireless.go
│
├── pkg/                               # Public shared code (có thể dùng lại)
│   ├── response/                      # JSON response helpers
│   ├── validator/                     # Validation helpers
│   ├── pagination/                    # Pagination utility
│   └── errors/                        # Error wrapping utilities
│
├── migrations/                        # Database migration files
│   ├── 000001_create_targets.up.sql
│   └── 000001_create_targets.down.sql
│
├── docker/                            # Docker configuration
│   ├── docker-compose.yml
│   └── Dockerfile.*
│
├── tests/
│   ├── unit/                          # Unit tests (mock dependencies)
│   ├── integration/                   # Integration tests (real DB, real Docker)
│   └── e2e/                           # End-to-end tests (full server)
│
├── scripts/                           # Build/deploy scripts
│
├── docs/                              # Documentation
│   ├── api/                           # OpenAPI spec
│   └── architecture/                  # Architecture decisions
│
├── .env.example
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

---

## 3. Ví dụ cụ thể — Target Feature

### 3.1 Domain Layer (`internal/app/domain/target/entity.go`)

```go
package target

import (
    "time"
)

// Target là aggregate root.
type Target struct {
    ID             string
    Title          string
    URL            string
    Icon           string
    Platform       string
    LastUsedAt     *time.Time
    ExecutablePath string
    StartupArgs    string
    Environment    string
    CreatedAt      time.Time
    UpdatedAt      time.Time
}

// NewTarget tạo target mới với validation.
func NewTarget(title, url string) (*Target, error) {
    if title == "" {
        return nil, ErrEmptyTitle
    }
    return &Target{
        ID:        generateID(),
        Title:     title,
        URL:       url,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }, nil
}

// UpdateTitle là domain behavior, không để setter tràn lan.
func (t *Target) UpdateTitle(newTitle string) error {
    if newTitle == "" {
        return ErrEmptyTitle
    }
    t.Title = newTitle
    t.UpdatedAt = time.Now()
    return nil
}
```

### 3.2 Port Interface (`internal/app/port/repository.go`)

```go
package port

import (
    "context"
    "github.com/phantoma/server/internal/app/domain/target"
)

// TargetRepository định nghĩa contract cho persistence layer.
type TargetRepository interface {
    Save(ctx context.Context, t *target.Target) error
    FindByID(ctx context.Context, id string) (*target.Target, error)
    FindAll(ctx context.Context, filter TargetFilter) ([]*target.Target, error)
    Update(ctx context.Context, t *target.Target) error
    Delete(ctx context.Context, id string) error
}

type TargetFilter struct {
    Platform string
    Limit    int
    Offset   int
}
```

### 3.3 UseCase (`internal/app/usecase/target/create.go`)

```go
package target

import (
    "context"
    "github.com/phantoma/server/internal/app/domain/target"
    "github.com/phantoma/server/internal/app/port"
)

// CreateTargetUseCase xử lý logic tạo target.
type CreateTargetUseCase struct {
    repo port.TargetRepository
}

func NewCreateTargetUseCase(repo port.TargetRepository) *CreateTargetUseCase {
    return &CreateTargetUseCase{repo: repo}
}

// Input là DTO cho use case.
type CreateTargetInput struct {
    Title string
    URL   string
}

// Output là DTO trả về.
type CreateTargetOutput struct {
    Target *target.Target
}

func (uc *CreateTargetUseCase) Execute(ctx context.Context, input CreateTargetInput) (*CreateTargetOutput, error) {
    // Domain logic
    t, err := target.NewTarget(input.Title, input.URL)
    if err != nil {
        return nil, err
    }

    // Persist
    if err := uc.repo.Save(ctx, t); err != nil {
        return nil, err
    }

    return &CreateTargetOutput{Target: t}, nil
}
```

### 3.4 Repository Implementation (`internal/infrastructure/repository/sqlite/target_repo.go`)

```go
package sqlite

import (
    "context"
    "database/sql"
    "github.com/phantoma/server/internal/app/domain/target"
    "github.com/phantoma/server/internal/app/port"
)

type TargetRepository struct {
    db *sql.DB
}

func NewTargetRepository(db *sql.DB) port.TargetRepository {
    return &TargetRepository{db: db}
}

func (r *TargetRepository) Save(ctx context.Context, t *target.Target) error {
    _, err := r.db.ExecContext(ctx, `
        INSERT INTO targets (id, title, url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    `, t.ID, t.Title, t.URL, t.CreatedAt, t.UpdatedAt)
    return err
}

// ... các method khác
```

### 3.5 Handler (`internal/handler/target/handler.go`)

```go
package target

import (
    "encoding/json"
    "net/http"
    "github.com/phantoma/server/internal/app/usecase/target"
    "github.com/phantoma/server/pkg/response"
)

type Handler struct {
    createUseCase *target.CreateTargetUseCase
    listUseCase   *target.ListTargetUseCase
    // ... các use case khác
}

func NewHandler(
    createUC *target.CreateTargetUseCase,
    listUC *target.ListTargetUseCase,
    // ...
) *Handler {
    return &Handler{
        createUseCase: createUC,
        listUseCase:   listUC,
    }
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
    var req CreateTargetRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        response.Error(w, http.StatusBadRequest, "invalid request")
        return
    }

    output, err := h.createUseCase.Execute(r.Context(), target.CreateTargetInput{
        Title: req.Title,
        URL:   req.URL,
    })
    if err != nil {
        response.Error(w, http.StatusInternalServerError, err.Error())
        return
    }

    response.JSON(w, http.StatusCreated, output.Target)
}
```

---

## 4. Dependency Injection (Wire)

Sử dụng **Google Wire** để tự động generate DI code.

### `internal/app/wire.go`

```go
//go:build wireinject
// +build wireinject

package app

import (
    "database/sql"
    "github.com/google/wire"
    "github.com/phantoma/server/internal/handler/target"
    "github.com/phantoma/server/internal/infrastructure/repository/sqlite"
    "github.com/phantoma/server/internal/app/usecase/target"
)

var TargetSet = wire.NewSet(
    sqlite.NewTargetRepository,
    target.NewCreateTargetUseCase,
    target.NewListTargetUseCase,
    target.NewGetTargetUseCase,
    target.NewUpdateTargetUseCase,
    target.NewDeleteTargetUseCase,
    target.NewHandler,
)

func InitializeTargetHandler(db *sql.DB) *target.Handler {
    wire.Build(TargetSet)
    return nil
}
```

### `cmd/api/main.go`

```go
func main() {
    // ...
    db := database.DB
    
    // Wire-generated code
    targetHandler := app.InitializeTargetHandler(db)
    
    // Register routes
    routes.RegisterTargetRoutes(mux, targetHandler)
    // ...
}
```

---

## 5. Quy tắc đặt tên

| Loại | Quy tắc | Ví dụ |
|------|---------|-------|
| **Package** | lowercase, singular, không dấu gạch dưới | `target`, `usecase`, `repository` |
| **Interface** | Noun hoặc `-er` suffix | `TargetRepository`, `Scanner`, `Logger` |
| **Struct** | PascalCase | `CreateTargetUseCase`, `TargetHandler` |
| **Function** | PascalCase (exported) / camelCase (private) | `NewTarget()`, `validateTarget()` |
| **File** | snake_case | `target_repo.go`, `create_target.go` |
| **Test** | `*_test.go` | `target_repo_test.go` |

---

## 6. Xử lý lỗi chuẩn

### Domain errors (`internal/app/domain/target/errors.go`)

```go
package target

import "errors"

var (
    ErrNotFound      = errors.New("target not found")
    ErrEmptyTitle    = errors.New("title cannot be empty")
    ErrInvalidURL    = errors.New("invalid URL format")
    ErrDuplicateName = errors.New("target with this title already exists")
)
```

### UseCase errors — wrap with context

```go
func (uc *CreateTargetUseCase) Execute(...) error {
    // ...
    if err := uc.repo.Save(ctx, t); err != nil {
        return fmt.Errorf("failed to save target: %w", err)
    }
    return nil
}
```

### Handler — map domain errors to HTTP status

```go
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
    // ...
    target, err := h.getUC.Execute(ctx, id)
    if err != nil {
        switch {
        case errors.Is(err, target.ErrNotFound):
            response.Error(w, http.StatusNotFound, "target not found")
        default:
            response.Error(w, http.StatusInternalServerError, err.Error())
        }
        return
    }
    response.JSON(w, http.StatusOK, target)
}
```

---

## 7. Testing Strategy

### Unit Test (mock dependencies)

```go
// internal/app/usecase/target/create_test.go
func TestCreateTargetUseCase(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockRepo := mocks.NewMockTargetRepository(ctrl)
    mockRepo.EXPECT().Save(gomock.Any(), gomock.Any()).Return(nil)

    uc := NewCreateTargetUseCase(mockRepo)
    output, err := uc.Execute(context.Background(), CreateTargetInput{
        Title: "Test Target",
        URL:   "https://example.com",
    })

    assert.NoError(t, err)
    assert.Equal(t, "Test Target", output.Target.Title)
}
```

### Integration Test (real DB)

```go
// tests/integration/target_repo_test.go
func TestTargetRepository_Integration(t *testing.T) {
    db := setupTestDB(t)
    defer teardownTestDB(db)

    repo := sqlite.NewTargetRepository(db)
    tgt := &target.Target{ID: "1", Title: "Test"}

    err := repo.Save(context.Background(), tgt)
    assert.NoError(t, err)

    found, err := repo.FindByID(context.Background(), "1")
    assert.NoError(t, err)
    assert.Equal(t, "Test", found.Title)
}
```

---

## 8. Mở rộng tính năng — Khi thêm Feature mới

### Các bước thêm 1 tính năng mới (ví dụ: "User Authentication"):

1. **Domain** → `internal/app/domain/user/entity.go`, `errors.go`
2. **Port** → `internal/app/port/repository.go` thêm `UserRepository`
3. **UseCase** → `internal/app/usecase/user/register.go`, `login.go`
4. **Infrastructure** → `internal/infrastructure/repository/sqlite/user_repo.go`
5. **Handler** → `internal/handler/user/handler.go`
6. **Routes** → `internal/routes/user.go` + đăng ký trong `router.go`
7. **DI** → thêm vào `wire.go` set
8. **Migration** → `migrations/000002_create_users.up.sql`
9. **Tests** → unit + integration
10. **API Doc** → `docs/api/openapi.yaml`

### Không cần sửa code cũ (Open/Closed Principle)

- Handler mới không ảnh hưởng handler cũ
- Repository interface mới không ảnh hưởng repository cũ
- Middleware có thể được áp dụng toàn cục hoặc theo route

---

## 9. Configuration Management

### `internal/infrastructure/config/config.go`

```go
package config

type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
    Docker   DockerConfig   `mapstructure:"docker"`
    Log      LogConfig      `mapstructure:"log"`
}

type ServerConfig struct {
    Port         string        `mapstructure:"port"`
    ReadTimeout  time.Duration `mapstructure:"read_timeout"`
    WriteTimeout time.Duration `mapstructure:"write_timeout"`
}

// Load sử dụng Viper hoặc env vars
func Load() (*Config, error) {
    // ...
}
```

### `.env` + `config.yaml`

```
# .env
SERVER_PORT=8080
DB_PATH=~/.phantoma/phantoma.sql
```

---

## 10. Middleware Stack

```go
// internal/middleware/chain.go
func Chain(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
    for i := len(middlewares) - 1; i >= 0; i-- {
        h = middlewares[i](h)
    }
    return h
}

// internal/routes/router.go
func NewRouter(...) http.Handler {
    mux := http.NewServeMux()
    // ... register routes

    return middleware.Chain(mux,
        middleware.Recovery,
        middleware.CORS,
        middleware.RequestLogger,
        middleware.RateLimit(100),
        middleware.Auth, // optional
    )
}
```

---

## 11. So sánh với cấu trúc hiện tại

| Hiện tại | Đề xuất | Lý do |
|----------|---------|-------|
| `internal/domain/` flat | `internal/app/domain/feature/` | Feature-based, dễ tìm |
| `internal/service/` chứa tất cả | `internal/app/usecase/feature/` | UseCase rõ ràng, mỗi file 1 use case |
| `internal/handler/tools/` | `internal/handler/scan/`, `wireless/`, `recon/` | Nhóm theo domain, không trộn lẫn |
| `internal/routes/` + `pkg/` | Giữ nguyên | Tốt |
| `internal/database/` | `internal/infrastructure/repository/sqlite/` | Tách biệt rõ ràng |

---

## 12. Khi nào dùng pattern nào?

| Pattern | Khi nào dùng |
|---------|--------------|
| **UseCase per action** | Mỗi API endpoint → 1 use case struct (Create, Update, List, Delete) |
| **Repository** | Mọi truy vấn database → interface + implementation |
| **Factory** | Tạo complex objects (ví dụ: Target với validation) |
| **Strategy** | Nhiều tool cùng interface → NmapScanner, NiktoScanner, ... |
| **Observer / PubSub** | Sự kiện bất đồng bộ (scan complete, notification) |
| **Middleware** | Cross-cutting concerns (logging, auth, rate limit) |

---

## 13. Checklist cho Feature mới

- [ ] Domain entity + errors
- [ ] Port interface (repository, external service)
- [ ] UseCase (1 file per action)
- [ ] UseCase test (mock dependencies)
- [ ] Repository implementation (infrastructure)
- [ ] Repository integration test
- [ ] Handler (HTTP)
- [ ] Handler test
- [ ] Route registration
- [ ] DI wire
- [ ] Migration file (if DB change)
- [ ] OpenAPI spec update
- [ ] README update

---

## 14. Công cụ hỗ trợ

| Công cụ | Mục đích |
|---------|----------|
| **Google Wire** | DI code generation |
| **Mockgen** | Generate mocks cho testing |
| **golangci-lint** | Linting |
| **Air** | Hot reload development |
| **go-test** | Unit + Integration tests |
| **Swaggo** | Generate OpenAPI từ comments |

---

## Tổng kết

Cấu trúc này cho phép:

✅ **Scale lên hàng trăm features** — mỗi feature độc lập, không chạm vào nhau  
✅ **Dễ bảo trì** — tìm đúng file, sửa đúng chỗ, không lo side-effect  
✅ **Dễ test** — mọi dependency đều có thể mock  
✅ **Dễ onboard** — pattern rõ ràng, consistent  
✅ **Dễ thay đổi infrastructure** — repository interface tách biệt với implementation  
✅ **Clean Architecture thuần** — domain không biết gì về handler, repository, hay HTTP  
