# AlienVault OTX (Open Threat Exchange) - Tài liệu đầy đủ

AlienVault OTX là nền tảng chia sẻ thông tin tình báo mối đe dọa (threat intelligence) cộng đồng lớn nhất thế giới, với hơn 100,000 người dùng từ 140 quốc gia.

## Tính năng chính

- **Indicator Lookup** - Tra cứu IP, domain, file hash, URL để kiểm tra uy tín bảo mật
- **Pulse Intelligence** - Các pulse (tập hợp IOC) được tạo bởi chuyên gia bảo mật
- **Malware Family Detection** - Phát hiện họ malware liên quan đến indicator
- **Geolocation Data** - Thông tin vị trí địa lý của IP
- **Passive DNS** - Lịch sử DNS resolution
- **WHOIS Information** - Thông tin đăng ký domain

---

## BẢNG THAM SỐ API

### Endpoint: `POST /api/v1/alienvault/scan`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `indicator` | string | ✅ Yes | IP address, domain name, file hash, or URL |
| `indicatorType` | string | ✅ Yes | `ip`, `domain`, `hash`, or `url` |
| `apiKey` | string | ✅ Yes | AlienVault OTX API key |

### Response Structure

```json
{
  "success": true,
  "data": {
    "type": "ip",
    "value": "8.8.8.8",
    "reputation": "neutral",
    "activityCount": 1250,
    "relatedIndicators": 42,
    "geoData": {
      "country": "United States",
      "countryCode": "US",
      "city": "Mountain View",
      "latitude": 37.386,
      "longitude": -122.0838
    },
    "malwareFamilies": [],
    "industries": ["Technology"],
    "targetCountries": ["US", "GB", "DE"],
    "firstSeen": "2020-01-01",
    "lastSeen": "2024-06-10",
    "pulses": [
      {
        "id": "12345",
        "name": "Google DNS",
        "description": "Legitimate DNS service",
        "tags": ["dns", "google"]
      }
    ]
  }
}
```

---

## REPUTATION CATEGORIES

| Reputation | Mô tả | Màu sắc |
|------------|-------|---------|
| `malicious` | Đã được xác nhận là độc hại (C2, malware, phishing) | 🔴 Red |
| `suspicious` | Có dấu hiệu đáng ngờ, cần điều tra thêm | 🟠 Orange |
| `neutral` | Không có thông tin về hành vi độc hại | 🟡 Yellow |
| `unknown` | Không đủ dữ liệu để đánh giá | ⚪ Gray |

---

## CÁC LOẠI INDICATOR

### 1. IP Address (IPv4 / IPv6)
Tra cứu địa chỉ IP để kiểm tra:
- Có phải C2 server không?
- Có liên quan đến botnet?
- Vị trí địa lý và ASN

### 2. Domain Name
Tra cứu domain để kiểm tra:
- Phishing domain
- Malware distribution
- WHOIS và Passive DNS

### 3. File Hash
Hỗ trợ các loại hash:
- MD5 (32 characters)
- SHA-1 (40 characters)
- SHA-256 (64 characters)

Tra cứu hash để kiểm tra:
- Malware signature
- VirusTotal correlation
- Malware family

### 4. URL
Tra cứu URL để kiểm tra:
- Phishing pages
- Malware download URLs
- Drive-by download sites

---

## VÍ DỤ SỬ DỤNG

### Tra cứu IP
```bash
curl -X POST https://your-server/api/v1/alienvault/scan \
  -H "Content-Type: application/json" \
  -d '{"indicator":"8.8.8.8","indicatorType":"ip","apiKey":"YOUR_API_KEY"}'
```

### Tra cứu Domain
```bash
curl -X POST https://your-server/api/v1/alienvault/scan \
  -H "Content-Type: application/json" \
  -d '{"indicator":"google.com","indicatorType":"domain","apiKey":"YOUR_API_KEY"}'
```

### Tra cứu File Hash
```bash
curl -X POST https://your-server/api/v1/alienvault/scan \
  -H "Content-Type: application/json" \
  -d '{"indicator":"44d88612fea8a8f36de82e1278abb02f","indicatorType":"hash","apiKey":"YOUR_API_KEY"}'
```

---

## LƯU Ý QUAN TRỌNG

- **API Key**: Đăng ký miễn phí tại [otx.alienvault.com](https://otx.alienvault.com/) để lấy API key
- **Rate Limits**: Free tier có giới hạn 100 requests/phút
- **Privacy**: API key được lưu local trong browser, không gửi đến server ngoài request
- **Data Accuracy**: Dữ liệu được tổng hợp từ cộng đồng, có thể có false positives
- **Legal**: Chỉ sử dụng cho mục đích bảo mật hợp pháp

---

## TÀI NGUYÊN

- 🌐 Website: [otx.alienvault.com](https://otx.alienvault.com/)
- 📚 API Docs: [OTX API Documentation](https://otx.alienvault.com/api)
- 📊 Pulse Dashboard: [https://otx.alienvault.com/pulses](https://otx.alienvault.com/pulses)
- 🔍 Indicator Search: [https://otx.alienvault.com/indicator](https://otx.alienvault.com/indicator)