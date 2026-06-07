# 🎭 Phantoma EMULATE — Tài Liệu Module Giả Lập Client

> **Phiên bản:** 1.0.0  
> **Module:** Client Emulation, Headless Browser & API Recreation  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Headless Browser Automation](#2-headless-browser-automation)
- [3. MITM Proxy & Traffic Capture](#3-mitm-proxy--traffic-capture)
- [4. API Recreation — Tái Tạo Client Không Browser](#4-api-recreation--tái-tạo-client-không-browser)
- [5. TLS Decryption & HTTPS Handling](#5-tls-decryption--https-handling)
- [6. Session & Cookie Management](#6-session--cookie-management)
- [7. Cơ Chế An Toàn & Giới Hạn](#7-cơ-chế-an-toàn--giới-hạn)
- [8. Luồng Dữ Liệu & API](#8-luồng-dữ-liệu--api)
- [9. Hướng Dẫn Phát Triển](#9-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **EMULATE** cung cấp khả năng giả lập hành vi của trình duyệt thật, ghi lại và tái tạo các request HTTP/HTTPS, cũng như xử lý xác thực và phiên làm việc.

```
EMULATE/
├── EMULATE.md                   ← Tài liệu này
├── index.tsx                    ← Component chính
├── Headless/                    ← Trình duyệt không giao diện
│   ├── PlaywrightDriver.tsx
│   ├── SeleniumDriver.tsx
│   ├── PuppeteerDriver.tsx
│   └── ...
├── Proxy/                       ← MITM Proxy
│   ├── ProxySetup.tsx
│   ├── TrafficRecorder.tsx
│   ├── RequestModifier.tsx
│   └── ...
├── APIRecreation/               ← Tái tạo API
│   ├── HARImporter.tsx
│   ├── OpenAPIGenerator.tsx
│   ├── SDKGenerator.tsx
│   └── ...
├── TLS/                         ← Xử lý TLS
│   ├── CertificateInstaller.tsx
│   ├── TLSDumper.tsx
│   └── ...
├── Session/                     ← Quản lý phiên
│   ├── CookieManager.tsx
│   ├── TokenRefresher.tsx
│   └── ...
├── services/                    (playwright, puppeteer, mitmproxy, har-sdk)
├── types/
└── utils/
```

### 🎯 Các kỹ thuật chính

| # | Kỹ thuật | Mô tả |
|---|----------|-------|
| 1 | Headless Browser | Tự động hóa trình duyệt không giao diện (Playwright, Puppeteer) |
| 2 | MITM Proxy | Chặn, ghi lại, sửa request/response |
| 3 | Traffic Capture → HAR | Ghi lại toàn bộ lưu lượng |
| 4 | API Recreation | Tạo client Python/Node.js từ HAR |
| 5 | OpenAPI Generator | Tự động sinh OpenAPI spec từ traffic |
| 6 | TLS Decryption | Giải mã HTTPS traffic với CA certificate |
| 7 | Session Management | Tự động refresh token, xử lý cookie |

---

## 2. Headless Browser Automation

### 2.1 Các Driver Hỗ Trợ

| Driver | Nền tảng | Đặc điểm |
|--------|----------|----------|
| **Playwright** | Chromium, Firefox, WebKit | Mạnh mẽ, hỗ trợ mobile, auto‑wait |
| **Puppeteer** | Chromium | Nhẹ, tốc độ cao |
| **Selenium** | Đa trình duyệt | Tương thích cũ, chậm hơn |

### 2.2 Các Thao Tác Hỗ Trợ

| Thao tác | Mô tả | Ví dụ lệnh |
|----------|-------|------------|
| `navigate` | Điều hướng đến URL | `await page.goto('https://example.com')` |
| `click` | Click vào element | `await page.click('#login-btn')` |
| `type` | Nhập text | `await page.fill('#username', 'admin')` |
| `screenshot` | Chụp ảnh màn hình | `await page.screenshot({ path: 'ss.png' })` |
| `evaluate` | Chạy JavaScript | `await page.evaluate(() => document.cookie)` |
| `waitFor` | Chờ element xuất hiện | `await page.waitForSelector('.loaded')` |
| `select` | Chọn dropdown | `await page.selectOption('#country', 'VN')` |
| `upload` | Upload file | `await page.setInputFiles('#file', 'test.txt')` |

**Component:** `Headless/PlaywrightDriver.tsx` – cung cấp UI để xây dựng kịch bản (có thể ghi lại action bằng record tool).

### 2.3 Tự Động Hóa Kịch Bản (Script)

- **Record & Replay**: Ghi lại các thao tác trên trình duyệt thật, xuất ra code Playwright/Puppeteer.
- **Cron job**: Chạy định kỳ (ví dụ scrape giá sản phẩm mỗi giờ).

**Output:** Script JavaScript/TypeScript có thể chạy độc lập.

---

## 3. MITM Proxy & Traffic Capture

### 3.1 Cấu Hình Proxy

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `port` | `number` | Cổng proxy (mặc định 8080) |
| `sslInsecure` | `boolean` | Bỏ qua lỗi chứng chỉ |
| `caCertPath` | `string` | Đường dẫn đến CA certificate |
| `recordDir` | `string` | Thư mục lưu HAR files |

### 3.2 Ghi Lại Lưu Lượng (HAR Format)

HAR (HTTP Archive) chứa:
- Request (method, url, headers, body)
- Response (status, headers, body)
- Timing (thời gian gửi, nhận, tải)

**Công cụ:** `mitmproxy` (chế độ `--set hardump=output.har`), `Browser DevTools`.

**Output:** File `.har`.

### 3.3 Sửa Request/Response (Rewrite)

| Mục đích | Ví dụ |
|----------|-------|
| Thay header | Thêm `Authorization: Bearer fake` |
| Sửa response body | Chặn script quảng cáo |
| Giả lập delay | Chậm response để test timeout |

---

## 4. API Recreation — Tái Tạo Client Không Browser

### 4.1 Từ HAR → Client Code

| Input | Output | Mô tả |
|-------|--------|-------|
| HAR file | Python requests | Sinh code gọi API thuần |
| HAR file | Node.js fetch | Dùng node-fetch hoặc axios |
| HAR file | cURL commands | Dễ dàng test lại |

**Công cụ:** `har-to-k6`, `postman` (import HAR → export code), tự viết parser.

**Ví dụ output Python:**
```python
import requests

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0...',
    'X-CSRF-Token': 'abc123'
})

response = session.post('https://api.example.com/login', json={
    'username': 'user',
    'password': 'pass'
})
token = response.json()['token']
```

### 4.2 Tự Động Sinh OpenAPI / Swagger

Phân tích nhiều request từ HAR để suy ra:
- Endpoint paths (`GET /users`, `POST /users`)
- Tham số (query, body schema)
- Authentication method (Bearer, Cookie)

**Công cụ:** `har-spec`, `api-spec-converter`.

### 4.3 Sinh SDK Tự Động

- Từ OpenAPI spec → dùng `OpenAPI Generator` để sinh SDK Python, TypeScript, Java, Go.
- SDK có thể thay thế hoàn toàn browser cho các tác vụ lặp đi lặp lại.

---

## 5. TLS Decryption & HTTPS Handling

### 5.1 Cài Đặt CA Certificate

| Bước | Mô tả |
|------|-------|
| 1 | Tạo CA certificate (mitmproxy hoặc openssl) |
| 2 | Cài đặt vào hệ thống (Windows, macOS, Linux) hoặc vào trình duyệt |
| 3 | Cấu hình proxy để ký lại chứng chỉ cho từng domain |

**Công cụ:** `mitmproxy` tự động tạo và cài CA.

### 5.2 Giải Mã TLS 1.2 / 1.3

- Với CA đã cài, mitmproxy có thể giải mã hầu hết TLS traffic.
- Lưu ý: Một số ứng dụng sử dụng **certificate pinning** (chỉ chấp nhận chứng chỉ gốc) → không giải mã được trừ khi patch app.

### 5.3 TLS Dumper (Logging Only)

- Ghi lại metadata: SNI, cipher suite, certificate chain.
- Không cần giải mã nội dung.

---

## 6. Session & Cookie Management

### 6.1 Cookie Manager

| Chức năng | Mô tả |
|-----------|-------|
| `getCookies` | Lấy cookie hiện tại |
| `setCookie` | Thêm/sửa cookie |
| `clearCookies` | Xóa toàn bộ |
| `exportCookies` | Xuất ra JSON (để dùng lại) |

### 6.2 Token Refresh Tự Động

- Phát hiện response 401 (Unauthorized).
- Tự động gọi refresh endpoint (nếu biết) hoặc chạy lại headless browser để lấy token mới.

### 6.3 Session Persistence

- Lưu session (cookie, token, localStorage) vào file.
- Khôi phục session sau khi restart script.

---

## 7. Cơ Chế An Toàn & Giới Hạn

### 7.1 Chỉ Dùng Cho Mục Đích Hợp Pháp

- Có xác nhận "Tôi không sử dụng module này để tấn công dịch vụ của người khác".
- Không tự động gửi request với tần suất cao (rate limit mặc định 1 request/giây).

### 7.2 Bảo Vệ Dữ Liệu Nhạy Cảm

- HAR files chứa cookie, token, password → được mã hóa khi lưu.
- Người dùng có thể chọn xóa sau khi xuất code.

### 7.3 Chống Pinning

- Module không cung cấp cơ chế bypass certificate pinning (phải patch app riêng).
- Cảnh báo người dùng nếu app có pinning.

### 7.4 Logging

- Ghi lại lịch sử chạy headless, proxy.
- Có thể replay lại traffic đã ghi.

---

## 8. Luồng Dữ Liệu & API

```
User → (chọn driver / proxy) → thực thi kịch bản
   ↓
Ghi lại HAR → import vào API Recreation → sinh code
   ↓
Chạy code không browser → tự động hóa tác vụ
```

### Endpoints dự kiến

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/emulate/headless/run` | `{ script: '...' }` | Chạy script Playwright/Puppeteer |
| POST | `/api/emulate/proxy/start` | `{ port, recordFile }` | Khởi động MITM proxy |
| DELETE | `/api/emulate/proxy/stop` | - | Dừng proxy |
| POST | `/api/emulate/har/import` | `{ harFile }` | Import HAR file |
| POST | `/api/emulate/har/to-sdk` | `{ harFile, language }` | Sinh SDK từ HAR |
| POST | `/api/emulate/session/save` | `{ sessionName }` | Lưu cookie hiện tại |
| GET | `/api/emulate/session/load` | `{ sessionName }` | Khôi phục session |

---

## 9. Hướng Dẫn Phát Triển

### 9.1 Thư Viện Cần Dùng

| Mục đích | Thư viện |
|----------|----------|
| Headless | `playwright`, `puppeteer`, `selenium-webdriver` |
| MITM Proxy | `mitmproxy` (gọi từ command line), `node-mitmproxy` |
| HAR Parser | `@har-sdk/core` |
| Code gen | `@apicodegen` (tùy chỉnh) |

### 9.2 Service Wrapper

| File | Mô tả |
|------|-------|
| `services/playwrightService.ts` | Quản lý browser instance, chạy script |
| `services/proxyService.ts` | Start/stop mitmproxy, ghi HAR |
| `services/harParser.ts` | Đọc HAR, chuyển đổi sang internal format |
| `services/codegen.ts` | Sinh code Python/JS từ HAR |

### 9.3 UI Components

- **ScriptEditor**: Monaco editor cho script Playwright, có syntax highlighting.
- **RecorderPanel**: Hiển thị log real‑time từ proxy, nút "Start Recording".
- **HARViewer**: Tree view của request/response, có thể chỉnh sửa.
- **SDKGenerator**: Chọn ngôn ngữ, nút "Generate", preview code.

### 9.4 Tích Hợp Với Module Khác

- **INTEL**: Có thể dùng EMULATE để tự động crawl dữ liệu từ web (thay vì dùng API).
- **ATTACK**: EMULATE có thể giả lập browser để khai thác XSS, CSRF (tiêm payload qua proxy).

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số kỹ thuật** | 7 (headless, proxy, HAR, API recreation, SDK gen, TLS decrypt, session mgmt) |
| **Driver hỗ trợ** | Playwright, Puppeteer, Selenium |
| **Output format** | HAR, Python code, Node.js code, OpenAPI spec, cURL |
| **TLS decryption** | Có (nếu cài CA, không bypass pinning) |
| **Rate limit mặc định** | 1 req/s |

> **Phantoma EMULATE v1.0.0** — *"Làm chủ giao tiếp, tái hiện mọi hành vi"* 🎭