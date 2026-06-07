# 👻 Phantoma POST — Tài Liệu Module Hậu Khai Thác

> **Phiên bản:** 1.0.0  
> **Module:** Post‑Exploitation, Privilege Escalation & Lateral Movement  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Thu Thập Thông Tin Hệ Thống](#2-thu-thập-thông-tin-hệ-thống)
- [3. Leo Thang Đặc Quyền (Privilege Escalation)](#3-leo-thang-đặc-quyền-privilege-escalation)
- [4. Trích Xuất Thông Tin Xác Thực (Credential Dumping)](#4-trích-xuất-thông-tin-xác-thực-credential-dumping)
- [5. Di Chuyển Ngang (Lateral Movement)](#5-di-chuyển-ngang-lateral-movement)
- [6. Duy Trì Truy Cập (Persistence)](#6-duy-trì-truy-cập-persistence)
- [7. Dọn Dấu Vết (Anti‑Forensics)](#7-dọn-dấu-vết-anti-forensics)
- [8. Cơ Chế An Toàn & Giới Hạn](#8-cơ-chế-an-toàn--giới-hạn)
- [9. Luồng Dữ Liệu & API](#9-luồng-dữ-liệu--api)
- [10. Hướng Dẫn Phát Triển](#10-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **POST** hoạt động sau khi đã có shell (hoặc Meterpreter session) trên máy mục tiêu. Nó cung cấp các công cụ để khám phá, leo thang, và mở rộng kiểm soát.

```
POST/
├── POST.md                      ← Tài liệu này
├── index.tsx                    ← Component chính
├── SystemInfo/                  ← Thu thập thông tin
│   ├── HostInfo.tsx
│   ├── NetworkInfo.tsx
│   ├── ProcessList.tsx
│   ├── UserEnum.tsx
│   └── ...
├── Privesc/                     ← Leo thang đặc quyền
│   ├── LinuxPrivesc.tsx
│   │   ├── SudoChecker.tsx
│   │   ├── SUIDChecker.tsx
│   │   ├── KernelExploitSuggester.tsx
│   │   └── ...
│   ├── WindowsPrivesc.tsx
│   │   ├── AlwaysInstallElevated.tsx
│   │   ├── UnquotedServicePath.tsx
│   │   ├── TokenManipulation.tsx
│   │   └── ...
│   └── ...
├── CredDump/                    ← Trích xuất credential
│   ├── WindowsSAM.tsx
│   ├── LSASecrets.tsx
│   ├── MimikatzWrapper.tsx
│   ├── LinuxShadow.tsx
│   ├── BrowserPasswords.tsx
│   └── ...
├── Lateral/                     ← Di chuyển ngang
│   ├── PSExec.tsx
│   ├── WMIExec.tsx
│   ├── SSHJump.tsx
│   ├── PassTheHash.tsx
│   ├── RDPHijack.tsx
│   └── ...
├── Persistence/                 ← Duy trì truy cập
│   ├── WindowsPersistence.tsx
│   ├── LinuxPersistence.tsx
│   └── ...
├── Cleanup/                     ← Dọn dấu vết
│   ├── LogCleaner.tsx
│   ├── HistoryCleaner.tsx
│   └── ...
├── services/                    (mimikatz, impacket, winrm, ssh)
├── types/
└── utils/
```

### 🎯 Các nhóm kỹ thuật chính

| # | Loại | Kỹ thuật |
|---|------|----------|
| 1 | System Info | Hostname, user, network, process, software |
| 2 | Privesc (Linux) | Sudo, SUID, cron, kernel exploit, capabilities |
| 3 | Privesc (Windows) | Token, service misconfig, AlwaysInstallElevated, SeImpersonate |
| 4 | Cred Dump | SAM, LSASS, Mimikatz, /etc/shadow, browser |
| 5 | Lateral | PsExec, WMI, Pass‑the‑Hash, RDP, SSH |
| 6 | Persistence | Registry, scheduled tasks, systemd, cron, ssh key |
| 7 | Cleanup | Log deletion, history clearing, timestomp |

---

## 2. Thu Thập Thông Tin Hệ Thống

### 2.1 Host Information

| Thông tin | Linux command | Windows command |
|-----------|---------------|-----------------|
| Hostname | `hostname` | `hostname` |
| OS version | `cat /etc/os-release` | `ver` |
| Kernel | `uname -a` | `wmic os get version` |
| Environment | `env` / `set` | `set` |
| Users | `cat /etc/passwd` | `net user` / `wmic useraccount` |

### 2.2 Network Information

| Thông tin | Linux command | Windows command |
|-----------|---------------|-----------------|
| IP config | `ip a` / `ifconfig` | `ipconfig /all` |
| Routing | `route -n` | `route print` |
| ARP table | `arp -a` | `arp -a` |
| Connections | `netstat -tunap` | `netstat -ano` |
| DNS | `cat /etc/resolv.conf` | `nslookup` |

### 2.3 Process & Service

- List running processes (PID, user, command).
- Tìm process chạy với quyền cao (root/SYSTEM).

### 2.4 Scheduled Tasks / Cron

- Linux: `crontab -l`, `/etc/crontab`, `/etc/cron.*`
- Windows: `schtasks /query /fo LIST /v`

---

## 3. Leo Thang Đặc Quyền (Privilege Escalation)

### 3.1 Linux Privesc

#### Sudo Misconfiguration

| Kỹ thuật | Kiểm tra | Khai thác |
|----------|----------|-----------|
| `sudo -l` | Liệt kê lệnh user có thể chạy với sudo | Dùng GTFOBins (ví dụ `sudo find . -exec /bin/sh \;`) |
| NOPASSWD | Không cần mật khẩu | Trực tiếp chạy lệnh |
| LD_PRELOAD | Có biến env_keep | Tạo shared library, preload |

**Component:** `Privesc/LinuxPrivesc/SudoChecker.tsx` – hiển thị kết quả `sudo -l` và đề xuất exploit.

#### SUID Binaries

- Tìm file có SUID bit: `find / -perm -4000 -type f 2>/dev/null`
- Các binary phổ biến có thể exploit: `pkexec`, `sudo`, `mount`, `umount`, `passwd`, `find`, `vim`, `bash`.

#### Kernel Exploit Suggester

- So sánh kernel version với database exploit.
- Đề xuất CVE (ví dụ DirtyCow, OverlayFS).

**Component:** `Privesc/LinuxPrivesc/KernelExploitSuggester.tsx` – nhập `uname -a`, gợi ý exploit.

#### Cron Job Abuse

- Tìm file cron writable.
- Thay thế script hoặc thêm lệnh vào crontab.

#### Capabilities

- `getcap -r / 2>/dev/null`
- Nếu có `cap_setuid+ep`, có thể leo thang.

### 3.2 Windows Privesc

#### Token Manipulation (SeImpersonate, SeAssignPrimaryToken)

- Nếu user có `SeImpersonatePrivilege` (thường có trên service), dùng `PrintSpoofer` hoặc `RoguePotato` để leo lên SYSTEM.

#### Service Misconfiguration

| Loại | Mô tả | Công cụ |
|------|-------|---------|
| Unquoted service path | Đường dẫn có khoảng trắng, không có dấu ngoặc kép | Tạo payload với tên thư mục |
| Weak service permission | User có thể sửa binary service | `sc config` |
| Auto‑start service | Khởi động khi boot | Thay binary |

**Component:** `Privesc/WindowsPrivesc/UnquotedServicePath.tsx` – quét service, đề xuất exploit.

#### AlwaysInstallElevated

- Registry key: `HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer` và `HKCU\...\Installer` set to 1.
- Tạo file `.msi` và chạy với quyền SYSTEM.

#### Scheduled Tasks với quyền cao

- `schtasks /query /fo LIST /v` → tìm task chạy với SYSTEM.
- Kiểm tra xem script có writable không.

---

## 4. Trích Xuất Thông Tin Xác Thực (Credential Dumping)

### 4.1 Windows

#### SAM (Security Account Manager)

- Dump local user hashes từ `C:\Windows\System32\config\SAM`.
- Dùng `reg save` hoặc `secretsdump.py`.

#### LSASS (Local Security Authority Subsystem Service)

- Dump process memory chứa password (plaintext nếu có WDigest, hoặc NTLM hash).
- Dùng `mimikatz.exe` `sekurlsa::logonpasswords`.

**Component:** `CredDump/MimikatzWrapper.tsx` – hướng dẫn upload mimikatz, chạy lệnh, parse output.

#### DPAPI (Data Protection API)

- Giải mã mật khẩu trình duyệt (Chrome, Edge), WiFi password, certificate.

### 4.2 Linux

#### /etc/shadow

- Nếu có quyền root, đọc file shadow → dùng hashcat crack.

#### History files

- `.bash_history`, `.zsh_history` → có thể chứa mật khẩu nhập trên command line.

#### SSH keys

- `~/.ssh/id_rsa` → private key để đăng nhập sang máy khác.

### 4.3 Browser Passwords

- Firefox: `logins.json` (mã hóa, cần master password hoặc key4.db).
- Chrome: `Login Data` (SQLite, giải mã bằng `dpapi` trên Windows, hoặc `libsecret` trên Linux).

---

## 5. Di Chuyển Ngang (Lateral Movement)

### 5.1 PsExec (Windows)

- Dùng admin share (`ADMIN$`) để copy và chạy service.
- Cần credential hoặc Pass‑the‑Hash.

**Công cụ:** `impacket-psexec`, `PsExec.exe` từ Sysinternals.

### 5.2 WMI (Windows Management Instrumentation)

- Tạo process từ xa qua WMI.
- `wmic /node:target process call create "cmd.exe /c payload.exe"`

### 5.3 WinRM (Windows Remote Management)

- Nếu WinRM enabled (port 5985/5986), dùng `winrm` hoặc `evil-winrm`.

### 5.4 Pass‑the‑Hash (PtH)

- Dùng NTLM hash để xác thực mà không cần password.
- `impacket-psexec -hashes :<hash> domain/user@target`

### 5.5 RDP Hijacking

- Nếu có quyền SYSTEM, có thể chiếm session RDP đang mở.
- `tscon <sessionID> /dest:console`

### 5.6 SSH Jump (Linux)

- Dùng private key lấy được để đăng nhập sang máy khác.
- `ssh -i id_rsa user@target`

---

## 6. Duy Trì Truy Cập (Persistence)

### 6.1 Windows Persistence

| Kỹ thuật | Độ bền vững | Dễ phát hiện |
|----------|------------|---------------|
| Registry Run key | Reboot | Trung bình |
| Scheduled Task | Reboot | Thấp |
| WMI Event Subscription | Reboot | Rất thấp (khó phát hiện) |
| Service | Reboot | Thấp |
| Startup folder | User logon | Cao |
| Bootkit | Rất cao | Rất thấp (phần cứng) |

### 6.2 Linux Persistence

| Kỹ thuật | Độ bền vững | Dễ phát hiện |
|----------|------------|---------------|
| `.bashrc` / `.profile` | User logon | Cao |
| SSH authorized_keys | Reboot | Thấp (nếu không audit) |
| Cron job | Reboot | Trung bình |
| Systemd service | Reboot | Thấp |
| LD_PRELOAD | Process start | Rất thấp |

**Component:** `Persistence/WindowsPersistence.tsx` – sinh script để thêm persistence, cung cấp hướng dẫn.

---

## 7. Dọn Dấu Vết (Anti‑Forensics)

### 7.1 Log Cleanup

| Hệ thống | Log file | Lệnh xóa |
|----------|----------|----------|
| Linux | `/var/log/auth.log`, `/var/log/syslog` | `echo '' > /var/log/auth.log` |
| Linux | Shell history | `history -c`; `rm ~/.bash_history` |
| Windows | Event Log (Security, System) | `wevtutil cl Security` |
| Windows | PowerShell history | `Clear-History` |

### 7.2 Timestomping (Thay đổi timestamp)

- Linux: `touch -t YYYYMMDDHHMM file`
- Windows: `nirsoft` hoặc `SetFileTime.exe`

### 7.3 Remove Tools

- Xóa các file exploit, payload, log đã upload.

---

## 8. Cơ Chế An Toàn & Giới Hạn

### 8.1 Yêu cầu session có sẵn

- Module POST yêu cầu một shell hoặc Meterpreter session đang hoạt động.
- Không thể chạy trực tiếp lên máy mục tiêu mà không có foothold.

### 8.2 Cảnh báo phá hoại

- Mỗi hành động (dọn log, thay đổi persistence) đều có cảnh báo "Có thể làm hỏng hệ thống hoặc xóa bằng chứng".
- Người dùng xác nhận trước khi thực hiện.

### 8.3 Logging nội bộ

- Mọi lệnh POST đều được ghi lại (để sau có thể phân tích hoặc rollback).

---

## 9. Luồng Dữ Liệu & API

```
Shell session → POST module → chọn kỹ thuật
   ↓
Backend: gửi lệnh qua session (SSH, WinRM, Meterpreter)
   ↓
Nhận output, parse → hiển thị
```

### Endpoints dự kiến (cần sessionId)

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/post/systeminfo` | `{ sessionId }` | Thu thập thông tin |
| POST | `/api/post/privesc/linux` | `{ sessionId }` | Chạy Linux privesc checker |
| POST | `/api/post/privesc/windows` | `{ sessionId }` | Chạy Windows privesc |
| POST | `/api/post/cred/sam` | `{ sessionId }` | Dump SAM |
| POST | `/api/post/cred/mimikatz` | `{ sessionId }` | Chạy mimikatz |
| POST | `/api/post/lateral/psexec` | `{ sessionId, target, user, hash, command }` | Chạy PsExec |
| POST | `/api/post/persistence/add` | `{ sessionId, technique, params }` | Thêm persistence |
| POST | `/api/post/cleanup/logs` | `{ sessionId, types[] }` | Xóa log |

---

## 10. Hướng Dẫn Phát Triển

### 10.1 Giao tiếp với session

| Loại session | Cách gửi lệnh |
|--------------|---------------|
| SSH | `ssh2` library |
| WinRM | `node-winrm` |
| Meterpreter | Metasploit RPC |
| Reverse shell raw | Gửi command qua socket |

### 10.2 Các thư viện cần dùng

| Mục đích | Thư viện |
|----------|----------|
| SSH client | `ssh2` |
| WinRM client | `winrm` |
| Impacket (Python) | Gọi script từ command line |
| Mimikatz | Upload binary, execute, parse output |

### 10.3 UI Components

- **SessionSelector**: Chọn session hiện có (từ CORE workspace).
- **PrivescReport**: Hiển thị các vector privesc, mỗi vector có nút "Exploit".
- **CredTable**: Hiển thị user/password/hash dạng bảng, có nút "Copy" và "Use to Lateral".
- **LateralForm**: Nhập target, chọn phương thức (PsExec/WMI/SSH), nút "Run".

### 10.4 Tích Hợp Với Module Khác

- **ATTACK**: Nhận session từ ATTACK sau khi khai thác thành công.
- **PAYLOAD**: Có thể tải payload xuống máy target.
- **REPORT**: Tổng hợp lại toàn bộ hành động POST.

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số kỹ thuật** | 7 nhóm lớn, 30+ kỹ thuật con |
| **Hỗ trợ nền tảng** | Windows, Linux (macOS cơ bản) |
| **Công cụ tích hợp** | Mimikatz, Impacket, WinRM, PSExec, GTFOBins, Kernel exploit suggester |
| **Phạm vi** | Hậu khai thác, sau khi đã có shell |
| **Mức độ an toàn** | Cảnh báo trước mỗi hành động nguy hiểm |

> **Phantoma POST v1.0.0** — *"Sau khi xâm nhập, làm chủ hoàn toàn"* 🕵️