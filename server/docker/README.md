# Phantoma Docker Stack

Docker Compose stack cho Phantoma tool với Watchtower auto-update.

## Services

- **Watchtower** - Tự động update images lúc 3:00 AM hàng ngày
- **Nmap Scanner** - Network scanning tool
- **Nikto Scanner** - Web vulnerability scanner
- **Phantoma Server** - Go backend API để giao tiếp với các tool

## Khởi động

```bash
docker compose up -d
```

## Dừng

```bash
docker compose down
```

## Xem logs

```bash
docker compose logs -f [service_name]
```

## Portainer

Truy cập Portainer để quản lý containers:
- **URL**: https://localhost:9443
- **Username**: admin (tạo lần đầu vào)

## API Endpoints

### Health Check
```bash
curl http://localhost:8080/health
```

### Nmap Scan
```bash
curl -X POST http://localhost:8080/api/nmap/scan \
  -H "Content-Type: application/json" \
  -d '{
    "target": "scanme.nmap.org",
    "flags": ["-sV", "-p", "80,443"]
  }'
```

### Nikto Scan
```bash
curl -X POST http://localhost:8080/api/nikto/scan \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://example.com",
    "flags": ["-Tuning", "1"]
  }'
```

## Ports

- `9443` - Portainer HTTPS UI
- `8000` - Portainer Edge Agent (optional)
