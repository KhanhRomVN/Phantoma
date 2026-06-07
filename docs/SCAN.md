# 🛡️ Phantoma SCAN — Tài Liệu Module Quét Chủ Động

> **Phiên bản:** 1.0.0  
> **Module:** Active Scanning & Service Discovery  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. IP & Network — Quét Mạng](#2-ip--network--quét-mạng)
- [3. Domain — Quét Tên Miền Chủ Động](#3-domain--quét-tên-miền-chủ-động)
- [4. Website — Quét Ứng Dụng Web](#4-website--quét-ứng-dụng-web)
- [5. Cơ Chế An Toàn & Giới Hạn](#5-cơ-chế-an-toàn--giới-hạn)
- [6. Luồng Dữ Liệu & API](#6-luồng-dữ-liệu--api)
- [7. Hướng Dẫn Phát Triển](#7-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **SCAN** thực hiện các kỹ thuật **active** (gửi gói tin, kết nối, yêu cầu HTTP) để phát hiện:
- Host live (ping sweep)
- Port mở (TCP SYN, UDP)
- Dịch vụ và phiên bản (service detection)
- Hệ điều hành (OS fingerprinting)
- Lỗ hổng bảo mật (Nuclei, OpenVAS, CVE check)
- Thư mục ẩn (directory fuzzing)
- Cấu hình SSL/TLS (testssl.sh)

```
SCAN/
├── SCAN.md                      ← Tài liệu này
├── index.tsx                    ← Tab container (3 target)
├── Network/                     ← Quét mạng (IP, host)
│   ├── index.tsx
│   ├── components/ (PingSweep, PortScan, OSDetect)
│   ├── types/
│   └── services/ (nmap wrapper, masscan)
├── Domain/                      ← Quét tên miền (DNS brute, zone transfer)
│   ├── index.tsx
│   └── ...
├── Website/                     ← Quét web (directory fuzz, vuln scan, SSL test)
│   ├── index.tsx
│   └── ...
└── Shared/                      (constants, utils, logging)
```

### 🎯 3 Mục Tiêu Quét Chủ Động

| # | Target | Nhóm kỹ thuật | Mô tả |
|---|--------|---------------|-------|
| 1 | **Network (IP)** | 4 | Ping sweep, port scan (TCP/UDP), service/version detection, OS fingerprinting |
| 2 | **Domain** | 2 | DNS zone transfer, DNS brute-force (subdomain active) |
| 3 | **Website** | 4 | Directory fuzzing, vulnerability scan (Nuclei), SSL/TLS test, security headers check |

> **Lưu ý:** Các kỹ thuật `subdomain enumeration` thụ động đã có trong INTEL; ở đây chỉ bổ sung brute‑force active.

---

## 2. IP & Network — Quét Mạng

### 2.1 Ping Sweep — Phát hiện Host Live

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `target` | `string` | IP hoặc CIDR (ví dụ `192.168.1.0/24`) |
| `method` | `'icmp' \| 'tcp' \| 'udp'` | ICMP echo, TCP SYN (80/443), UDP (53) |
| `timeout` | `number` | Thời gian chờ (ms) |
| `hosts` | `string[]` | Kết quả: danh sách IP phản hồi |

**Công cụ:** `fping`, `nmap -sn`.

### 2.2 Port Scan — Quét Cổng TCP/UDP

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `port` | `number` | Số cổng |
| `protocol` | `'tcp' \| 'udp'` | Giao thức |
| `state` | `'open' \| 'closed' \| 'filtered'` | Trạng thái |
| `service` | `string` | Tên dịch vụ (nếu biết) |
| `banner` | `string?` | Banner ghi nhận được (nếu có) |

**Công cụ:** `nmap -sS -sU -p-`, `masscan` cho quét nhanh.  
**Cấu hình:** Có thể chọn danh sách cổng phổ biến (top 100, top 1000) hoặc toàn bộ (1-65535) – cần cảnh báo thời gian.

### 2.3 Service & Version Detection

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `port` | `number` | Cổng tương ứng |
| `service` | `string` | Tên service (ssh, http, mysql...) |
| `version` | `string?` | Phiên bản chi tiết (ví dụ OpenSSH 7.4) |
| `cpe` | `string?` | Common Platform Enumeration (nếu có) |
| `extra` | `Record<string, any>` | Thông tin thêm (ví dụ TLS version) |

**Công cụ:** `nmap -sV --version-intensity 7`.

### 2.4 OS Fingerprinting

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `operatingSystem` | `string` | Tên OS (Linux 2.6, Windows 10...) |
| `accuracy` | `number` | Độ chính xác (%) |
| `cpe` | `string?` | CPE của OS |
| `fingerprintRaw` | `string?` | Dấu vân tay TCP/IP gốc |

**Công cụ:** `nmap -O --osscan-guess`.

---

## 3. Domain — Quét Tên Miền Chủ Động

### 3.1 DNS Zone Transfer (AXFR)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `nameserver` | `string` | Nameserver mục tiêu |
| `success` | `boolean` | Có thực hiện được zone transfer không |
| `records` | `DNSRecord[]` | Danh sách bản ghi nhận được (nếu có) |

**Công cụ:** `dig axfr @ns.target.com domain`.

### 3.2 DNS Brute‑force (Active Subdomain)

Khác với subdomain thụ động (CT logs), module này **gửi truy vấn DNS cho từng tên** trong danh sách từ điển.

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `wordlist` | `string[]` | Danh sách tiền tố (admin, mail, dev...) |
| `resolved` | `{ subdomain, ip }[]` | Các subdomain phân giải được |

**Công cụ:** `dnsrecon -d domain -D wordlist.txt -t brt`.

---

## 4. Website — Quét Ứng Dụng Web

### 4.1 Directory & File Fuzzing

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `path` | `string` | Đường dẫn phát hiện (ví dụ /admin, /backup.zip) |
| `statusCode` | `number` | HTTP status (200, 403, 301...) |
| `contentLength` | `number?` | Kích thước response |
| `redirectLocation` | `string?` | Nếu có redirect |

**Công cụ:** `ffuf`, `gobuster`, `dirb`.  
**Từ điển:** Có thể chọn common, big, hoặc tùy chỉnh.

### 4.2 Vulnerability Scan (Active)

Sử dụng **Nuclei** hoặc **OpenVAS** để dò lỗ hổng dựa trên template.

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | `string` | Tên lỗ hổng |
| `severity` | `'critical' \| 'high' \| 'medium' \| 'low' \| 'info'` | Mức độ |
| `cve` | `string?` | Mã CVE |
| `cvss` | `number?` | Điểm CVSS |
| `location` | `string` | URL hoặc tham số bị ảnh hưởng |
| `description` | `string` | Mô tả |
| `remediation` | `string?` | Cách khắc phục |
| `templateId` | `string` | ID template của Nuclei |

**Công cụ:** `nuclei -u https://target.com -t cves/ -severity critical,high`.

### 4.3 SSL/TLS Security Test

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `host` | `string` | Host:port |
| `tlsVersion` | `string[]` | Các phiên bản TLS được hỗ trợ |
| `cipherSuites` | `string[]` | Các cipher suite yếu/không an toàn |
| `heartbleed` | `boolean` | Có lỗ hổng Heartbleed không |
| `poodle` | `boolean` | Có lỗ hổng POODLE không |
| `robot` | `boolean` | Có lỗ hổng ROBOT không |
| `certificate` | `{ issuer, subject, expiry, daysLeft }` | Thông tin chứng chỉ |

**Công cụ:** `testssl.sh`, `nmap --script ssl-enum-ciphers`.

### 4.4 HTTP Security Headers (Active Check)

Gửi GET request và kiểm tra các header bảo mật:

| Header | Mô tả |
|--------|-------|
| `Strict-Transport-Security` | HSTS |
| `Content-Security-Policy` | CSP |
| `X-Frame-Options` | Chống clickjacking |
| `X-Content-Type-Options` | Chống MIME sniff |
| `Referrer-Policy` | Kiểm soát referrer |

Mỗi header được đánh giá: `present`, `missing`, `misconfigured`.

---

## 5. Cơ Chế An Toàn & Giới Hạn

### 5.1 Rate Limiting & Delay

- Tự động chèn delay giữa các request (mặc định 100ms) để tránh quá tải mục tiêu.
- Có thể cấu hình `maxRequestsPerSecond`.

### 5.2 Cảnh Báo Target

- Người dùng **phải xác nhận** target trước khi chạy active scan (checkbox "Tôi đã được ủy quyền").
- Không cho phép quét range IP lớn (>/24) nếu chưi có cấu hình đặc biệt.

### 5.3 Blacklist Internal IP

- Mặc định chặn quét các dải IP private (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) trừ khi được bật trong cấu hình "Allow internal scanning".

### 5.4 Logging & Audit

- Mỗi lần chạy SCAN đều được ghi log đầy đủ: thời gian, target, tham số, kết quả.
- Log được lưu ít nhất 30 ngày.

---

## 6. Luồng Dữ Liệu & API

```
User → SCAN UI → (xác nhận ủy quyền) → Gọi API /api/scan/{type}
   ↓
Backend: chạy nmap / nuclei / ffuf → trả về JSON
   ↓
Hiển thị kết quả, có thể xuất báo cáo (REPORT)
```

API endpoints đề xuất:
- `POST /api/scan/network/ping` (body: `{ targets, method }`)
- `POST /api/scan/network/port` (body: `{ target, ports, protocol }`)
- `POST /api/scan/network/os` (body: `{ target }`)
- `POST /api/scan/domain/zonetransfer` (body: `{ domain, nameserver }`)
- `POST /api/scan/domain/dnsbrute` (body: `{ domain, wordlist }`)
- `POST /api/scan/web/fuzz` (body: `{ url, wordlist, extensions }`)
- `POST /api/scan/web/vuln` (body: `{ url, templates }`)
- `POST /api/scan/web/ssl` (body: `{ host, port }`)
- `POST /api/scan/web/headers` (body: `{ url }`)

Tất cả API đều yêu cầu header `X-Scan-Authorization: <token>` xác nhận ủy quyền.

---

## 7. Hướng Dẫn Phát Triển

### 7.1 Quy tắc code

- **Không** gộp chung với INTEL. SCAN có thể gọi dữ liệu từ INTEL (ví dụ lấy subdomain để quét), nhưng không được chỉnh sửa dữ liệu INTEL.
- Mỗi kỹ thuật quét nên được viết dưới dạng service riêng (`nmapService.ts`, `nucleiService.ts`).
- Sử dụng `child_process` để gọi công cụ bên ngoài (nmap, ffuf) một cách an toàn (timeout, giới hạn output).
- Hỗ trợ cấu hình qua `CORE.config`: đường dẫn binary, rate limit, blacklist.

### 7.2 Các file cần có

| Thư mục | File | Mô tả |
|---------|------|-------|
| `Network/services/` | `ping.ts`, `portScan.ts`, `osDetect.ts` | Gọi nmap |
| `Domain/services/` | `zoneTransfer.ts`, `dnsBrute.ts` | Sử dụng dig, dnsrecon |
| `Website/services/` | `fuzz.ts`, `vulnScan.ts`, `sslTest.ts`, `headers.ts` | Gọi ffuf, nuclei, testssl |
| `Shared/` | `rateLimiter.ts`, `logger.ts`, `validator.ts` | Dùng chung |

### 7.3 UI Components

Mỗi mục tiêu có một tab riêng, trong đó chứa các form nhập tham số, nút "Start Scan", và bảng kết quả. Có thể có nút "Export to REPORT".

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số target** | 3 (Network, Domain, Website) |
| **Số kỹ thuật** | 10 (ping, port, service, os, zone transfer, dns brute, fuzz, vuln scan, ssl, headers) |
| **Công cụ tích hợp** | nmap, masscan, ffuf, nuclei, testssl.sh, dig, dnsrecon |
| **Cảnh báo an toàn** | Có (xác nhận ủy quyền, rate limit, blacklist internal) |

> **Phantoma SCAN v1.0.0** — *"Chủ động nhưng có trách nhiệm"* 🔍