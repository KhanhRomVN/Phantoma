# 🔬 Phantoma REVERSE — Tài Liệu Module Phân Tích Ngược

> **Phiên bản:** 1.0.0  
> **Module:** Reverse Engineering, Malware Analysis & Binary Reversing  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Phân Tích Tĩnh (Static Analysis)](#2-phân-tích-tĩnh-static-analysis)
- [3. Phân Tích Động (Dynamic Analysis)](#3-phân-tích-động-dynamic-analysis)
- [4. Dịch Ngược Ứng Dụng (Decompilation)](#4-dịch-ngược-ứng-dụng-decompilation)
- [5. Phân Tích Malware](#5-phân-tích-malware)
- [6. Phân Tích Shellcode](#6-phân-tích-shellcode)
- [7. Android Reverse Engineering (APK)](#7-android-reverse-engineering-apk)
- [8. Firmware Reverse Engineering](#8-firmware-reverse-engineering)
- [9. Cơ Chế An Toàn & Giới Hạn](#9-cơ-chế-an-toàn--giới-hạn)
- [10. Luồng Dữ Liệu & API](#10-luồng-dữ-liệu--api)
- [11. Hướng Dẫn Phát Triển](#11-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **REVERSE** cung cấp các công cụ để phân tích tĩnh và động các tệp nhị phân (PE, ELF, Mach-O), thư viện, firmware, và ứng dụng di động.

```
REVERSE/
├── REVERSE.md                   ← Tài liệu này
├── index.tsx                    ← Component chính
├── Static/                      ← Phân tích tĩnh
│   ├── FileIdentifier.tsx
│   ├── StringExtractor.tsx
│   ├── DisassemblerViewer.tsx
│   ├── PEViewer.tsx
│   ├── ELFViewer.tsx
│   └── ...
├── Dynamic/                     ← Phân tích động
│   ├── DebuggerSetup.tsx
│   ├── BreakpointManager.tsx
│   ├── RegisterViewer.tsx
│   ├── MemoryViewer.tsx
│   └── ...
├── Decompiler/                  ← Dịch ngược
│   ├── DecompilerSelector.tsx
│   ├── DecompileViewer.tsx
│   └── ...
├── Malware/                     ← Phân tích mã độc
│   ├── SandboxIntegration.tsx
│   ├── BehaviorReport.tsx
│   ├── IOCExtractor.tsx
│   └── ...
├── Shellcode/                   ← Shellcode analysis
│   ├── ShellcodeDisasm.tsx
│   ├── ShellcodeEmulator.tsx
│   └── ...
├── Android/                     ← APK reverse
│   ├── APKUnpacker.tsx
│   ├── JADXViewer.tsx
│   ├── SmaliEditor.tsx
│   └── ...
├── Firmware/                    ← Firmware analysis
│   ├── BinwalkExtractor.tsx
│   ├── FirmwareScanner.tsx
│   └── ...
├── services/                    (radare2, ghidra, objdump, gdb, jadx, binwalk)
├── types/
└── utils/
```

### 🎯 Các kỹ thuật chính

| # | Loại | Kỹ thuật |
|---|------|----------|
| 1 | Static Analysis | File identification, string extraction, disassembly, PE/ELF parsing |
| 2 | Dynamic Analysis | Debugging (x64dbg, gdb), breakpoints, memory inspection |
| 3 | Decompilation | Ghidra, IDA (headless), Hex-Rays (if available) |
| 4 | Malware Analysis | Sandbox, behavior analysis, IOC extraction |
| 5 | Shellcode | Disassembly, emulation (Unicorn) |
| 6 | Android | APK unpack, JADX decompile, smali editing |
| 7 | Firmware | Binwalk extraction, filesystem analysis |

---

## 2. Phân Tích Tĩnh (Static Analysis)

### 2.1 Nhận Dạng File

| Thông tin | Công cụ | Mô tả |
|-----------|---------|-------|
| File type | `file` | ELF, PE, Mach-O, shell script, archive |
| Packer detection | `detect-it-easy`, `peid` | UPX, ASPack, Themida |
| Architecture | `readelf -h` / `objdump -f` | x86, x64, ARM, MIPS |
| Compiler | `strings` + heuristics | GCC, MSVC, Clang |

**Component:** `Static/FileIdentifier.tsx` – upload file, hiển thị kết quả phân tích.

### 2.2 Trích Xuất Strings

- Tất cả chuỗi ASCII và Unicode (>= 4 ký tự).
- Lọc các chuỗi có ý nghĩa: URL, IP, file path, registry key, API call.
- Phát hiện mã hóa/base64.

**Công cụ:** `strings`, `floss` (FLARE Obfuscated String Solver).

### 2.3 Disassembler

| Công cụ | Giao diện | Tích hợp |
|---------|-----------|----------|
| `objdump` | CLI | Cơ bản, nhanh |
| `radare2` | CLI + Web UI | Mạnh, có script |
| `Ghidra` | GUI (headless có thể) | Đầy đủ, decompiler |
| `IDA Pro` | GUI | Thương mại (nếu có) |

**Component:** `Static/DisassemblerViewer.tsx` – hiển thị assembly, có syntax highlighting, tìm kiếm, comment.

### 2.4 PE (Portable Executable) Viewer (Windows)

| Section | Thông tin |
|---------|-----------|
| DOS header | e_magic, e_lfanew |
| NT headers | Machine, NumberOfSections, TimeDateStamp |
| Sections | .text, .data, .rdata, .rsrc (virtual address, raw size) |
| Imports | DLLs và hàm imported |
| Exports | Hàm exported |
| Resources | Icon, version info, manifest |

**Công cụ:** `pescan`, `pev`, `radare2`.

### 2.5 ELF Viewer (Linux)

| Section | Thông tin |
|---------|-----------|
| ELF header | Magic, class, data encoding, type (EXEC, DYN) |
| Program headers | Segments (LOAD, INTERP, DYNAMIC) |
| Section headers | .text, .rodata, .data, .bss, .plt, .got |
| Dynamic section | DT_NEEDED (shared libraries) |
| Symbol table | Exported và imported symbols |

---

## 3. Phân Tích Động (Dynamic Analysis)

### 3.1 Debugger Integration

| Nền tảng | Debugger | Giao diện |
|----------|----------|-----------|
| Windows | x64dbg, WinDbg | Tích hợp qua CLI / API |
| Linux | GDB (pwndbg, gef) | `gdb` wrapper |
| macOS | LLDB | CLI |

**Các chức năng cần hỗ trợ:**
- Set breakpoint (tại địa chỉ, hàm, symbol).
- Step into / step over.
- Xem thanh ghi (register).
- Xem stack / memory.
- Continue, stop.

**Component:** `Dynamic/DebuggerSetup.tsx` – cấu hình debugger, attach process hoặc load file.

### 3.2 Breakpoint Manager

- Quản lý breakpoint đã đặt.
- Ghi log khi breakpoint hit (giá trị thanh ghi, stack trace).

### 3.3 Memory Viewer

- Xem nội dung bộ nhớ tại địa chỉ.
- Tìm kiếm pattern (string, byte sequence).

### 3.4 API Monitor

- Hook các API quan trọng (Windows: CreateFile, WriteFile, RegOpenKey, InternetOpen).
- Ghi lại tham số và kết quả trả về.

---

## 4. Dịch Ngược Ứng Dụng (Decompilation)

### 4.1 Ghidra (Headless)

- Ghidra hỗ trợ decompile từ assembly sang C.
- Có thể chạy headless (không GUI) để xử lý batch.

**Component:** `Decompiler/DecompilerSelector.tsx` – chọn công cụ (Ghidra / IDA), upload file, hiển thị code C.

### 4.2 Các Decompiler Khác

| Decompiler | Ngôn ngữ đích | Chất lượng |
|------------|---------------|------------|
| Ghidra | C | Tốt (miễn phí) |
| IDA Pro | C | Rất tốt (thương mại) |
| Hex-Rays | C | Xuất sắc (plugin IDA) |
| RetDec | C/C++ | Trung bình (miễn phí, online) |
| Snowman | C | Trung bình |

---

## 5. Phân Tích Malware

### 5.1 Sandbox Integration (Cuckoo / CAPE)

- Gửi mẫu đến sandbox (local hoặc remote).
- Nhận báo cáo hành vi: file system, registry, network, process.

**Component:** `Malware/SandboxIntegration.tsx` – cấu hình sandbox, submit sample, hiển thị report.

### 5.2 Behavior Report (Tóm tắt)

| Hành vi | Mô tả |
|---------|-------|
| Files created | Danh sách file được tạo |
| Registry modified | Key được thay đổi |
| Network connections | IP/domain kết nối đến |
| Processes spawned | Process con |
| Persistence mechanism | Registry Run, scheduled task |

### 5.3 IOC Extraction (Indicators of Compromise)

| Loại IOC | Ví dụ |
|----------|-------|
| IP address | 192.168.1.100 |
| Domain | evil.com |
| URL | http://evil.com/payload.exe |
| File path | C:\Windows\Temp\malware.exe |
| Registry key | HKLM\Software\Microsoft\Windows\CurrentVersion\Run |
| MD5/SHA256 | Hash của mẫu |

---

## 6. Phân Tích Shellcode

### 6.1 Disassemble Shellcode

- Input: raw shellcode bytes (hex string hoặc binary).
- Output: assembly instructions.
- Xác định architecture (x86, x64, ARM) dựa trên byte pattern.

**Component:** `Shellcode/ShellcodeDisasm.tsx` – nhập hex, chọn arch, hiển thị disassembly.

### 6.2 Emulate Shellcode (Unicorn Engine)

- Chạy shellcode trong môi trường emulated (không ảnh hưởng đến host).
- Ghi lại các API call, memory access.
- Phát hiện hành vi độc hại (kết nối mạng, tạo process).

**Công cụ:** `Unicorn Engine` (Python binding, có thể gọi từ Node).

---

## 7. Android Reverse Engineering (APK)

### 7.1 APK Unpack & Decompile

| Công cụ | Mô tả |
|---------|-------|
| `apktool` | Giải nén resources, smali code |
| `jadx` | Decompile DEX sang Java |
| `dex2jar` | Chuyển DEX sang JAR (cũ) |

**Quy trình:**
1. Upload APK.
2. Dùng `apktool d` để giải nén (có thể thay đổi smali).
3. Dùng `jadx-gui` hoặc `jadx` CLI để xem code Java.

**Component:** `Android/APKUnpacker.tsx` – giải nén, hiển thị cây thư mục, có thể xem smali.

### 7.2 Smali Editor

- Smali là assembly của Dalvik/ART.
- Cho phép sửa trực tiếp logic APK (patch, bypass license).
- Rebuild bằng `apktool b` và ký lại bằng `jarsigner`.

### 7.3 Phân Tích AndroidManifest.xml

- Permissions (INTERNET, READ_CONTACTS, v.v.)
- Activities, services, receivers.
- Intent filters (deep links).

---

## 8. Firmware Reverse Engineering

### 8.1 Trích Xuất Firmware (Binwalk)

- Phát hiện các file hệ thống: squashfs, uImage, cpio, LZMA.
- Extract toàn bộ filesystem.

**Component:** `Firmware/BinwalkExtractor.tsx` – upload firmware, chạy binwalk, hiển thị kết quả.

### 8.2 Phân Tích Hệ Thống Tệp

- Tìm hardcoded credentials (`/etc/passwd`, `config.xml`).
- Tìm backdoor (telnet enable, hidden SSH key).
- Phân tích script khởi động (`/etc/init.d`, `/etc/rc.local`).

### 8.3 Firmware Emulation (QEMU)

- Emulate entire firmware để chạy và debug.
- Dùng `qemu-system-*` với rootfs đã extract.

---

## 9. Cơ Chế An Toàn & Giới Hạn

### 9.1 Yêu cầu quyền sở hữu

- Người dùng phải xác nhận "Tôi có quyền phân tích file này (sở hữu hoặc được ủy quyền)".
- Không tự động tải mẫu lên cloud sandbox nếu không có xác nhận.

### 9.2 Môi trường cách ly

- Dynamic analysis nên chạy trong VM hoặc container.
- Gợi ý người dùng dùng sandbox riêng (Cuckoo, Firecracker).

### 9.3 Giới hạn kích thước

- Mặc định không xử lý file > 500MB (có thể cấu hình).
- Cảnh báo khi phân tích file lớn.

---

## 10. Luồng Dữ Liệu & API

```
User → upload file → chọn kỹ thuật (static/dynamic/decompile)
   ↓
Backend: gọi công cụ (radare2, ghidra, jadx, binwalk)
   ↓
Parse output → JSON → hiển thị UI
```

### Endpoints dự kiến

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/reverse/identify` | `{ file }` | Nhận dạng file |
| POST | `/api/reverse/strings` | `{ file, minLength }` | Trích xuất strings |
| POST | `/api/reverse/disasm` | `{ file, arch, offset, length }` | Disassembly |
| POST | `/api/reverse/pe/info` | `{ file }` | Phân tích PE header |
| POST | `/api/reverse/decompile` | `{ file, decompiler }` | Decompile (Ghidra) |
| POST | `/api/reverse/shellcode/disasm` | `{ shellcodeHex, arch }` | Disasm shellcode |
| POST | `/api/reverse/android/apk` | `{ apkFile }` | Giải nén APK |
| POST | `/api/reverse/firmware/binwalk` | `{ firmwareFile }` | Binwalk extract |

---

## 11. Hướng Dẫn Phát Triển

### 11.1 Công Cụ Cần Cài Đặt

| Công cụ | Mục đích |
|---------|----------|
| `radare2` | Disassembly, analysis |
| `Ghidra` | Decompilation (headless) |
| `binwalk` | Firmware extraction |
| `jadx` | APK decompile |
| `apktool` | APK unpack/rebuild |
| `objdump` | Basic disassembly |
| `gdb` | Dynamic debugging (Linux) |

### 11.2 Service Wrapper

| File | Mô tả |
|------|-------|
| `services/radare2.ts` | Gọi `r2` với script, parse JSON output (`-j`) |
| `services/ghidra.ts` | Chạy Ghidra headless, lấy decompiled code |
| `services/binwalk.ts` | Gọi binwalk, parse result |
| `services/jadx.ts` | Decompile APK thành Java |

### 11.3 UI Components

- **HexViewer**: Hiển thị raw hex bytes, có thể tìm kiếm.
- **DisassemblyViewer**: Syntax highlighting cho assembly, comment, jump navigation.
- **DecompileViewer**: Hiển thị code C/Java, có thể copy.
- **APKExplorer**: Tree view resources + smali, click để xem.

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số kỹ thuật** | 7 nhóm lớn, 25+ kỹ thuật con |
| **Định dạng hỗ trợ** | PE, ELF, Mach-O, APK, firmware, shellcode |
| **Công cụ tích hợp** | radare2, Ghidra, binwalk, jadx, apktool, objdump, gdb |
| **Phân tích động** | Debugger (gdb/x64dbg), emulator (Unicorn) |
| **Sandbox** | Cuckoo/CAPE (optional) |

> **Phantoma REVERSE v1.0.0** — *"Đọc hiểu ngôn ngữ máy, vén màn bí mật nhị phân"* 🔍