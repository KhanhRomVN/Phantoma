# PACKAGE.md — Scripts & Build Notes

Ghi chú về các script trong `package.json` và cách build/test dự án Phantoma.

## Dev

| Script | Mô tả |
|---|---|
| `npm run dev` | Chạy Electron dev (electron-vite). Cần bật `server/` và `emulate/` thủ công (xem dưới). |

Bật 2 server cho dev (mỗi cái 1 terminal):
```
cd server && PORT=8080 npm run dev
cd emulate && EMULATE_PORT=3002 npm run dev
```

## Typecheck & Lint

| Script | Mô tả |
|---|---|
| `npm run typecheck` | Typecheck node (main+preload) rồi web (renderer) |
| `npm run lint` | ESLint toàn dự án |

## Build phát hành

| Script | Mô tả |
|---|---|
| `npm run build` | Menu chọn target tương tác. Tự build `server/` + `emulate/` → typecheck (tùy chọn) → electron-vite → electron-builder → copy artifact. |

Bên trong `npm run build`, script `scripts/build-interactive.js` chạy tuần tự:
1. (tùy chọn) `npm run typecheck`
2. Kiểm tra `server/dist/index.js` + `emulate/dist/index.js`: nếu đã có → hỏi dùng lại hay build lại; chưa có → build luôn
3. `electron-vite build`
4. `electron-builder <target đã chọn>`
5. `scripts/copy-artifacts.js` — lọc artifact cần upload sang `release/v<ver>/`

**Bản build server/emulate:** `scripts/build-server.js <server|emulate>` chỉ chạy `npm run build`, ra `server/dist/` / `emulate/dist/` (không version, không release riêng).

**Cấu trúc output:**
- `release-build/v<ver>/` — staging (electron-builder ghi tất cả, kể cả `*-unpacked/`, gitignored).
- `release/v<ver>/` — chỉ chứa file cần upload GitHub Release (`.AppImage/.deb/.rpm/.exe/.dmg/.zip` + `latest-*.yml` + `builder-effective-config.yaml`).

## Test bản packaged (nhanh, không nén AppImage)

| Script | Mô tả |
|---|---|
| `npm run test:build` | Kiểm tra `server/dist` + `emulate/dist` (có → hỏi dùng lại/build lại, thiếu → build luôn) → electron-vite → electron-builder `--linux dir`. CHỈ build, không chạy. |
| `npm run test:latest` | Tự tìm `release-build/v<cao nhất>`, chạy binary — KHÔNG build lại |

Cả 2 tự bỏ `ELECTRON_RUN_AS_NODE` (biến này có sẵn trong shell dev khiến binary chạy như Node thay vì mở app).

## Ghi chú

- `package.json` không hỗ trợ comment (JSON thuần) — mọi ghi chú về script đặt ở file này.
- Port 2 server trong build là **ngẫu nhiên** (không cố định); dev dùng cố định 8080/3002.
- Emulate server chỉ spawn on-demand khi vào module Emulate; shell server spawn ngay khi app ready.