# Phantoma Server — Architecture

Express + TypeScript. Thư mục này là nội dung của `src/`.

## Cấu trúc

| Thư mục | Vai trò |
|---|---|
| `main.ts` | Entry point: Welcome UI → container → listen → shutdown |
| `app.ts` | Express app factory (CORS → body → logger → routes → 404 → error) |
| `bootstrap/` | `container.ts` (DI, nối toàn bộ service), `server.ts` (listen, shutdown, guards) |
| `config/` | `env.config.ts` (parse env), `paths.config.ts` (đường dẫn dữ liệu), `index.ts` |
| `constants/` | Hằng số theo miền: http, browser, system |
| `api/controllers` | Nhận request → gọi service → `sendSuccess` |
| `api/middleware` | async-handler, error-handler, request-logger, local-only |
| `api/routes` | Khai báo route; `routes/system/` chia monitor / runtime / diagnostics |
| `services/browser` | Quản lý & cập nhật browser fork |
| `services/system` | Device fingerprint + toàn bộ System Monitor |
| `startup/` | `welcome.screen.ts`, `preferences.store.ts` |
| `errors/` | `AppError` (mang HTTP status) |
| `types/` | Kiểu dữ liệu dùng chung (`system.type.ts` là hợp đồng API cho modal) |
| `utils/` | Hàm tiện ích thuần (logger, process, network, file, number...) |

Luồng: `route → controller → service → SystemProbeService → OS`. Service chỉ nhận dependency qua constructor (xem `container.ts`).

## System Monitor

`SystemProbeService` là lớp duy nhất gọi `systeminformation` / lệnh hệ thống, mỗi nguồn có `TtlCache`.
`SystemMonitorService` lấy mẫu mỗi `SYSTEM_SAMPLE_INTERVAL_MS`, giữ 60 mẫu, **chỉ chạy khi có người xem**
(SSE hoặc request REST gần đây; tự dừng sau 15s), trừ khi `SYSTEM_MONITOR_AUTOSTART=true`.

Đơn vị: bytes, bytes/giây (`*Bps`), °C (`*C`), W (`*W`), epoch ms (`ts`). Không đọc được → `null` / mảng rỗng (không giả lập số liệu).

### Endpoint (`/api/v1/system`, envelope `{ success, data }`)

| Method | Path | Tab |
|---|---|---|
| GET | `/overview` | Overview (system info) |
| GET | `/metrics` · `/metrics/history?limit=` | Live sample / lịch sử 60 mẫu |
| GET | `/stream?interval=1000` | **SSE**: event `history` rồi `sample` (không có envelope) |
| GET | `/cpu` `/memory` `/gpu` `/storage` `/network` `/sensors` | Từng tab phần cứng |
| GET | `/processes?sort=cpu\|mem\|pid&query=&limit=` | Processes |
| GET | `/services?query=&status=` | Services |
| POST | `/services/:name/:action` (start\|stop\|restart) | Điều khiển service (cần `SYSTEM_CONTROL_ENABLED=true`) |
| GET | `/containers` `/ports?query=` | Containers, Open ports |
| GET | `/logs?limit=&level=&query=&since=` | System logs (poll bằng `since`) |
| GET | `/alerts` · PATCH `/alerts/rules/:id` `{enabled}` | Alerts |
| GET | `/security?refresh=true` | Security |
| GET | `/device-fingerprint` | (có sẵn, không bị local-only) |

Browser: `/api/v1/browser/{forks,updates}` giữ nguyên đường dẫn cũ.

### Biến môi trường

`PORT`, `ENV`, `PROFILE_DATA_DIR` (cũ) và:
`SYSTEM_SAMPLE_INTERVAL_MS` (1000) · `SYSTEM_MONITOR_AUTOSTART` (false) · `SYSTEM_LATENCY_TARGET` (`1.1.1.1:443`, `off` = tắt) ·
`SYSTEM_PUBLIC_IP_URL` (tắt) · `SYSTEM_CONTROL_ENABLED` (false) · `SYSTEM_ALLOW_REMOTE` (false: `/system/*` chỉ nhận loopback).

## Dependencies

`express`, `cors`, `dotenv`, **`systeminformation`** (mới).
