# Phantoma Server - Google Dorking Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Go 1.21+ installed
- Make (optional)

## Quick Deployment

### Option 1: Automated Script

```bash
./deploy.sh
```

### Option 2: Manual Deployment

1. **Build go-dork Docker image**
```bash
cd docker
docker build -f Dockerfile.go-dork -t go-dork:latest .
```

2. **Start all containers**
```bash
docker-compose up -d
```

3. **Verify containers are running**
```bash
docker ps | grep -E "go-dork|nmap|nikto|metasploit"
```

4. **Set environment variables**
```bash
export GO_DORK_CONTAINER=go-dork
export PORT=8080
# Optional: override other container names
export NMAP_CONTAINER=nmap
export NIKTO_CONTAINER=nikto
export METASPLOIT_CONTAINER=metasploit
export SEARCHSPLOIT_CONTAINER=searchsploit
```

5. **Run the server**
```bash
go run cmd/server/main.go
```

## Testing the Google Dorking API

### Basic dork search

```bash
curl -X POST http://localhost:8080/api/v1/dork/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "inurl:login",
    "pages": 1
  }'
```

### Search with custom engine

```bash
curl -X POST http://localhost:8080/api/v1/dork/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "org:Target company",
    "engine": "shodan",
    "pages": 2
  }'
```

### Search with proxy

```bash
curl -X POST http://localhost:8080/api/v1/dork/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "intext:password",
    "engine": "google",
    "pages": 3,
    "proxy": "http://proxy.example.com:8080"
  }'
```

### Search with custom headers

```bash
curl -X POST http://localhost:8080/api/v1/dork/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "filetype:pdf confidential",
    "headers": ["User-Agent: Mozilla/5.0", "Accept-Language: en-US"]
  }'
```

## Docker Container Management

### Check container status

```bash
docker ps -a | grep go-dork
```

### View container logs

```bash
docker logs go-dork
```

### Restart container

```bash
docker restart go-dork
```

### Stop all containers

```bash
cd docker && docker-compose down
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8080 |
| `GO_DORK_CONTAINER` | go-dork container name | go-dork |
| `NMAP_CONTAINER` | Nmap container name | nmap |
| `NIKTO_CONTAINER` | Nikto container name | nikto |
| `METASPLOIT_CONTAINER` | Metasploit container name | metasploit |
| `SEARCHSPLOIT_CONTAINER` | Searchsploit container name | searchsploit |

## Troubleshooting

### Container not starting

```bash
# Check Docker daemon
sudo systemctl status docker

# Check build logs
cd docker && docker build -f Dockerfile.go-dork -t go-dork:latest . --no-cache
```

### API returns errors

```bash
# Check if container is running
docker ps | grep go-dork

# Test container manually
docker exec go-dork go-dork -q "test" -s
```

### No results returned

- Verify internet connectivity from container
- Check if search engine blocks the request (try different engine)
- Add proxy or custom headers to avoid rate limiting

## Integration Tests

Run integration tests with actual Docker containers:

```bash
export INTEGRATION_TEST=1
go test -v ./tests/go-dork/...
```

## Security Notes

- Use proxies for production deployments
- Respect search engines' terms of service
- Implement rate limiting in production
- Consider using API keys for authentication

## API Response Format

```json
{
  "query": "inurl:login",
  "engine": "google",
  "pages": 1,
  "results": [
    {
      "url": "https://example.com/login",
      "title": "Login Page",
      "content": ""
    }
  ],
  "total": 10,
  "raw_output": "..."
}