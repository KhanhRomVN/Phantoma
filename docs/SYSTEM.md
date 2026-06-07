# 🌐 Phantoma SYSTEM — Tổng Quan Kiến Trúc Hệ Thống

> **Phiên bản:** 1.0.0  
> **Dự án:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  
> **Số lượng module:** 17  
> **Ngày cập nhật:** 2025-06-07  

---

## 📑 Mục Lục

- [1. Giới Thiệu](#1-giới-thiệu)
- [2. Sơ Đồ Kiến Trúc Tổng Thể](#2-sơ-đồ-kiến-trúc-tổng-thể)
- [3. Phân Loại Module](#3-phân-loại-module)
- [4. Mô Tả Từng Module](#4-mô-tả-từng-module)
- [5. Luồng Dữ Liệu & Tương Tác](#5-luồng-dữ-liệu--tương-tác)
- [6. Ma Trận Phụ Thuộc](#6-ma-trận-phụ-thuộc)
- [7. Công Nghệ & Stack](#7-công-nghệ--stack)
- [8. Lộ Trình Phát Triển](#8-lộ-trình-phát-triển)

---

## 1. Giới Thiệu

**Phantoma** là hệ sinh thái an ninh mạng tự động hóa, được thiết kế theo kiến trúc module hóa. Mỗi module đảm nhiệm một lĩnh vực chuyên biệt trong quy trình kiểm thử bảo mật, từ thu thập thông tin (OSINT) đến khai thác, hậu khai thác, và báo cáo.

### Nguyên Tắc Thiết Kế

| Nguyên tắc | Mô tả |
|------------|-------|
| **Module hóa** | Mỗi module độc lập, có thể phát triển và test riêng |
| **Phân tách Passive/Active** | Module thụ động (INTEL) không bao giờ gửi request đến target |
| **An toàn trước hết** | Mọi hành động nguy hiểm đều cần xác nhận 2 lớp |
| **CORE làm nền tảng** | Mọi module đều dùng chung CORE cho config, logging, workspace |
| **Real‑time Collaboration** | COLAB kết nối toàn bộ team trong suốt quá trình |

---

## 2. Sơ Đồ Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PHANTOMA ECOSYSTEM                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    LỚP NỀN TẢNG (Foundation)                  │  │
│  │  ┌──────────┐                                                │  │
│  │  │   CORE   │  Config • Workspace • Logging • Secrets • Notif │  │
│  │  └──────────┘                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                    │                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  LỚP CỘNG TÁC (Collaboration)                 │  │
│  │  ┌──────────┐                                                │  │
│  │  │  COLAB   │  Chat • Docs • Activity • Bot • File Share     │  │
│  │  └──────────┘                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                    │                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                LỚP CHUẨN BỊ (Preparation)                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │  │
│  │  │  INTEL   │  │  SCAN    │  │ EMULATE  │                    │  │
│  │  │ (Passive)│  │ (Active) │  │(Browser) │                    │  │
│  │  └──────────┘  └──────────┘  └──────────┘                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                    │                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 LỚP TẤN CÔNG (Offense)                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │  │
│  │  │ ATTACK   │  │ PAYLOAD  │  │   AD     │  │ WIRELESS │     │  │
│  │  │(Exploit) │  │(Malware) │  │(Domain)  │  │ (Wi‑Fi)  │     │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                    │                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               LỚP HẬU KHAI THÁC (Post‑Exploitation)           │  │
│  │  ┌──────────┐                                                │  │
│  │  │   POST   │  Privesc • Cred Dump • Lateral • Persist       │  │
│  │  └──────────┘                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                    │                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               LỚP CHUYÊN BIỆT (Specialized)                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │  │
│  │  │  CLOUD   │ │   IOT    │ │  REVERSE │ │ FORENSIC │        │  │
│  │  │(AWS/Azr) │ │(Devices) │ │ (Binary) │ │  (DFIR)  │        │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │  │
│  │  ┌──────────┐ ┌──────────┐                                   │  │
│  │  │ HARDWARE │ │  CRYPTO  │                                   │  │
│  │  │(SDR/NFC) │ │(Hash/Enc)│                                   │  │
│  │  └──────────┘ └──────────┘                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                    │                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  LỚP ĐẦU RA (Output)                          │  │
│  │  ┌──────────┐                                                │  │
│  │  │  REPORT  │  PDF • HTML • JSON • CSV • DOCX • Dashboard    │  │
│  │  └──────────┘                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phân Loại Module

### 3.1 Theo Lớp Kiến Trúc

| Lớp | Module | Vai trò |
|-----|--------|---------|
| **Foundation** | CORE | Nền tảng: config, workspace, logging, secrets, notifications |
| **Collaboration** | COLAB | Cộng tác: chat real‑time, knowledge base, activity feed |
| **Preparation** | INTEL | Tình báo thụ động (OSINT) |
| | SCAN | Quét chủ động (port, service, vuln) |
| | EMULATE | Giả lập trình duyệt, proxy, API recreation |
| **Offense** | ATTACK | Khai thác lỗ hổng (web, network, AD) |
| | PAYLOAD | Tạo mã độc, shell, AV evasion |
| | AD | Chuyên sâu Active Directory |
| | WIRELESS | Tấn công Wi‑Fi (WEP/WPA/WPS/Evil Twin) |
| **Post‑Exploitation** | POST | Leo thang, dump credential, lateral movement, persistence |
| **Specialized** | CLOUD | Đánh giá AWS/Azure/GCP/K8s |
| | IOT | Phát hiện & khai thác thiết bị IoT |
| | REVERSE | Dịch ngược binary, malware, APK, firmware |
| | FORENSIC | Pháp y số: memory, disk, log, network, timeline |
| | HARDWARE | Tấn công phần cứng: SDR, NFC, BadUSB, JTAG |
| | CRYPTO | Mật mã: hash cracking, AES/RSA, padding oracle |
| **Output** | REPORT | Xuất báo cáo, dashboard, visualization |

### 3.2 Theo Mức Độ Can Thiệp

| Mức độ | Module |
|--------|--------|
| 🟢 **Hoàn toàn thụ động** | INTEL |
| 🟡 **Chủ động nhẹ** (DNS, HTTP public) | SCAN (một phần), EMULATE |
| 🟠 **Chủ động trung bình** (port scan, dir fuzz) | SCAN, IOT (discovery) |
| 🔴 **Chủ động nguy hiểm** (exploit, privesc) | ATTACK, POST, AD, WIRELESS, HARDWARE |
| ⚫ **Offline** (phân tích, tạo payload) | PAYLOAD, CRYPTO, REVERSE, FORENSIC, REPORT |
| 🔵 **Hạ tầng** | CORE, COLAB |

---

## 4. Mô Tả Từng Module

### 4.1 CORE — ⚙️ Nền Tảng

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/CORE.md` |
| Dòng | 297 |
| Vai trò | Cung cấp config, workspace, logging, secrets vault, notifications, crypto utilities |
| Phụ thuộc | Không phụ thuộc module nào |
| Được dùng bởi | Tất cả 16 module còn lại |

### 4.2 COLAB — 🤝 Cộng Tác Nhóm

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/COLAB.md` |
| Dòng | ~400 |
| Vai trò | Chat real‑time, knowledge base Markdown, activity feed, bot, file sharing |
| Phụ thuộc | CORE |
| Được dùng bởi | Tất cả module (qua bot notification, activity log) |

### 4.3 INTEL — 🔍 Tình Báo OSINT

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/INTEL.md` |
| Dòng | 244 |
| Vai trò | Thu thập thông tin thụ động: domain, organization, person, source code, IP |
| Phụ thuộc | CORE |
| Cung cấp cho | SCAN, ATTACK, REPORT |
| Target | 5 loại (Domain, Org, Person, SourceCode, IP) — 23 nhóm dữ liệu |

### 4.4 SCAN — 🛡️ Quét Chủ Động

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/SCAN.md` |
| Dòng | 280 |
| Vai trò | Ping sweep, port scan, service/OS detection, DNS brute, dir fuzz, vuln scan (Nuclei), SSL test |
| Phụ thuộc | CORE, có thể nhận input từ INTEL |
| Cung cấp cho | ATTACK, REPORT |
| Target | 3 loại (Network, Domain, Website) — 10 kỹ thuật |

### 4.5 EMULATE — 🎭 Giả Lập Client

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/EMULATE.md` |
| Dòng | 323 |
| Vai trò | Headless browser (Playwright/Puppeteer), MITM proxy, HAR→SDK, TLS decrypt, session management |
| Phụ thuộc | CORE |
| Cung cấp cho | INTEL (crawl web), ATTACK (XSS/CSRF payload), REPORT |

### 4.6 ATTACK — 💣 Khai Thác

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/ATTACK.md` |
| Dòng | 312 |
| Vai trò | Exploit web (SQLi/XSS/LFI/SSRF), network (EternalBlue/Log4j), AD, client‑side (phishing) |
| Phụ thuộc | CORE, nhận input từ INTEL + SCAN |
| Cung cấp cho | POST (session), REPORT |

### 4.7 PAYLOAD — 💉 Tạo Mã Độc

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/PAYLOAD.md` |
| Dòng | 409 |
| Vai trò | Reverse shell, Meterpreter, web shell, VBA macro, dropper, AV evasion, persistence |
| Phụ thuộc | CORE |
| Cung cấp cho | ATTACK, POST |

### 4.8 AD — 🏢 Active Directory

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/AD.md` |
| Dòng | 316 |
| Vai trò | LDAP enum, Kerberoasting, AS‑REP, Pass‑the‑Hash, Golden/Silver Ticket, DCSync, ACL abuse, BloodHound |
| Phụ thuộc | CORE |
| Cung cấp cho | ATTACK, POST, REPORT |

### 4.9 WIRELESS — 📡 Wi‑Fi

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/WIRELESS.md` |
| Dòng | 259 |
| Vai trò | WiFi scan, WEP/WPA/WPS crack, Evil Twin, PMKID attack |
| Phụ thuộc | CORE, yêu cầu phần cứng (monitor mode) |
| Cung cấp cho | REPORT |

### 4.10 POST — 👻 Hậu Khai Thác

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/POST.md` |
| Dòng | 402 |
| Vai trò | System info, privesc (Linux/Windows), credential dump (Mimikatz, SAM, shadow), lateral movement (PsExec, WMI, PtH), persistence, cleanup |
| Phụ thuộc | CORE, nhận session từ ATTACK |
| Cung cấp cho | REPORT |

### 4.11 CLOUD — ☁️ Đám Mây

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/CLOUD.md` |
| Dòng | 307 |
| Vai trò | AWS (S3/IAM/EC2/Lambda), Azure (Blob/AAD/KeyVault), GCP (Bucket/IAM), K8s (pod/RBAC/breakout) |
| Phụ thuộc | CORE |
| Cung cấp cho | ATTACK, REPORT |

### 4.12 IOT — 📷 Internet of Things

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/IOT.md` |
| Dòng | 389 |
| Vai trò | UPnP/mDNS/ONVIF discovery, default creds, RTSP/MQTT/CoAP, firmware analysis, CVE exploit (Hikvision, Dahua) |
| Phụ thuộc | CORE, SCAN (port data) |
| Cung cấp cho | POST, REPORT |

### 4.13 REVERSE — 🔬 Dịch Ngược

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/REVERSE.md` |
| Dòng | 392 |
| Vai trò | Static/dynamic analysis, Ghidra/radare2, APK decompile (JADX), shellcode emulation (Unicorn), firmware extraction |
| Phụ thuộc | CORE |
| Cung cấp cho | FORENSIC, REPORT |

### 4.14 FORENSIC — 🔬 Pháp Y Số

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/FORENSIC.md` |
| Dòng | 399 |
| Vai trò | Memory forensics (Volatility), disk forensics (SleuthKit), file carving, log analysis, PCAP analysis, timeline (Plaso), mobile forensics |
| Phụ thuộc | CORE |
| Cung cấp cho | REPORT |

### 4.15 HARDWARE — ⚡ Phần Cứng

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/HARDWARE.md` |
| Dòng | 379 |
| Vai trò | SDR (RTL‑SDR, HackRF), NFC/RFID (Proxmark3, Mifare), BadUSB, Rowhammer, bootrom exploit (checkm8), JTAG/UART/SPI/I2C, side‑channel |
| Phụ thuộc | CORE, yêu cầu thiết bị ngoại vi |
| Cung cấp cho | REPORT |

### 4.16 CRYPTO — 🔐 Mật Mã

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/CRYPTO.md` |
| Dòng | 313 |
| Vai trò | Hash identification/cracking (hashcat, john), AES/DES/RSA attacks, padding oracle, cert parsing, CT logs |
| Phụ thuộc | CORE |
| Cung cấp cho | ATTACK (crack hash), POST (crack password), REPORT |

### 4.17 REPORT — 📄 Báo Cáo

| Thuộc tính | Giá trị |
|------------|---------|
| File | `docs/REPORT.md` |
| Dòng | 353 |
| Vai trò | Data aggregation, PDF/HTML/JSON/CSV/DOCX export, dashboard, charts, network map, risk matrix, evidence management |
| Phụ thuộc | CORE, nhận dữ liệu từ tất cả module |
| Cung cấp cho | Người dùng cuối (output) |

---

## 5. Luồng Dữ Liệu & Tương Tác

### 5.1 Luồng Pentest Chuẩn

```
                        ┌─────────────┐
                        │    START    │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │    INTEL    │  ← Thu thập thụ động (domain, IP, email, repo)
                        │  (Passive)  │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │    SCAN     │  ← Quét chủ động (port, service, vuln, dir)
                        │  (Active)   │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │   ATTACK    │  ← Khai thác lỗ hổng (SQLi, RCE, ...)
                        │  (Exploit)  │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │    POST     │  ← Hậu khai thác (privesc, lateral, persist)
                        │(Post‑Exploit)│
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │   REPORT    │  ← Tổng hợp, xuất báo cáo
                        │  (Output)   │
                        └─────────────┘
```

### 5.2 Luồng Chuyên Biệt

| Lĩnh vực | Luồng |
|----------|-------|
| **Active Directory** | INTEL → SCAN → AD (Kerberoast, DCSync) → POST (Pass‑the‑Hash) → REPORT |
| **Cloud** | INTEL → CLOUD (S3 enum, IAM analyze) → ATTACK (nếu cần) → REPORT |
| **IoT** | SCAN (IoT ports) → IOT (discovery, default creds) → POST (nếu có shell) → REPORT |
| **Wi‑Fi** | WIRELESS (scan, capture) → CRYPTO (crack handshake) → POST (nếu vào được mạng) → REPORT |
| **Malware Analysis** | PAYLOAD (tạo) / REVERSE (phân tích) → FORENSIC (phân tích hành vi) → REPORT |
| **Hardware** | HARDWARE (SDR/NFC/BadUSB) → POST (nếu lấy được access) → REPORT |

### 5.3 Luồng Cộng Tác (COLAB)

```
Tất cả module ──→ Activity Logger ──→ COLAB Activity Feed
                  (tự động ghi)

SCAN/ATTACK/REPORT ──→ Bot Engine ──→ COLAB Chat
   (sự kiện)           (trigger)       (thông báo)

Người dùng ──→ COLAB Docs ──→ Write‑up ──→ REPORT
              (soạn thảo)      (export)     (section báo cáo)
```

---

## 6. Ma Trận Phụ Thuộc

| Module | CORE | INTEL | SCAN | EMULATE | ATTACK | PAYLOAD | AD | WIRELESS | POST | CLOUD | IOT | REVERSE | FORENSIC | HARDWARE | CRYPTO | COLAB | REPORT |
|--------|------|-------|------|---------|--------|---------|----|----------|------|-------|-----|---------|----------|----------|--------|-------|--------|
| **CORE** | - | | | | | | | | | | | | | | | | |
| **COLAB** | ✓ | | | | | | | | | | | | | | | - | |
| **INTEL** | ✓ | - | | | | | | | | | | | | | | | |
| **SCAN** | ✓ | △ | - | | | | | | | | | | | | | | |
| **EMULATE** | ✓ | △ | | - | △ | | | | | | | | | | | | |
| **ATTACK** | ✓ | △ | △ | | - | △ | △ | | | | | | | | | | |
| **PAYLOAD** | ✓ | | | | | - | | | | | | | | | | | |
| **AD** | ✓ | | | | | | - | | △ | | | | | | | | |
| **WIRELESS** | ✓ | | | | | | | - | | | | | | | △ | | |
| **POST** | ✓ | | | | △ | △ | △ | | - | | | | | | △ | | |
| **CLOUD** | ✓ | | | | | | | | | - | | | | | | | |
| **IOT** | ✓ | | △ | | | | | | △ | | - | | | | | | |
| **REVERSE** | ✓ | | | | | | | | | | | - | △ | | | | |
| **FORENSIC** | ✓ | △ | | | | | | | | | | △ | - | | | | |
| **HARDWARE** | ✓ | | | | | | | | △ | | | | | - | | | |
| **CRYPTO** | ✓ | | | | | | | | | | | | | | - | | |
| **REPORT** | ✓ | △ | △ | △ | △ | △ | △ | △ | △ | △ | △ | △ | △ | △ | △ | △ | - |

> **Chú thích:**  
> ✓ = Phụ thuộc trực tiếp  
> △ = Có thể nhận input / tương tác tùy chọn  
> \- = Cùng module  

---

## 7. Công Nghệ & Stack

### 7.1 Tổng Quan Công Nghệ

| Lớp | Công nghệ |
|-----|-----------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js, Express, Python (subprocess cho tool CLI) |
| **Desktop** | Electron (cho desktop app) |
| **Real‑time** | Socket.IO (WebSocket) |
| **Database** | SQLite (local), PostgreSQL (server), IndexedDB (browser) |
| **File Storage** | Local filesystem (Electron), S3‑compatible (server) |
| **Charts** | Recharts, Chart.js, Cytoscape.js |
| **Editors** | Monaco Editor, CodeMirror |

### 7.2 Công Cụ Bên Ngoài Tích Hợp

| Module | Công cụ |
|--------|---------|
| INTEL | WHOIS, crt.sh API, Shodan API, SecurityTrails, theHarvester, Sherlock |
| SCAN | nmap, masscan, ffuf, nuclei, testssl.sh, dig, dnsrecon |
| EMULATE | Playwright, Puppeteer, mitmproxy |
| ATTACK | sqlmap, hydra, Metasploit, ysoserial, dalfox |
| PAYLOAD | msfvenom, upx, hyperion, invoke-obfuscation |
| AD | impacket, BloodHound, SharpHound, mimikatz, Rubeus |
| WIRELESS | aircrack-ng, reaver, hostapd, dnsmasq, hcxdumptool |
| POST | mimikatz, impacket, winrm, evil-winrm |
| CLOUD | AWS CLI, Azure CLI, gcloud, kubectl, kube-hunter |
| IOT | nmap, binwalk, onvif-zeep, mqtt.js |
| REVERSE | radare2, Ghidra, binwalk, jadx, apktool, objdump, gdb |
| FORENSIC | Volatility 3, SleuthKit, exiftool, tshark, Plaso |
| HARDWARE | rtl-sdr, hackrf, proxmark3, mfoc, duckencoder, checkm8 |
| CRYPTO | hashcat, john, openssl, padbuster, rsactftool, xortool |
| REPORT | puppeteer, jsPDF, docx, handlebars |

---

## 8. Lộ Trình Phát Triển

### Giai Đoạn 1: Nền Tảng (MVP)

| Ưu tiên | Module | Trạng thái |
|---------|--------|------------|
| 1 | CORE | 📝 Thiết kế xong |
| 2 | INTEL | 📝 Thiết kế xong |
| 3 | SCAN | 📝 Thiết kế xong |
| 4 | REPORT (cơ bản) | 📝 Thiết kế xong |

### Giai Đoạn 2: Tấn Công & Hậu Khai Thác

| Ưu tiên | Module | Trạng thái |
|---------|--------|------------|
| 5 | ATTACK | 📝 Thiết kế xong |
| 6 | PAYLOAD | 📝 Thiết kế xong |
| 7 | POST | 📝 Thiết kế xong |
| 8 | AD | 📝 Thiết kế xong |

### Giai Đoạn 3: Chuyên Biệt

| Ưu tiên | Module | Trạng thái |
|---------|--------|------------|
| 9 | CLOUD | 📝 Thiết kế xong |
| 10 | IOT | 📝 Thiết kế xong |
| 11 | WIRELESS | 📝 Thiết kế xong |
| 12 | CRYPTO | 📝 Thiết kế xong |
| 13 | REVERSE | 📝 Thiết kế xong |
| 14 | FORENSIC | 📝 Thiết kế xong |
| 15 | HARDWARE | 📝 Thiết kế xong |
| 16 | EMULATE | 📝 Thiết kế xong |

### Giai Đoạn 4: Cộng Tác & Hoàn Thiện

| Ưu tiên | Module | Trạng thái |
|---------|--------|------------|
| 17 | COLAB | 📝 Thiết kế xong |
| 18 | REPORT (đầy đủ) | 📝 Thiết kế xong |
| 19 | Integration Testing | ⏳ Chưa bắt đầu |
| 20 | Performance Optimization | ⏳ Chưa bắt đầu |

---

## 📊 Thống Kê Tổng Thể

| Chỉ số | Giá trị |
|--------|---------|
| **Tổng số module** | 17 |
| **Tổng số dòng tài liệu** | ~5,674 |
| **Tổng số kỹ thuật/kỹ năng** | 200+ |
| **Công cụ bên ngoài tích hợp** | 70+ |
| **API endpoints dự kiến** | 150+ |
| **Hỗ trợ nền tảng** | Windows, Linux, macOS, Web, Electron |
| **Ngôn ngữ** | TypeScript, Python, Bash, PowerShell |
| **Database schema** | 7 bảng (COLAB) + workspace JSON (CORE) |

---

> **Phantoma v1.0.0** — *"Tự động hóa toàn diện, cộng tác thời gian thực, an toàn tuyệt đối"* 🌐