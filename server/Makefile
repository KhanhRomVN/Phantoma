.PHONY: run build test lint docker-up docker-down

# Run server in development mode
run:
	go run ./cmd/api

# Build production binary
build:
	go build -o bin/phantoma-server ./cmd/api

# Run all tests
test:
	go test ./... -v

# Run integration tests only
test-integration:
	go test ./tests/integration/... -v

# Lint (requires golangci-lint)
lint:
	golangci-lint run ./...

# Tidy modules
tidy:
	go mod tidy

# Start Docker tool containers
docker-up:
	docker compose -f docker/docker-compose.yml up -d

# Stop Docker tool containers
docker-down:
	docker compose -f docker/docker-compose.yml down

# View container logs
docker-logs:
	docker compose -f docker/docker-compose.yml logs -f
