# Terminal on Browser

Web terminal chạy lệnh hệ thống + MITM proxy nội bộ bắt toàn bộ HTTPS (header + body) do tiến trình con phát ra.

## Tính năng

- **Terminal thật** (bash/zsh/sh) chạy dưới user hiện tại — full width/height viewport, dùng `node-pty` + xterm.js.
- **Panel HTTPS** trượt từ phải, hiển thị mọi request HTTPS mà tiến trình con spawn từ terminal (`curl`, `node`, `python`, ...) gửi ra ngoài internet.
- Click vào mỗi request để xem **request headers, request body, response headers, response body** (body text giới hạn 1MB, phần vượt đánh dấu `[truncated]`).
- **MITM proxy** chạy tại `127.0.0.1:8899`, CA cert sinh tự động vào `~/.terminal-on-browser-ca`.

## Yêu cầu

- Node.js >= 18
- Linux/macOS (đã test). Windows cần điều chỉnh shell mặc định.

## Cài đặt

```bash
cd terminal-on-browser
npm install
```

> `node-pty` cần compiler (`build-essential`, `python3`) trên Linux.

## Chạy

```bash
npm start
```

Mở trình duyệt: **http://127.0.0.1:3000**

Server chỉ bind `127.0.0.1` — không expose ra mạng.

## Cách hoạt động

1. Khi server khởi động, MITM proxy listen trên `127.0.0.1:8899` và sinh CA cert (nếu chưa có) vào `~/.terminal-on-browser-ca/`.
2. Khi mở terminal, server inject các biến môi trường sau vào tiến trình con:
   - `HTTP_PROXY` / `HTTPS_PROXY` = `http://127.0.0.1:8899`
   - `NO_PROXY` = `127.0.0.1,localhost`
   - `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`, `REQUESTS_CA_BUNDLE`, `CURL_CA_BUNDLE` = đường dẫn `ca.pem`
3. Mọi request HTTPS của `curl`, `node`, `python requests`, ... đi qua proxy → proxy giải mã, ghi lại header + body → đẩy entry qua WebSocket `/log` lên panel.
4. Request được forward nguyên vẹn ra ngoài (không sửa body).

## API WebSocket

| Endpoint | Hướng | Payload |
|---|---|---|
| `/pty`  | Client → Server | `{type:'input', data}` hoặc `{type:'resize', cols, rows}` |
| `/pty`  | Server → Client | `{type:'output', data}` hoặc `{type:'exit', exitCode, signal}` |
| `/log`  | Server → Client | `{type:'request', method, url, status, ...}` hoặc `{type, message, ts}` |
| `/log`  | Client → Server | (không dùng) |

## Giới hạn đã biết

- Body capture giới hạn **1MB** mỗi chiều; vượt sẽ đánh dấu `[truncated]`.
- Body binary chỉ hiện độ dài + content-type, không decode.
- Client **hard-code cert** (curl dùng `--cacert` chỉ định, Java truststore riêng, Go binary nhúng cert) sẽ không bắt được — cần chỉnh client thủ công.
- Chỉ bắt được traffic IPv4 qua proxy; traffic bỏ qua proxy (dùng `--noproxy`, raw socket) không thấy.

## Lưu ý bảo mật

- Terminal chạy **toàn quyền user** — chỉ dùng ở local, không public.
- CA cert sinh vào `~/.terminal-on-browser-ca/` — ai có CA này + key có thể MITM traffic của bạn. Không chia sẻ file này.
- Không dùng CA này ngoài phạm vi project.