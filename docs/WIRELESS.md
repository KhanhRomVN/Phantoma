# 📡 Phantoma WIRELESS — Tài Liệu Module Wi‑Fi

> **Phiên bản:** 1.0.0  
> **Module:** Wireless Network Auditing & Exploitation  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Quét Mạng Wi‑Fi (Passive)](#2-quét-mạng-wi-fi-passive)
- [3. Tấn Công WEP](#3-tấn-công-wep)
- [4. Tấn Công WPA/WPA2](#4-tấn-công-wpawpa2)
- [5. Tấn Công WPS](#5-tấn-công-wps)
- [6. Evil Twin & Phishing](#6-evil-twin--phishing)
- [7. Cơ Chế An Toàn & Giới Hạn](#7-cơ-chế-an-toàn--giới-hạn)
- [8. Luồng Dữ Liệu & API](#8-luồng-dữ-liệu--api)
- [9. Hướng Dẫn Phát Triển](#9-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **WIRELESS** yêu cầu card mạng hỗ trợ chế độ **monitor** và **packet injection** (ví dụ: chipset Atheros, Ralink, Intel). Các lệnh đều được đóng gói qua công cụ `aircrack-ng`, `reaver`, `hostapd`, `dnsmasq`.

```
WIRELESS/
├── WIRELESS.md                  ← Tài liệu này
├── index.tsx                    ← Component chính
├── Scan/                        ← Quét mạng (passive)
│   ├── WiFiScan.tsx
│   └── ...
├── Attack/                      ← Các kiểu tấn công
│   ├── WEPCrack.tsx
│   ├── WPACapture.tsx
│   ├── WPSCrack.tsx
│   ├── EvilTwin.tsx
│   └── ...
├── services/                    (airodump, aireplay, reaver, hostapd wrapper)
├── types/
├── constants/
└── utils/
```

### 🎯 Các kỹ thuật chính

| # | Kỹ thuật | Mô tả | Mức độ can thiệp |
|---|----------|-------|------------------|
| 1 | WiFi Scan (passive) | Liệt kê SSID, BSSID, kênh, mã hóa, cường độ tín hiệu, clients | Thụ động |
| 2 | Deauthentication Attack | Ngắt kết nối client để bắt handshake | Chủ động |
| 3 | WEP Cracking | Thu thập IV và tìm khóa WEP (cũ) | Chủ động |
| 4 | WPA Handshake Capture | Bắt 4‑way handshake | Chủ động |
| 5 | Dictionary Attack | Bẻ mật khẩu từ handshake (aircrack/hashcat) | Chủ động (offline) |
| 6 | WPS PIN Attack (Pixie Dust) | Khai thác lỗ hổng WPS | Chủ động |
| 7 | Evil Twin AP | Tạo AP giả mạo, phishing mật khẩu | Chủ động |

---

## 2. Quét Mạng Wi‑Fi (Passive)

### 2.1 Scan cơ bản

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `ssid` | `string` | Tên mạng |
| `bssid` | `string` | MAC address của AP |
| `channel` | `number` | Kênh hoạt động |
| `encryption` | `'open' \| 'wep' \| 'wpa' \| 'wpa2' \| 'wpa3'` | Loại mã hóa |
| `signal` | `number` | Cường độ tín hiệu (dBm) |
| `wps` | `boolean` | Có hỗ trợ WPS không |
| `clients` | `string[]` | MAC của các client đang kết nối (nếu nghe được) |

**Công cụ:** `airodump-ng`, `iwlist`.  
**Component:** `Scan/WiFiScan.tsx` – hiển thị danh sách mạng dạng bảng, có thể lọc theo mã hóa, tín hiệu.

### 2.2 Scan chi tiết (với ghi file)

- Ghi lại gói tin vào file `.cap` để phân tích sau.
- Lưu ý: Ở chế độ monitor, không kết nối được Internet.

---

## 3. Tấn Công WEP

> **Lưu ý:** WEP đã lỗi thời, chỉ tồn tại trong mạng cũ hoặc thiết bị IoT giá rẻ.

### Quy trình thực hiện

1. **Bắt IV (Initialization Vectors)**: `airodump-ng -c <channel> --bssid <BSSID> -w output wlan0mon`
2. **Tăng tốc thu thập IV** bằng `aireplay-ng -3 -b <BSSID> wlan0mon` (ARP replay)
3. **Crack khóa**: `aircrack-ng output.cap`

**Kết quả trả về:**
- `success: true/false`
- `key` (hex hoặc ASCII)
- `ivsCaptured` (số IV thu được)

---

## 4. Tấn Công WPA/WPA2

### 4.1 Bắt Handshake

| Bước | Lệnh / Mô tả |
|------|---------------|
| 1 | Bắt đầu ghi: `airodump-ng -c <channel> --bssid <BSSID> -w capture wlan0mon` |
| 2 | Gửi deauth: `aireplay-ng -0 2 -a <BSSID> -c <clientMAC> wlan0mon` |
| 3 | Khi thấy `WPA handshake` trong góc trên bên phải → dừng lại |

**Output:** file `.cap` chứa handshake.

### 4.2 Dictionary Attack (Offline)

- Dùng `aircrack-ng -w wordlist.txt capture.cap`
- Hoặc chuyển đổi sang hashcat: `cap2hccapx` + `hashcat -m 2500`
- Nếu thành công → trả về mật khẩu.

**API trả về:** `{ success, password, timeElapsed, attempts }`.

### 4.3 PMKID Attack (nếu AP hỗ trợ)

- Dùng `hcxdumptool` để thu PMKID mà không cần deauth.
- Crack bằng hashcat (`-m 16800`).

---

## 5. Tấn Công WPS

Sử dụng `reaver` hoặc `bully` để brute‑force PIN WPS.

| Tham số | Giá trị |
|---------|---------|
| `bssid` | MAC của AP |
| `channel` | Kênh |
| `interface` | wlan0mon |
| `pin` | (tùy chọn) nếu biết trước |

Lệnh: `reaver -i wlan0mon -b <BSSID> -c <channel> -vv -K 1` (Pixie Dust).

**Kết quả:** `{ success, pin, password, attempts }`.

---

## 6. Evil Twin & Phishing

Tạo một Access Point giả mạo có cùng SSID với mạng đích, chặn lưu lượng và hiển thị trang đăng nhập yêu cầu mật khẩu.

### 6.1 Các bước

1. **Cấu hình hostapd** (AP giả):  
   - SSID giống mạng mục tiêu  
   - Kênh trùng với kênh thật (để cạnh tranh tín hiệu)  
2. **Cấu hình dnsmasq** (cấp IP, DNS)  
3. **Tạo trang portal** (HTML form) gửi credential về C2  
4. **Deauth client khỏi AP thật** để họ kết nối vào Evil Twin  

### 6.2 Dữ liệu thu được

| Trường | Mô tả |
|--------|-------|
| `ssid` | SSID giả mạo |
| `clientMac` | MAC của nạn nhân |
| `password` | Mật khẩu họ nhập vào |
| `timestamp` | Thời gian |

**Component:** `Attack/EvilTwin.tsx` – hướng dẫn từng bước, hiển thị log real‑time.

---

## 7. Cơ Chế An Toàn & Giới Hạn

### 7.1 Yêu cầu phần cứng

- Card mạng hỗ trợ monitor mode và packet injection (khuyến nghị: Alfa AWUS036ACH, TP‑Link TL‑WN722N v1).
- Không chạy trên máy ảo trừ khi USB‑passthrough thành công.

### 7.2 Cờ ủy quyền bắt buộc

- Mỗi lần thực hiện tấn công chủ động (deauth, evil twin) cần tick vào ô “Tôi đã được chủ sở hữu mạng ủy quyền”.
- Lưu log vào file với chữ ký người dùng.

### 7.3 Rate limiting

- `aireplay-ng -0` chỉ gửi tối đa 5 deauth mỗi giây để tránh làm sập mạng (vẫn có thể gây phiền toái).
- Evil Twin chỉ chạy tối đa 30 phút, sau đó tự động dừng.

### 7.4 Blacklist BSSID

- Người dùng có thể thêm BSSID vào danh sách đen để tránh vô tình tấn công.

---

## 8. Luồng Dữ Liệu & API

```
UI → (chọn kỹ thuật) → Gọi API /api/wireless/{technique}
   ↓
Backend: chạy script (Python hoặc shell) → stream log → kết quả JSON
   ↓
Hiển thị trực tiếp (log) và báo cáo cuối cùng
```

### Endpoints dự kiến

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/wireless/scan` | `{ interface, timeout }` | Quét mạng |
| POST | `/api/wireless/capture/handshake` | `{ bssid, channel, interface, deauthCount }` | Bắt handshake |
| POST | `/api/wireless/crack/wpa` | `{ capFile, wordlist }` | Crack handshake |
| POST | `/api/wireless/crack/wep` | `{ capFile }` | Crack WEP |
| POST | `/api/wireless/wps/pixie` | `{ bssid, channel, interface }` | Pixie Dust |
| POST | `/api/wireless/evil-twin/start` | `{ ssid, channel, interface, phishingPageUrl }` | Khởi động Evil Twin |
| DELETE | `/api/wireless/evil-twin/stop` | - | Dừng Evil Twin |

Tất cả API đều phải kèm header `X-Authorization-Wireless: <token>` và trường `authorized: true` trong body.

---

## 9. Hướng Dẫn Phát Triển

### 9.1 Kiến trúc backend

- Sử dụng `node-pty` hoặc `child_process.spawn` để chạy các lệnh `aircrack-ng`, `airodump-ng`, `reaver`.
- Ghi log real‑time qua WebSocket để hiển thị tiến độ.

### 9.2 Các service cần viết

| File | Mô tả |
|------|-------|
| `services/aircrackWrapper.ts` | Gọi aircrack-ng, parse output |
| `services/airodump.ts` | Chạy airodump, phân tích dữ liệu JSON (nếu có flag `-J`) |
| `services/reaver.ts` | Gọi reaver, capture PIN thành công |
| `services/evilTwin.ts` | Quản lý hostapd + dnsmasq, tạo portal |

### 9.3 UI Components

- **WiFiScanTable**: hiển thị danh sách mạng, có nút “Bắt Handshake”, “Pixie Dust” trên mỗi dòng.
- **HandshakeCapture**: log real‑time, hiển thị file .cap, nút “Crack”.
- **CrackDialog**: chọn wordlist, chạy, hiển thị mật khẩu nếu thành công.
- **EvilTwinWizard**: hướng dẫn từng bước, có thể upload HTML portal tùy chỉnh.

### 9.4 Cảnh báo trong UI

- Hiển thị banner đỏ “CHỈ DÙNG CHO MỤC ĐÍCH KIỂM THỬ ĐƯỢC ỦY QUYỀN” mỗi khi mở module.
- Mỗi nút tấn công đều có xác nhận lần 2.

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số kỹ thuật** | 7 (scan, WEP crack, WPA handshake, dictionary, WPS, PMKID, Evil Twin) |
| **Công cụ tích hợp** | aircrack-ng, reaver, hostapd, dnsmasq, hcxdumptool |
| **Yêu cầu phần cứng** | Card monitor mode + injection |
| **Mức độ an toàn** | Cảnh báo + ủy quyền bắt buộc + rate limit |

> **Phantoma WIRELESS v1.0.0** — *"Biết mạng lưới, chủ động kiểm soát"* 📡