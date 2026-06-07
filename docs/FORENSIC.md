# 🔬 Phantoma FORENSIC — Tài Liệu Module Pháp Y Số

> **Phiên bản:** 1.0.0  
> **Module:** Digital Forensics & Incident Response (DFIR)  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Phân Tích Bộ Nhớ (Memory Forensics)](#2-phân-tích-bộ-nhớ-memory-forensics)
- [3. Phân Tích Ổ Đĩa (Disk Forensics)](#3-phân-tích-ổ-đĩa-disk-forensics)
- [4. Phân Tích File & Metadata](#4-phân-tích-file--metadata)
- [5. Phân Tích Log (Log Analysis)](#5-phân-tích-log-log-analysis)
- [6. Phân Tích Mạng (Network Forensics)](#6-phân-tích-mạng-network-forensics)
- [7. Phân Tích Di Động (Mobile Forensics)](#7-phân-tích-di-động-mobile-forensics)
- [8. Timeline Analysis & Correlation](#8-timeline-analysis--correlation)
- [9. Cơ Chế An Toàn & Giới Hạn](#9-cơ-chế-an-toàn--giới-hạn)
- [10. Luồng Dữ Liệu & API](#10-luồng-dữ-liệu--api)
- [11. Hướng Dẫn Phát Triển](#11-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **FORENSIC** cung cấp các công cụ để phân tích dữ liệu từ bộ nhớ RAM, ổ cứng, file log, và lưu lượng mạng nhằm phát hiện dấu vết tấn công, khôi phục dữ liệu đã xóa, và tái tạo timeline sự cố.

```
FORENSIC/
├── FORENSIC.md                  ← Tài liệu này
├── index.tsx                    ← Component chính
├── Memory/                      ← Phân tích bộ nhớ
│   ├── DumpMemory.tsx
│   ├── VolatilityAnalysis.tsx
│   ├── ProcessList.tsx
│   ├── NetworkConnections.tsx
│   ├── MalwareHunt.tsx
│   └── ...
├── Disk/                        ← Phân tích ổ đĩa
│   ├── ImageCreation.tsx
│   ├── FileRecovery.tsx
│   ├── PartitionAnalysis.tsx
│   ├── DeletedFileRecovery.tsx
│   └── ...
├── FileAnalysis/                ← Phân tích file
│   ├── MetadataExtractor.tsx
│   ├── SignatureValidator.tsx
│   ├── EntropyChecker.tsx
│   ├── StringExtractor.tsx
│   └── ...
├── LogAnalysis/                 ← Phân tích log
│   ├── EventLogParser.tsx
│   ├── WebLogParser.tsx
│   ├── SyslogParser.tsx
│   ├── CorrelationEngine.tsx
│   └── ...
├── Network/                     ← Phân tích mạng
│   ├── PCAPParser.tsx
│   ├── FlowAnalyzer.tsx
│   ├── ProtocolDecoder.tsx
│   └── ...
├── Timeline/                    ← Timeline
│   ├── TimelineBuilder.tsx
│   ├── EventViewer.tsx
│   └── ...
├── services/                    (volatility, sleuthkit, wireshark, tshark, plaso)
├── types/
└── utils/
```

### 🎯 Các nhóm kỹ thuật chính

| # | Loại | Kỹ thuật |
|---|------|----------|
| 1 | Memory | Dump RAM, process list, network connections, injected code detection |
| 2 | Disk | Tạo image, phân vùng, phục hồi file đã xóa, carve by signature |
| 3 | File | Metadata (EXIF), magic number, entropy, strings extraction |
| 4 | Log | Event log (Windows), syslog, web log (Apache/Nginx), correlation |
| 5 | Network | PCAP analysis, flow extraction, protocol reassembly |
| 6 | Timeline | Super timeline (Plaso), event correlation |

---

## 2. Phân Tích Bộ Nhớ (Memory Forensics)

### 2.1 Dump Bộ Nhớ RAM

| Phương pháp | Nền tảng | Công cụ |
|-------------|----------|---------|
| Live dump | Windows | `winpmem`, `DumpIt`, `FTK Imager` |
| Live dump | Linux | `LiME`, `avml` |
| Virtual machine snapshot | VMware/VirtualBox | Export .vmem |

**Component:** `Memory/DumpMemory.tsx` – hướng dẫn từng bước, có thể tải file dump về.

### 2.2 Phân Tích Với Volatility

Volatility là framework phân tích memory mạnh mẽ. Các plugin chính:

| Plugin | Mô tả | Output |
|--------|-------|--------|
| `imageinfo` | Xác định profile OS | Suggested profile |
| `pslist` | Danh sách process | PID, PPID, name, offset |
| `psscan` | Tìm process ẩn (unlinked) | Tương tự pslist |
| `netscan` | Kết nối mạng | Local/remote IP, port, PID |
| `connscan` | Kết nối TCP (cũ) | Tương tự |
| `malfind` | Tìm injected code | VAD region có thể là shellcode |
| `hollowfind` | Tìm process hollowing | Suspicious process |
| `cmdline` | Command line của process | Args |
| `envars` | Biến môi trường | PATH, TEMP, etc. |
| `dlllist` | DLL loaded | Tên DLL, path |
| `ldrmodules` | Tìm DLL unlinked | Malware hiding DLL |
| `sessions` | Windows logon sessions | User, session ID |
| `registry` | Registry hives | Print key, values |
| `iehistory` | Internet Explorer history | URLs |
| `filescan` | File objects trong memory | File paths |
| `dumpfiles` | Extract file từ memory | File content |

**Component:** `Memory/VolatilityAnalysis.tsx` – chọn plugin, nhập tham số, hiển thị kết quả dạng bảng.

### 2.3 Phát Hiện Mã Độc (Malware Hunting)

| Kỹ thuật | Mô tả |
|----------|-------|
| YARA scan | Quét memory dump với rule YARA |
| PE header detection | Tìm executable trong memory |
| API hook detection | So sánh với sổ đỏ (clean memory) |
| Call stack analysis | Tìm hàm bất thường |

---

## 3. Phân Tích Ổ Đĩa (Disk Forensics)

### 3.1 Tạo Ảnh Ổ Đĩa (Disk Imaging)

| Công cụ | Định dạng | Mô tả |
|---------|-----------|-------|
| `dd` / `dcfldd` | raw (.dd) | Linux, bit-for-bit copy |
| `FTK Imager` | E01, raw | Windows GUI, có nén |
| `Guymager` | E01, raw, AFF | Linux GUI |

**Component:** `Disk/ImageCreation.tsx` – hướng dẫn tạo image, xác minh checksum (MD5/SHA1).

### 3.2 Phân Tích Phân Vùng & Hệ Thống Tệp

| Hệ thống tệp | Công cụ |
|--------------|---------|
| NTFS | `tsk_recover`, `MFT parser` |
| FAT32 | `tsk_recover` |
| ext2/3/4 | `extundelete` |
| APFS | `apfs-fuse` |

**Các thông tin cần trích xuất:**
- Master File Table (MFT) – NTFS
- Journal ($LogFile, $UsnJrnl)
- Alternate Data Streams (ADS)
- Deleted file entries
- Timestamps (MACB: Modified, Accessed, Changed, Birth)

### 3.3 Phục Hồi Tệp Đã Xóa

| Kỹ thuật | Mô tả | Công cụ |
|----------|-------|---------|
| Carving by signature | Tìm file header (PDF, JPG, ZIP) | `scalpel`, `foremost` |
| Journal replay | NTFS journal | `ntfsundelete` |
| Inode recovery | ext2/3/4 | `extundelete` |
| Raw recovery | Quét tất cả sector | `photorec` |

**Output:** Danh sách file tìm được, độ tin cậy (high/medium/low).

---

## 4. Phân Tích File & Metadata

### 4.1 Trích Xuất Metadata

| Loại file | Metadata | Công cụ |
|-----------|----------|---------|
| Image (JPG, PNG) | EXIF (GPS, camera, datetime) | `exiftool` |
| PDF | Author, creator, software, embedded files | `pdfid`, `pdf-parser` |
| Office (DOCX, XLSX) | Author, last modified, company | `olevba`, `exiftool` |
| ELF / PE | Compilation timestamp, sections, imports | `strings`, `readelf`, `pescan` |

### 4.2 Xác Thực Loại Tệp (Magic Number)

- Kiểm tra byte đầu của file so với database magic number.
- Phát hiện file giả mạo (ví dụ: .exe đổi đuôi thành .pdf).

**Công cụ:** `file` command, `libmagic`.

### 4.3 Phân Tích Entropy & Mã Hóa

- Entropy cao → có thể là mã hóa, nén, hoặc shellcode.
- Dùng `ent` hoặc `binwalk -E` để đo entropy.

### 4.4 Trích Xuất Chuỗi (Strings)

- Trích xuất chuỗi ASCII/Unicode từ file.
- Lọc các chuỗi có nghĩa (URL, IP, email, registry key).

**Công cụ:** `strings`, `floss` (FLARE Obfuscated String Solver).

---

## 5. Phân Tích Log (Log Analysis)

### 5.1 Windows Event Log

| Log | Mô tả | Event IDs quan trọng |
|-----|-------|----------------------|
| Security | Đăng nhập, thay đổi quyền | 4624 (logon), 4625 (fail), 4672 (admin) |
| System | Lỗi hệ thống, driver | 7036 (service) |
| Application | Lỗi ứng dụng | 1000 (crash) |
| PowerShell | Script execution | 4103, 4104 |

**Công cụ:** `wevtutil`, `Get-WinEvent`, `python-evtx`.

### 5.2 Web Server Log (Apache, Nginx, IIS)

| Thông tin trích xuất | Mô tả |
|---------------------|-------|
| IP tấn công | Tần suất request |
| User agent lạ | Bot, scanner |
| URL pattern | SQLi, LFI, path traversal |
| Response status | 404 (quét dir), 500 (lỗi) |

### 5.3 Syslog (Linux)

- `/var/log/auth.log` – SSH, sudo
- `/var/log/syslog` – Hệ thống
- `/var/log/kern.log` – Kernel

### 5.4 Correlation Engine

- Tự động liên kết các sự kiện từ nhiều nguồn log.
- Ví dụ: IP xuất hiện trong web log + cùng IP trong authentication log → có thể là tấn công.

**Component:** `LogAnalysis/CorrelationEngine.tsx` – xây dựng query, hiển thị kết quả gộp.

---

## 6. Phân Tích Mạng (Network Forensics)

### 6.1 Phân Tích PCAP

| Thông tin | Công cụ | Mô tả |
|-----------|---------|-------|
| Flow (5‑tuple) | `tshark -z conv,tcp` | IP, port, protocol, packets |
| HTTP objects | `tshark -Y http` | URI, user-agent, cookie |
| DNS queries | `tshark -Y dns` | Domain requested |
| TLS certificates | `tshark -Y tls.handshake` | Certificate details |
| Extraction | `tcpxtract`, `foremost` | Lấy file từ PCAP |

**Component:** `Network/PCAPParser.tsx` – upload file .pcap, hiển thị tóm tắt, cho phép lọc.

### 6.2 Phân Tích Luồng (Flow Analysis)

- **NetFlow / IPFIX**: Aggregated flow data.
- Dùng `nfdump`, `SiLK` để phân tích.

### 6.3 Tái Tạo Phiên (Session Reassembly)

- Rebuild TCP stream: `tshark -q -r file.pcap -z follow,tcp,ascii,<stream_index>`.
- Xem nội dung chat, email, file transfer.

---

## 7. Phân Tích Di Động (Mobile Forensics)

> **Giới hạn:** Module chỉ hỗ trợ các kỹ thuật không yêu cầu jailbreak/root (nếu có sẽ cảnh báo).

| Nền tảng | Kỹ thuật | Công cụ |
|----------|----------|---------|
| Android | Trích xuất backup (ADB), phân tích image (`.img`) | `android-forensics`, `sleuthkit` |
| Android | Phân tích file `.db` (contacts, SMS, call log) | `sqlite3` |
| iOS | Phân tích backup iTunes (không password) | `iLEAPP`, `libimobiledevice` |
| iOS | Logical extraction | `iOS Forensics Toolkit` |

**Output:** Danh sách contact, tin nhắn, lịch sử cuộc gọi, ứng dụng đã cài.

---

## 8. Timeline Analysis & Correlation

### 8.1 Xây Dựng Timeline (Super Timeline)

- Kết hợp dữ liệu từ: MFT, registry, event log, syslog, file metadata, network log.
- Sắp xếp theo thời gian.

**Công cụ:** `Plaso` (log2timeline), `Timesketch`.

**Component:** `Timeline/TimelineBuilder.tsx` – chọn nguồn dữ liệu, chạy, hiển thị dạng bảng + biểu đồ.

### 8.2 Tìm Điểm Bất Thường

- Phát hiện khoảng thời gian có hoạt động bất thường (nhiều event, event lạ).
- Highlight theo màu (đỏ cho critical, vàng cho warning).

---

## 9. Cơ Chế An Toàn & Giới Hạn

### 9.1 Yêu cầu quyền truy cập

- Chỉ cho phép phân tích các file/image mà người dùng upload trực tiếp.
- Không cho phép remote acquisition (trừ khi có plugin đặc biệt và được xác nhận).

### 9.2 Bảo toàn bằng chứng (Chain of Custody)

- Mỗi file/image đều tính hash (MD5, SHA1, SHA256).
- Ghi log thời gian, người phân tích, hành động đã làm.

### 9.3 Tránh làm thay đổi dữ liệu

- Luôn làm việc với bản sao (image), không bao giờ phân tích trực tiếp trên ổ gốc.
- Mount read‑only khi cần truy cập.

### 9.4 Giới hạn kích thước

- Mặc định không xử lý image > 100GB (có thể cấu hình tăng).
- Cảnh báo trước khi phân tích file lớn.

---

## 10. Luồng Dữ Liệu & API

```
User → (upload image/file) → chọn kỹ thuật
   ↓
Backend: chạy công cụ (volatility, sleuthkit, tshark, plaso)
   ↓
Parse output → JSON → hiển thị UI
   ↓
Xuất báo cáo (REPORT) hoặc lưu timeline
```

### Endpoints dự kiến

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/forensic/memory/analyze` | `{ dumpFile, plugin, profile? }` | Chạy Volatility |
| POST | `/api/forensic/disk/mount` | `{ imagePath, readonly }` | Mount image |
| POST | `/api/forensic/disk/carve` | `{ imagePath, signatures }` | Carve file |
| POST | `/api/forensic/file/metadata` | `{ filePath }` | Trích xuất metadata |
| POST | `/api/forensic/log/parse` | `{ logFile, format }` | Parse log |
| POST | `/api/forensic/network/pcap` | `{ pcapFile }` | Phân tích PCAP |
| POST | `/api/forensic/timeline/build` | `{ sources[] }` | Tạo super timeline |
| GET | `/api/forensic/timeline/view` | `{ timelineId, start, end }` | Query timeline |

---

## 11. Hướng Dẫn Phát Triển

### 11.1 Thư viện & Công cụ Cần Dùng

| Mục đích | Công cụ / Thư viện |
|----------|---------------------|
| Memory | Volatility 3 (Python) |
| Disk | SleuthKit (tsk), `libtsk` (Node.js binding) |
| File | `exiftool`, `libmagic`, `node-exiftool` |
| Log | `python-evtx`, `node-syslog-parser` |
| Network | `tshark` (Wireshark CLI), `pcap-parser` |
| Timeline | Plaso (log2timeline) |

### 11.2 Service Wrapper

| File | Mô tả |
|------|-------|
| `services/volatility.ts` | Gọi Volatility 3, parse output JSON |
| `services/sleuthkit.ts` | Mount image, đọc MFT, carve |
| `services/tshark.ts` | Gọi tshark với các bộ lọc |
| `services/plaso.ts` | Chạy log2timeline, đọc output |

### 11.3 UI Components

- **FileUploader**: Hỗ trợ drag & drop, hiển thị hash sau khi upload.
- **MemoryPluginSelector**: Danh sách plugin Volatility, có ô nhập tham số.
- **TimelineViewer**: Biểu đồ thời gian dạng Gantt, có filter theo loại event.
- **LogViewer**: Highlight cú pháp cho log, tìm kiếm, filter.

### 11.4 Tích Hợp Với Module Khác

- **INTEL**: Có thể nhận kết quả OSINT để đối chiếu (ví dụ IP xấu, domain C2).
- **REPORT**: Timeline và kết quả phân tích được xuất thành báo cáo PDF.

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số kỹ thuật** | 7 nhóm lớn, 30+ plugin/kỹ thuật con |
| **Công cụ tích hợp** | Volatility, SleuthKit, exiftool, tshark, Plaso |
| **Hỗ trợ nền tảng** | Windows, Linux, macOS (phân tích image cross‑platform) |
| **Định dạng đầu vào** | raw, E01, AFF, .pcap, .evtx, .log, .dmp |
| **Chain of custody** | Có (hash, log hành động) |

> **Phantoma FORENSIC v1.0.0** — *"Lật lại từng dấu vết, tìm ra sự thật"* 🔍