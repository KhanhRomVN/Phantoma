# Phantoma Server

Go backend server cho Phantoma — giao tiếp với các security scanning tools chạy trong Docker containers.

## Cấu trúc Project

```
server/
├── cmd/
│   └── api/
│       └── main.go          # Entry point, graceful shutdown
├── internal/                # Code private, không import từ bên ngoài
│   ├── config/              # Load env variables
│   ├── domain/              # Interfaces & entities (Scanner, ScanRequest, errors)
│   ├── handler/             # HTTP handlers (mỗi tool 1 sub-package)
│   │   ├── health/
│   │   ├── nmap/
│   │   └── nikto/
│   └── service/             # Business logic (gọi docker exec)
│       ├── nmap/
│       └── nikto/
├── pkg/                     # Code có thể dùng lại / public
│   ├── docker/              # Helper chạy docker exec
│   └── response/            # JSON response helpers
├── api/
│   └── openapi.yaml         # API spec
├── docker/
│   ├── docker-compose.yml   # Tool containers (nmap, nikto, watchtower)
│   └── README.md
├── tests/
│   └── integration/         # Integration tests
├── scripts/
│   └── run.sh               # Script chạy server kèm .env
├── .env.example             # Template environment variables
├── Makefile                 # Common commands
├── go.mod
└── README.md
```

## Cài đặt

### Yêu cầu

- Go 1.22+
- Docker + Docker Compose

### Bước 1: Khởi động Docker containers

```bash
make docker-up
```

### Bước 2: Tạo file .env

```bash
cp .env.example .env
```

### Bước 3: Chạy server

```bash
make run
# hoặc
./scripts/run.sh
# hoặc trực tiếp
go run ./cmd/api
```

## API Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/health` | Health check |
| POST | `/api/v1/nmap/scan` | Nmap network scan |
| POST | `/api/v1/nikto/scan` | Nikto web vulnerability scan |

### Ví dụ

**Nmap scan:**
```bash
curl -X POST http://localhost:8080/api/v1/nmap/scan \
  -H "Content-Type: application/json" \
  -d '{"target": "scanme.nmap.org", "flags": ["-sV", "-p", "80,443"]}'
```

**Nikto scan:**
```bash
curl -X POST http://localhost:8080/api/v1/nikto/scan \
  -H "Content-Type: application/json" \
  -d '{"target": "http://example.com"}'
```

## Development

```bash
# Chạy tests
make test

# Lint
make lint

# Build binary
make build
```

## Thêm tool mới

1. Tạo service mới: `internal/service/<toolname>/<toolname>.go` — implement `domain.Scanner`
2. Tạo handler mới: `internal/handler/<toolname>/<toolname>.go`
3. Đăng ký route trong `internal/handler/router.go`
4. Thêm container vào `docker/docker-compose.yml`
5. Thêm env var container name vào `internal/config/config.go` và `.env.example`
