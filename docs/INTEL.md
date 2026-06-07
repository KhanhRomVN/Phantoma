# 🔍 Phantoma INTEL — Tài Liệu Module Tình Báo

> **Phiên bản:** 1.0.0  
> **Module:** Intelligence & OSINT (Passive Reconnaissance)  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Domain — Tình Báo Tên Miền](#2-domain--tình-báo-tên-miền)
- [3. Organization — Tình Báo Tổ Chức](#3-organization--tình-báo-tổ-chức)
- [4. Person — Tình Báo Cá Nhân](#4-person--tình-báo-cá-nhân)
- [5. SourceCode — Tình Báo Mã Nguồn](#5-sourcecode--tình-báo-mã-nguồn)
- [6. IP — Tình Báo Địa Chỉ IP](#6-ip--tình-báo-địa-chỉ-ip)
- [7. Luồng Dữ Liệu & API](#7-luồng-dữ-liệu--api)
- [8. Hướng Dẫn Phát Triển](#8-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **INTEL** chỉ thực hiện các kỹ thuật **bị động** (không gửi gói tin trực tiếp đến mục tiêu, không quét cổng, không fuzz). Dữ liệu được thu thập từ:

- WHOIS, DNS công khai
- Certificate Transparency (crt.sh)
- Công cụ tìm kiếm (Google, Bing, Shodan)
- Kho lưu trữ công khai (GitHub, Pastebin)
- Mạng xã hội (LinkedIn, Twitter, Facebook)
- Wayback Machine, lịch sử website
- Cơ sở dữ liệu rò rỉ (HaveIBeenPwned, BreachParse)

```
INTEL/
├── INTEL.md                     ← Tài liệu này
├── index.tsx                    ← Tab container (chuyển đổi 5 target)
├── Domain/                      ← Tình báo tên miền (7 nhóm)
│   ├── index.tsx
│   ├── components/
│   ├── types/
│   ├── data/
│   ├── hooks/
│   ├── services/
│   ├── constants/
│   └── utils/
├── Organization/                ← Tình báo tổ chức (4 nhóm)
├── Person/                      ← Tình báo cá nhân (5 nhóm)
├── SourceCode/                  ← Tình báo mã nguồn (4 nhóm)
└── IP/                          ← Tình báo địa chỉ IP (3 nhóm)
```

### 🎯 5 Mục Tiêu Tình Báo (Passive)

| # | Target | Nhóm dữ liệu | Mô tả |
|---|--------|-------------|-------|
| 1 | **Domain** | 7 | Danh tính, DNS, Subdomain (thụ động), Công nghệ, Lộ thông tin, OSINT & Breach, Lịch sử web |
| 2 | **Organization** | 4 | Thông tin công ty, Tài sản số (domain/subdomain), Nhân sự, Rò rỉ tổ chức |
| 3 | **Person** | 5 | Danh tính, Liên hệ, Mạng xã hội, Dấu chân kỹ thuật, Rò rỉ cá nhân |
| 4 | **Source Code** | 4 | Repository public, Developer info, Secret exposure, Dependency |
| 5 | **IP** | 3 | GeoIP, ASN, Reverse DNS, Shodan tổng quan (không quét) |

### 🧩 Mẫu Thiết Kế Chung

Giống `RECON.md` nhưng loại bỏ các thành phần liên quan đến active scan.

### 🎨 Hệ Thống Màu Sắc

Giữ nguyên bảng màu của RECON.

---

## 2. Domain — Tình Báo Tên Miền

> **File chính:** `Domain/index.tsx`  
> **Type tổng:** `Domain/types/intel-data.ts` — Interface `IntelDomainData`

### 2.1 Domain Identity — Danh Tính Tên Miền

**Nội dung y hệt mục 2.1 của RECON.md** (WHOIS, registrar, dates, nameservers, DNSSEC, contacts).

### 2.2 DNS Data — Dữ Liệu DNS (Passive)

Chỉ lấy các bản ghi DNS công khai, **không** thực hiện zone transfer hay brute-force.

| Record | Nguồn |
|--------|-------|
| A, AAAA | DNS resolver công cộng (8.8.8.8) |
| MX, NS, TXT, SOA | Tương tự |
| CNAME, SRV, PTR | Nếu có |
| CAA | Từ DNS hoặc CT logs |

**Phân tích bảo mật DNS** (SPF, DMARC, DKIM, DNSSEC, CAA) – giống RECON.

### 2.3 Subdomain Enumeration (Thụ động)

| Trường | Kiểu | Nguồn |
|--------|------|-------|
| `name` | `string` | crt.sh, AlienVault OTX, SecurityTrails (API), DNSDB |
| `source` | `'crt.sh' \| 'alienvault' \| 'securitytrails' \| 'dnsdb'` |
| `firstSeen` | `string?` | Từ CT log |
| `resolvedIP` | `string?` | (nếu phân giải được qua DNS public) |

**Component:** `components/PassiveSubdomain.tsx` — không có trạng thái `active/inactive` vì không gửi request kiểm tra.

### 2.4 Technology Fingerprinting (Thụ động)

Phát hiện công nghệ từ các nguồn **không gửi request đến mục tiêu**:
- **Wappalyzer** (thông qua HTTP header + HTML – vẫn phải request? Thực tế đây là active nhẹ. Nếu muốn thuần passive, có thể dùng dữ liệu từ `builtwith.com` hoặc `whatcms.org` API).  
Tuy nhiên, để nhất quán, **INTEL sẽ không gửi bất kỳ request HTTP nào tới domain**. Thay vào đó, sử dụng các nguồn bên thứ ba:  
  - `builtwith.com` API (có key)  
  - `wappalyzer` dataset lưu sẵn (không thực tế)  
  - Hoặc **bỏ qua mục này**, chuyển sang `SCAN` module.  

**Khuyến nghị:** Mục Technology Fingerprinting sẽ được chuyển sang module **SCAN** (vì cần gửi HTTP request). Trong INTEL, thay bằng **"External Technology Reports"** từ BuiltWith, SecurityTrails.

### 2.5 Sensitive Exposure — Lộ Thông Tin Công Khai

| Trường | Nguồn |
|--------|-------|
| `publicS3Bucket` | Dork `site:s3.amazonaws.com "domain"` |
| `gitExposure` | Tìm kiếm GitHub: `"domain" filename:.git` |
| `envExposure` | Tìm kiếm Google dork: `"DB_PASSWORD" "domain"` |
| `apiKeys` | GitHub regex scanning |
| `jenkinsExposure` | Shodan (public data) |

### 2.6 OSINT & Breach Intelligence

- **Data Breaches**: HIBP, Leak-Lookup, Snusbase
- **Emails**: theHarvester (chỉ dùng search engine, không gửi email)
- **Social Media**: tài khoản liên quan đến domain (Twitter, LinkedIn)
- **Google Dorks**: lưu các câu query và preview snippet
- **Wayback Machine**: lịch sử snapshot
- **Certificate Transparency**: tất cả certificates của domain
- **Public Documents**: PDF, DOC, XLS từ Google dork
- **Internet Mentions**: Reddit, Hacker News, Pastebin

### 2.7 Web History — Lịch Sử Website

- **Wayback Machine**: số lượng snapshot, các thay đổi lớn
- **DNS History**: SecurityTrails DNS history

---

## 3. Organization — Tình Báo Tổ Chức

> **Dữ liệu** tương tự mục 5 của RECON.md, nhưng **chỉ sử dụng nguồn mở**:
> - Company Information: từ LinkedIn, Crunchbase, Wikipedia
> - Digital Assets: domain, subdomain, mobile app từ Google Play, App Store
> - Employee Intelligence: từ LinkedIn (không đăng nhập)
> - External Exposure: các breach liên quan đến email của tổ chức, public documents, press releases.

**Không** có phần "quét tài sản số chủ động".

---

## 4. Person — Tình Báo Cá Nhân

Giống mục 6 của RECON.md, toàn bộ từ OSINT:
- Identity: full name, alias, username
- Contact: email, phone (từ dork, pastebin)
- Social Media: tất cả nền tảng (Sherlock)
- Technical Footprint: GitHub, GitLab, StackOverflow, public keys
- Leak & Exposure: password leaks, breach database, pastebin, darkweb mentions (có thể tích hợp DeHashed).

---

## 5. SourceCode — Tình Báo Mã Nguồn

> Dựa trên mục 7 của RECON.md, nhưng **chỉ phân tích repo công khai**:

- Repository Information: public repos của tổ chức/cá nhân (GitHub API)
- Developer Information: contributors, commit emails
- Secret Exposure: quét tìm API key, token, password (regex)
- Dependency Analysis: package.json, requirements.txt, etc. (chỉ lấy version, kiểm tra CVE qua OSV hoặc NVD API – thụ động)

**Không** thực hiện:
- Quét nhánh private
- Tải toàn bộ repo về phân tích sâu (chỉ đọc metadata)

---

## 6. IP — Tình Báo Địa Chỉ IP

> **File chính:** `IP/index.tsx`  
> **Type tổng:** `IP/types/ip-intel.ts`

### 6.1 Geo & Network Information

| Trường | Nguồn |
|--------|-------|
| `ipAddress` | Input |
| `country`, `city`, `latitude`, `longitude` | MaxMind, ip-api (public) |
| `asn`, `asName`, `asOrganization` | BGP lookup, whois -h whois.radb.net |
| `isp` | ip-api |
| `reverseDns` | DNS PTR (thụ động, không gửi gói tin? vẫn là DNS request – chấp nhận vì nó là truy vấn công khai) |

### 6.2 Shodan / Censys Intelligence

Không gửi yêu cầu quét đến IP, mà dùng **dữ liệu lưu trữ sẵn** từ Shodan (có API key) để lấy:
- Số lượng cổng mở (mà không cần quét lại)
- Các dịch vụ phổ biến
- Lịch sử thay đổi

### 6.3 Reverse IP (Passive)

- Tìm các domain cùng IP qua **DNSDB** hoặc **SecurityTrails** (không gửi reverse DNS từng domain).

---

## 7. Luồng Dữ Liệu & API

Tương tự RECON.md, nhưng endpoint API gợi ý:
- `GET /api/intel/domain/{domain}`
- `GET /api/intel/org/{name}`
- `GET /api/intel/person/{identifier}`
- `GET /api/intel/sourcecode/{repo_url}`
- `GET /api/intel/ip/{ip}`

Dữ liệu trả về luôn là kết quả từ các nguồn công khai, **không** chạy bất kỳ active probe nào.

---

## 8. Hướng Dẫn Phát Triển

Quy tắc giống RECON.md, bổ sung:

- **Không được phép** import module `SCAN`, `ATTACK` vào INTEL.
- Mọi component trong INTEL **không** có nút "Rescan" hay "Active Test".
- `services/` chỉ gọi API thụ động (có thể cần API key, được quản lý qua CORE).
- Trong `utils/`, có thể có `dns-query.ts` (dùng DNS over HTTPS để tránh bị chặn).

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số target** | 5 (Domain, Organization, Person, SourceCode, IP) |
| **Tổng số nhóm dữ liệu** | 23 |
| **Tổng số components** | 50+ |
| **Phạm vi** | 100% thụ động, không gây ra bất kỳ request trực tiếp nào đến mục tiêu (trừ DNS và HTTP public – vẫn được coi là traffic thông thường). |

> **Phantoma INTEL v1.0.0** — *"Biết người biết ta, không cần động thủ"* 📡