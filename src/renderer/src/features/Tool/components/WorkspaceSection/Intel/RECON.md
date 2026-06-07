# 🔍 Phantoma RECON — Tài Liệu Module Trinh Sát

> **Phiên bản:** 2.0.0  
> **Module:** Reconnaissance & OSINT Automation  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Domain — Trinh Sát Tên Miền](#2-domain--trinh-sát-tên-miền)
- [3. IPServer — Trinh Sát Máy Chủ & IP](#3-ipserver--trinh-sát-máy-chủ--ip)
- [4. Website — Trinh Sát Ứng Dụng Web](#4-website--trinh-sát-ứng-dụng-web)
- [5. Organization — Trinh Sát Tổ Chức](#5-organization--trinh-sát-tổ-chức)
- [6. Person — Trinh Sát Cá Nhân](#6-person--trinh-sát-cá-nhân)
- [7. SourceCode — Trinh Sát Mã Nguồn](#7-sourcecode--trinh-sát-mã-nguồn)
- [8. Luồng Dữ Liệu & API](#8-luồng-dữ-liệu--api)
- [9. Hướng Dẫn Phát Triển](#9-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

```
Recon/
├── RECON.md                     ← Tài liệu này
├── index.tsx                    ← Tab container (chuyển đổi 6 target)
├── Domain/                      ← Trinh sát tên miền (10 nhóm)
│   ├── index.tsx                ← Component chính DomainRecon
│   ├── components/              ← 14 component UI
│   ├── types/                   ← 11 file type definition
│   ├── data/                    ← JSON sample data
│   ├── hooks/                   ← Custom hooks (dự kiến)
│   ├── services/                ← API services (dự kiến)
│   ├── constants/               ← Hằng số cấu hình
│   └── utils/                   ← Tiện ích xử lý
├── IPServer/                    ← Trinh sát IP/Server (5 nhóm)
├── Website/                     ← Trinh sát Web App (5 nhóm)
├── Organization/                ← Trinh sát Tổ chức (4 nhóm)
├── Person/                      ← Trinh sát Cá nhân (5 nhóm)
└── SourceCode/                  ← Trinh sát Mã nguồn (6 nhóm)
```

### 🎯 6 Mục Tiêu Trinh Sát

| # | Target | Nhóm dữ liệu | Mô tả |
|---|--------|-------------|-------|
| 1 | **Domain** | 10 | Tên miền, DNS, Subdomain, Hạ tầng, Dịch vụ, Web Surface, Công nghệ, Lỗ hổng, Lộ thông tin, OSINT |
| 2 | **IP/Server** | 5 | Thông tin mạng, Port & Service, Hệ điều hành, Phân tích bảo mật, Lộ hạ tầng |
| 3 | **Website** | 5 | Cấu trúc ứng dụng, Bề mặt xác thực, Phân tích client-side, Lỗ hổng web, Công nghệ |
| 4 | **Organization** | 4 | Thông tin công ty, Tài sản số, Nhân sự, Lộ thông tin |
| 5 | **Person** | 5 | Danh tính, Liên hệ, Mạng xã hội, Dấu chân kỹ thuật, Rò rỉ dữ liệu |
| 6 | **Source Code** | 6 | Thông tin repo, Nhà phát triển, Lộ secrets, Hạ tầng, App intelligence, Phân tích dependency |

### 🧩 Mẫu Thiết Kế Chung

Mỗi folder tuân theo cấu trúc thống nhất:

| Thư mục | Vai trò |
|---------|---------|
| `types/` | TypeScript interface định nghĩa cấu trúc dữ liệu |
| `components/` | React component hiển thị từng tab |
| `data/` | JSON mẫu để preview / test |
| `hooks/` | Custom React hooks (data fetching, state) |
| `services/` | API call, xử lý dữ liệu từ backend |
| `constants/` | Bảng màu, cấu hình, enum |
| `utils/` | Helper functions (format date, parse DNS...) |

### 🎨 Hệ Thống Màu Sắc

| Mức độ | Màu | Mã Hex | Ứng dụng |
|--------|-----|--------|----------|
| **Critical** | Đỏ | `#ff2d55` | Lỗ hổng nghiêm trọng, điểm rủi ro >70 |
| **High** | Cam đỏ | `#ff6b35` | Nguy cơ cao, cần ưu tiên |
| **Medium** | Cam | `#f5a623` | Cảnh báo trung bình |
| **Low** | Xanh lá | `#30d158` | An toàn, rủi ro thấp |
| **Info** | Xám xanh | `#4a5a7a` | Thông tin tham khảo |
| **Primary** | Xanh cyan | `#0af` | Điểm nhấn chính, link, accent |
| **Secondary** | Tím | `#bf5af2` | Nhấn mạnh phụ |
| **Tertiary** | Xanh dương | `#5e5ce6` | Công nghệ, infrastructure |

---

## 2. Domain — Trinh Sát Tên Miền

> **File chính:** `Domain/index.tsx` — Component `DomainRecon`  
> **Type tổng:** `Domain/types/recon-data.ts` — Interface `ReconData`  
> **Dữ liệu mẫu:** `Domain/data/phantoma-com.json`  

### 2.1 Domain Identity — Danh Tính Tên Miền

Nhận diện và phân tích WHOIS record của tên miền.

| Trường dữ liệu | Kiểu | Mô tả |
|---------------|------|-------|
| `domainName` | `string` | Tên miền đầy đủ |
| `registrar` | `string` | Nhà đăng ký (NameCheap, GoDaddy...) |
| `registry` | `string` | Registry quản lý TLD |
| `creationDate` | `string` | Ngày tạo (ISO 8601) |
| `expirationDate` | `string` | Ngày hết hạn |
| `updatedDate` | `string` | Ngày cập nhật gần nhất |
| `domainStatus` | `string[]` | Trạng thái domain (clientTransferProhibited, autoRenewPeriod...) |
| `whoisRaw` | `string` | WHOIS raw text đầy đủ |
| `nameservers` | `string[]` | Danh sách nameserver |
| `dnssec` | `string` | Trạng thái DNSSEC |
| `tld` | `string` | Top-level domain |
| `registrant` | `WhoisContact?` | Thông tin người đăng ký |
| `adminContact` | `WhoisContact?` | Thông tin admin |
| `techContact` | `WhoisContact?` | Thông tin kỹ thuật |
| `registrarAbuseContact` | `{ email, phone }` | Liên hệ abuse |
| `registrarIanaId` | `string?` | Mã IANA của registrar |
| `whoisServer` | `string?` | WHOIS server |

**Component:** `components/Identity.tsx` — Hiển thị dạng cards + stat boxes (Domain Age, Expires In, Nameservers, Domain Status).

---

### 2.2 DNS Data — Dữ Liệu DNS

Phân tích toàn bộ DNS records của tên miền.

| Record | Kiểu | Mô tả |
|--------|------|-------|
| **A** | `string[]` | IPv4 address |
| **AAAA** | `string[]` | IPv6 address |
| **MX** | `MXRecord[]` | Mail exchange (priority + exchange) |
| **NS** | `string[]` | Name servers |
| **SOA** | `SOARecord` | Start of Authority |
| **TXT** | `string[]` | Text records (SPF, DKIM, DMARC, verification...) |
| **CNAME** | `Record<string, string>?` | Canonical name aliases |
| **SRV** | `SRVRecord[]?` | Service records |
| **PTR** | `string[]?` | Reverse DNS |
| **CAA** | `CAARecord[]?` | Certificate Authority Authorization |

**Phân tích bảo mật DNS tự động:**
- 🔐 **SPF**: Parse từ TXT → đánh giá `~all` (softfail) vs `-all` (hardfail)
- 🔐 **DMARC**: Parse từ TXT → kiểm tra policy (`p=reject`, `p=quarantine`, `p=none`)
- 🔐 **DKIM**: Phát hiện TXT chứa `_domainkey`
- 🔐 **DNSSEC**: Trạng thái ký
- 🔐 **CAA**: Certificate Authority được ủy quyền
- 🔐 **Zone Transfer**: Kiểm tra khả năng AXFR
- 🔐 **NSEC3**: Phát hiện walking protection
- 🔐 **MTA-STS**: Chính sách bảo mật email

**Component:** `components/DNS.tsx` — Grid layout 2 cột, TXT records full-width, Security Posture 4-cột.

---

### 2.3 Subdomain Enumeration — Liệt Kê Subdomain

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | `string` | Tên subdomain đầy đủ |
| `category` | `SubdomainCategory` | Phân loại (api, admin, dev, staging, vpn, mail, cdn, internal, wildcard, orphan) |
| `risk` | `SubdomainRisk` | Mức rủi ro (critical, high, medium, low, info) |
| `resolvedIP` | `string?` | IP phân giải |
| `status` | `'active' \| 'inactive' \| 'resolved'` | Trạng thái |
| `httpStatus` | `number?` | HTTP response code |
| `banner` | `string?` | Banner server |
| `tech` | `string[]?` | Công nghệ phát hiện |

**Component:** `components/Subdomain.tsx` — Stat boxes + bảng dữ liệu.

---

### 2.4 Infrastructure Mapping — Ánh Xạ Hạ Tầng

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `ipAddress` | `string?` | IPv4 chính |
| `ipv6` | `string[]?` | Danh sách IPv6 |
| `asn` | `string?` | Autonomous System Number |
| `cidrRange` | `string[]?` | Dải IP CIDR |
| `reverseIp` | `string[]?` | Reverse IP lookup |
| `hostingProvider` | `string?` | Nhà cung cấp hosting |
| `cloudProvider` | `string?` | Nhà cung cấp cloud |
| `geoLocation` | `{ country, city, latitude?, longitude? }` | Vị trí địa lý |
| `cdn` | `string?` | Content Delivery Network |
| `waf` | `string?` | Web Application Firewall |
| `reverseProxy` | `string?` | Reverse proxy |
| `loadBalancer` | `string?` | Load balancer |

**Component:** `components/Infrastructure.tsx` — Grid 2 cột, stat boxes 4 cột.

---

### 2.5 Service Enumeration — Quét Dịch Vụ

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `port` | `number` | Số port |
| `protocol` | `string?` | TCP / UDP |
| `service` | `string` | Tên dịch vụ |
| `state` | `string` | Trạng thái (open, filtered, closed) |
| `banner` | `string` | Banner response |
| `version` | `string?` | Phiên bản dịch vụ |
| `ssl` | `PortSSL?` | Thông tin SSL/TLS |
| `httpResponse` | `PortHttpResponse?` | HTTP response (nếu là HTTP) |
| `risk` | `string?` | Mức rủi ro |
| `cve` | `string[]?` | CVE liên quan |

**PortSSL:** `{ tlsVersion?, cipherSuite?, certificateIssuer?, certificateExpiry?, certificateSubject? }`  
**PortHttpResponse:** `{ statusCode?, headers?, bodyPreview? }`

**Component:** `components/Service.tsx` — Bảng ports với màu trạng thái, risk badge, CVE list.

---

### 2.6 Web Surface Discovery — Bề Mặt Web

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `website` | `string?` | URL chính |
| `loginPage` | `string?` | Trang đăng nhập |
| `adminPanel` | `string?` | Trang quản trị |
| `apiEndpoints` | `string[]?` | API endpoints |
| `graphQLEndpoint` | `string?` | GraphQL endpoint |
| `swaggerOpenAPI` | `string?` | Tài liệu API |
| `websocket` | `string?` | WebSocket endpoint |
| `uploadEndpoint` | `string?` | Upload endpoint |
| `hiddenDirectories` | `string[]?` | Thư mục ẩn |
| `robotsTxt` | `string?` | robots.txt |
| `sitemapXml` | `string?` | sitemap.xml |
| `jsFiles` | `string[]?` | JavaScript files |
| `sourceMap` | `string?` | Source map |
| `fileListing` | `string[]?` | Directory listing |
| `redirect` | `string?` | Redirect chain |
| `errorPage` | `string?` | Trang lỗi |

**Component:** `components/WebSurface.tsx` — Grid cards theo nhóm chức năng.

---

### 2.7 Technology Fingerprinting — Nhận Diện Công Nghệ

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `frontend` | `string[]` | Framework frontend |
| `backend` | `string[]` | Ngôn ngữ/framework backend |
| `database` | `string[]` | Hệ quản trị CSDL |
| `hosting` | `string[]` | Nền tảng hosting |
| `cms` | `string[]?` | Content Management System |
| `analytics` | `string[]?` | Công cụ phân tích |
| `cdn` | `string[]?` | CDN technologies |
| `runtime` | `string[]?` | Môi trường runtime |
| `tagManager` | `string[]?` | Tag manager |
| `packageLeak` | `string[]?` | Package bị lộ |

**Component:** `components/Technology.tsx` — Grid cards với tech badges.

---

### 2.8 Vulnerability Surface — Bề Mặt Lỗ Hổng

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | `string` | Tên lỗ hổng |
| `severity` | `string` | CRITICAL / HIGH / MEDIUM / LOW / INFO |
| `category` | `VulnerabilityCategory?` | Phân loại (16 loại) |
| `cve` | `string?` | Mã CVE |
| `cvss` | `number?` | Điểm CVSS (0-10) |
| `description` | `string?` | Mô tả chi tiết |
| `affectedComponent` | `string?` | Thành phần bị ảnh hưởng |
| `remediation` | `string?` | Hướng dẫn khắc phục |
| `references` | `string[]?` | Tài liệu tham khảo |

**16 loại lỗ hổng:**
`cve` | `missing-security-header` | `weak-tls` | `open-redirect` | `xss` | `sql-injection` | `ssrf` | `lfi-rfi` | `idor` | `default-credential` | `exposed-admin-panel` | `directory-traversal` | `rce-indicator` | `cors-misconfiguration` | `clickjacking` | `other`

**Component:** `components/Vulnerability.tsx` — Bảng + CVSS bar chart + severity badges.

---

### 2.9 Sensitive Exposure — Lộ Thông Tin Nhạy Cảm

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `envExposure` | `string[]?` | File .env bị lộ |
| `gitExposure` | `string[]?` | Thư mục .git bị lộ |
| `backupFiles` | `string[]?` | File backup public |
| `configFiles` | `string[]?` | File cấu hình lộ |
| `apiKeys` | `string[]?` | API keys trong source |
| `secretTokens` | `string[]?` | Token bí mật |
| `firebaseConfig` | `string?` | Cấu hình Firebase lộ |
| `publicS3Bucket` | `string?` | S3 bucket public |
| `jenkinsExposure` | `string?` | Jenkins server lộ |
| `kibanaExposure` | `string?` | Kibana dashboard lộ |
| `databaseDump` | `string?` | Database dump public |
| `logFiles` | `string[]?` | File log public |
| `sourceCodeExposure` | `string?` | Mã nguồn bị lộ |

**Component:** `components/SensitiveExposure.tsx` — Grid cards theo mức độ nghiêm trọng.

---

### 2.10 OSINT & Organization — Tình Báo Nguồn Mở

| Nhóm | Trường | Mô tả |
|------|--------|-------|
| **Data Breaches** | `breaches[]` | Lịch sử rò rỉ dữ liệu |
| **Emails** | `harvestedEmails[]` | Email thu thập được |
| **Social** | `socialIntel{}` | Tài khoản mạng xã hội (Twitter, GitHub, LinkedIn, Facebook, Instagram, Reddit, Discord) |
| **Dorks** | `googleDorks[]` | Google dork queries + kết quả |
| **Wayback** | `waybackSnapshots[]` | Ảnh chụp lịch sử website |
| **Certificates** | `certTransparency[]` | Certificate Transparency logs |
| **Employees** | `employeeData[]` | Nhân viên (tên, email, chức vụ, LinkedIn, phone) |
| **Documents** | `publicDocuments[]` | Tài liệu công khai |
| **Metadata** | `fileMetadata[]` | EXIF/metadata từ file |
| **Mobile Apps** | `mobileApps[]` | Ứng dụng di động liên quan |
| **Mentions** | `internetMentions[]` | Đề cập trên Internet (Reddit, Twitter, HN...) |

**Component:** `components/OSINT.tsx` — Grid 2 cột, breach timeline, email tags, dork list, cert transparency cards.

---

## 3. IPServer — Trinh Sát Máy Chủ & IP

> **File chính:** `IPServer/index.tsx`  
> **Type tổng:** `IPServer/types/ip-server-data.ts` — Interface `IPServerData`  

### 3.1 Network Information — Thông Tin Mạng

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `ipAddress` | `string` | Địa chỉ IP |
| `reverseDns` | `string?` | Reverse DNS (PTR) |
| `asn` | `string` | Autonomous System |
| `cidr` | `string[]` | Dải mạng CIDR |
| `geoIp` | `GeoLocation` | Vị trí địa lý |
| `isp` | `string` | Nhà cung cấp Internet |
| `latency` | `number?` | Độ trễ (ms) |
| `packetLoss` | `number?` | Tỷ lệ mất gói (%) |

**Component:** `components/NetworkInfo.tsx`

---

### 3.2 Port & Service Scan — Quét Cổng & Dịch Vụ

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `port` | `number` | Số cổng |
| `protocol` | `'tcp' \| 'udp'` | Giao thức |
| `state` | `'open' \| 'closed' \| 'filtered'` | Trạng thái |
| `service` | `string` | Tên dịch vụ |
| `banner` | `string?` | Banner |
| `version` | `string?` | Phiên bản |
| `ssl` | `PortSSL?` | Thông tin TLS |

**Component:** `components/PortService.tsx`

---

### 3.3 OS Detection — Nhận Diện Hệ Điều Hành

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `operatingSystem` | `string` | Tên OS |
| `kernelVersion` | `string?` | Phiên bản kernel |
| `architecture` | `string?` | Kiến trúc CPU |
| `hostname` | `string?` | Tên máy |
| `uptime` | `number?` | Thời gian hoạt động (giây) |

**Component:** `components/OSDetection.tsx`

---

### 3.4 Security Analysis — Phân Tích Bảo Mật

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | `string` | Tên phát hiện |
| `severity` | `Severity` | Mức độ |
| `category` | `SecurityCategory?` | Loại (cve, weak-cipher, weak-ssh-config, anonymous-ftp, smb/rdp/vnc/telnet-exposure, tls-weakness, other) |
| `cvss` | `number?` | Điểm CVSS |
| `cve` | `string?` | Mã CVE |
| `description` | `string` | Mô tả |
| `remediation` | `string?` | Cách khắc phục |
| `references` | `string[]?` | Tham khảo |

**Component:** `components/SecurityAnalysis.tsx`

---

### 3.5 Infrastructure Exposure — Lộ Hạ Tầng

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `dockerExposure` | `boolean?` | Docker API lộ |
| `kubernetesExposure` | `boolean?` | K8s API lộ |
| `redisExposure` | `boolean?` | Redis không auth |
| `elasticsearchExposure` | `boolean?` | ES không auth |
| `mongodbExposure` | `boolean?` | MongoDB không auth |
| `postgresqlExposure` | `boolean?` | PostgreSQL không auth |
| `mysqlExposure` | `boolean?` | MySQL không auth |

**Component:** `components/InfrastructureExposure.tsx`

---

## 4. Website — Trinh Sát Ứng Dụng Web

> **File chính:** `Website/index.tsx`  
> **Type tổng:** `Website/types/website-data.ts` — Interface `WebsiteData`  

### 4.1 Application Structure — Cấu Trúc Ứng Dụng

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `urlStructure` | `string[]` | Danh sách URL |
| `endpointMapping` | `{ path, method, description? }[]` | API endpoints map |
| `routeDiscovery` | `string[]` | Routes phát hiện |
| `apiDiscovery` | `string[]` | API paths |
| `hiddenPaths` | `string[]` | Đường dẫn ẩn |
| `uploadPaths` | `string[]` | Đường dẫn upload |
| `queryStringParams` | `{ url, params[] }[]?` | Tham số query string |
| `formDiscovery` | `{ url, action?, method?, fields[] }[]?` | Form phát hiện |

**Component:** `components/WebAppStructure.tsx`

---

### 4.2 Authentication Surface — Bề Mặt Xác Thực

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `loginPage` | `string` | Trang đăng nhập |
| `registerPage` | `string?` | Trang đăng ký |
| `passwordReset` | `string?` | Trang reset mật khẩu |
| `oauth` | `{ provider, url }[]?` | OAuth providers |
| `sso` | `string?` | Single Sign-On |
| `sessionCookie` | `{ name, httpOnly?, secure? }?` | Cookie phiên |
| `jwt` | `boolean?` | Sử dụng JWT |
| `mfa` | `boolean?` | Multi-Factor Auth |

**Component:** `components/AuthSurface.tsx`

---

### 4.3 Client-Side Analysis — Phân Tích Phía Client

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `jsFiles` | `string[]` | File JavaScript |
| `sourceMap` | `string[]?` | Source maps |
| `apiCalls` | `string[]` | API calls trong JS |
| `localStorage` | `string[]` | Dữ liệu localStorage |
| `sessionStorage` | `string[]` | Dữ liệu sessionStorage |
| `websocket` | `string?` | WebSocket endpoints |
| `csp` | `string` | Content Security Policy |

**Component:** `components/ClientSide.tsx`

---

### 4.4 Vulnerability Surface — Bề Mặt Lỗ Hổng Web

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | `string` | Tên lỗ hổng |
| `severity` | `Severity` | Mức độ |
| `category` | `WebVulnCategory?` | Loại (xss, sqli, csrf, ssrf, idor, file-upload, open-redirect, business-logic, missing-security-header, exposed-debug, clickjacking, cors, other) |
| `cvss` | `number?` | Điểm CVSS |
| `cve` | `string?` | Mã CVE |
| `description` | `string` | Mô tả |
| `location` | `string` | Vị trí phát hiện |
| `remediation` | `string?` | Cách khắc phục |
| `references` | `string[]?` | Tham khảo |

**Component:** `components/WebVulnerability.tsx`

---

### 4.5 Technology Detection — Nhận Diện Công Nghệ Web

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `frontendFramework` | `string[]` | Framework frontend |
| `backendFramework` | `string[]` | Framework backend |
| `cms` | `string[]?` | CMS |
| `webServer` | `string[]` | Web server |
| `runtime` | `string[]` | Runtime |
| `cdn` | `string[]` | CDN |
| `waf` | `string[]` | WAF |

**Component:** `components/TechnologyDetection.tsx`

---

## 5. Organization — Trinh Sát Tổ Chức

> **File chính:** `Organization/index.tsx`  
> **Type tổng:** `Organization/types/organization-data.ts` — Interface `OrganizationData`  

### 5.1 Company Information — Thông Tin Công Ty

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `companyName` | `string` | Tên công ty |
| `legalName` | `string?` | Tên pháp lý |
| `address` | `string?` | Địa chỉ |
| `phoneNumber` | `string?` | Số điện thoại |
| `email` | `string?` | Email liên hệ |
| `industry` | `string?` | Ngành nghề |
| `subsidiaries` | `string[]?` | Công ty con |

**Component:** `components/CompanyInfo.tsx`

---

### 5.2 Digital Assets — Tài Sản Số

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `type` | `AssetType` | Loại (domain, subdomain, mobileApp, cloudAsset, githubOrg, publicRepo) |
| `name` | `string` | Tên tài sản |
| `url` | `string?` | URL |
| `visibility` | `string?` | Phạm vi |
| `risk` | `string?` | Mức rủi ro |

**Component:** `components/DigitalAssets.tsx`

---

### 5.3 Employee Intelligence — Tình Báo Nhân Sự

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | `string` | Họ tên |
| `title` | `string?` | Chức danh |
| `email` | `string?` | Email |
| `linkedin` | `string?` | LinkedIn profile |
| `department` | `string?` | Phòng ban |

**Component:** `components/EmployeeIntel.tsx`

---

### 5.4 External Exposure — Lộ Thông Tin Ra Bên Ngoài

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `dataBreach` | `Breach[]?` | Rò rỉ dữ liệu |
| `credentialLeak` | `CredLeak[]?` | Lộ credentials |
| `publicDocuments` | `string[]?` | Tài liệu công khai |
| `pdfMetadata` | `PdfMetadata[]?` | Metadata từ PDF |
| `pressReleases` | `string[]?` | Thông cáo báo chí |
| `conferenceTalks` | `string[]?` | Bài nói tại hội thảo |

**Component:** `components/ExternalExposure.tsx`

---

## 6. Person — Trinh Sát Cá Nhân

> **File chính:** `Person/index.tsx`  
> **Type tổng:** `Person/types/person-data.ts` — Interface `PersonData`  

### 6.1 Identity Information — Thông Tin Danh Tính

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `fullName` | `string` | Họ tên đầy đủ |
| `alias` | `string[]?` | Bí danh |
| `username` | `string[]?` | Username |
| `nickname` | `string?` | Biệt danh |
| `avatar` | `string?` | URL avatar |
| `possibleRealNames` | `string[]?` | Tên thật khả dĩ |
| `estimatedAge` | `string?` | Tuổi ước tính |
| `gender` | `string?` | Giới tính |
| `nationality` | `string?` | Quốc tịch |
| `language` | `string[]?` | Ngôn ngữ |
| `notes` | `string?` | Ghi chú |

**Component:** `components/PersonIdentity.tsx`

---

### 6.2 Contact Information — Thông Tin Liên Hệ

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `email` | `string[]?` | Địa chỉ email |
| `phoneNumber` | `string[]?` | Số điện thoại |
| `address` | `string?` | Địa chỉ |
| `messengerAccounts` | `{ platform, username }[]?` | Tài khoản messenger |

**Component:** `components/ContactInfo.tsx`

---

### 6.3 Social Media — Mạng Xã Hội

| Nền tảng | Trường |
|----------|--------|
| Facebook | `facebook?` |
| X/Twitter | `twitter?` |
| Instagram | `instagram?` |
| LinkedIn | `linkedin?` |
| TikTok | `tiktok?` |
| Reddit | `reddit?` |
| Discord | `discord?` |
| GitHub | `github?` |
| YouTube | `youtube?` |
| Telegram | `telegram?` |

**Component:** `components/SocialMedia.tsx`

---

### 6.4 Technical Footprint — Dấu Chân Kỹ Thuật

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `github` | `string?` | GitHub profile |
| `gitlab` | `string?` | GitLab profile |
| `stackoverflow` | `string?` | StackOverflow |
| `publicKeys` | `string[]?` | Public keys |
| `domainOwnership` | `string[]?` | Tên miền sở h<thinking>
Pass 1 (Plan): The user wants me to recreate the RECON.md file in Vietnamese with:
- More detailed content
- Beautiful, elegant UI description
- Complete features
- Detailed documentation
- Full information

I need to create a comprehensive Vietnamese documentation file that covers all 6 recon targets, their sub-groups, all the types, components, data flow, and usage. This should be a polished, professional document.

I should base this on:
1. The current RECON.md structure (but expand it)
2. All the types I've read and modified
3. All the components
4. The actual implementation details from the code

Let me write a comprehensive document covering:
- Overview of the RECON module
- Architecture
- Each target with all sub-groups
- Data types
- Components
- Sample data
- Usage guide

Pass 2 (Verify): I'll use write_to_file since this is a complete rewrite. No markdown in tool turn.
</thinking>
<write_to_file><file_path>src/renderer/src/features/Tool/components/WorkspaceSection/Recon/RECON.md</file_path><content>
# 🔍 Phantoma RECON — Tài Liệu Module Trinh Sát

> **Phiên bản:** 2.0.0  
> **Module:** Reconnaissance & OSINT Automation  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Domain — Trinh Sát Tên Miền](#2-domain--trinh-sát-tên-miền)
- [3. IPServer — Trinh Sát Máy Chủ & IP](#3-ipserver--trinh-sát-máy-chủ--ip)
- [4. Website — Trinh Sát Ứng Dụng Web](#4-website--trinh-sát-ứng-dụng-web)
- [5. Organization — Trinh Sát Tổ Chức](#5-organization--trinh-sát-tổ-chức)
- [6. Person — Trinh Sát Cá Nhân](#6-person--trinh-sát-cá-nhân)
- [7. SourceCode — Trinh Sát Mã Nguồn](#7-sourcecode--trinh-sát-mã-nguồn)
- [8. Luồng Dữ Liệu & API](#8-luồng-dữ-liệu--api)
- [9. Hướng Dẫn Phát Triển](#9-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

```
Recon/
├── RECON.md                     ← Tài liệu này
├── index.tsx                    ← Tab container (chuyển đổi 6 target)
├── Domain/                      ← Trinh sát tên miền (10 nhóm)
│   ├── index.tsx                ← Component chính DomainRecon
│   ├── components/              ← 14 component UI
│   ├── types/                   ← 11 file type definition
│   ├── data/                    ← JSON sample data
│   ├── hooks/                   ← Custom hooks (dự kiến)
│   ├── services/                ← API services (dự kiến)
│   ├── constants/               ← Hằng số cấu hình
│   └── utils/                   ← Tiện ích xử lý
├── IPServer/                    ← Trinh sát IP/Server (5 nhóm)
├── Website/                     ← Trinh sát Web App (5 nhóm)
├── Organization/                ← Trinh sát Tổ chức (4 nhóm)
├── Person/                      ← Trinh sát Cá nhân (5 nhóm)
└── SourceCode/                  ← Trinh sát Mã nguồn (6 nhóm)
```

### 🎯 6 Mục Tiêu Trinh Sát

| # | Target | Nhóm dữ liệu | Mô tả |
|---|--------|-------------|-------|
| 1 | **Domain** | 10 | Tên miền, DNS, Subdomain, Hạ tầng, Dịch vụ, Web Surface, Công nghệ, Lỗ hổng, Lộ thông tin, OSINT |
| 2 | **IP/Server** | 5 | Thông tin mạng, Port & Service, Hệ điều hành, Phân tích bảo mật, Lộ hạ tầng |
| 3 | **Website** | 5 | Cấu trúc ứng dụng, Bề mặt xác thực, Phân tích client-side, Lỗ hổng web, Công nghệ |
| 4 | **Organization** | 4 | Thông tin công ty, Tài sản số, Nhân sự, Lộ thông tin |
| 5 | **Person** | 5 | Danh tính, Liên hệ, Mạng xã hội, Dấu chân kỹ thuật, Rò rỉ dữ liệu |
| 6 | **Source Code** | 6 | Thông tin repo, Nhà phát triển, Lộ secrets, Hạ tầng, App intelligence, Phân tích dependency |

### 🧩 Mẫu Thiết Kế Chung

Mỗi folder tuân theo cấu trúc thống nhất:

| Thư mục | Vai trò |
|---------|---------|
| `types/` | TypeScript interface định nghĩa cấu trúc dữ liệu |
| `components/` | React component hiển thị từng tab |
| `data/` | JSON mẫu để preview / test |
| `hooks/` | Custom React hooks (data fetching, state) |
| `services/` | API call, xử lý dữ liệu từ backend |
| `constants/` | Bảng màu, cấu hình, enum |
| `utils/` | Helper functions (format date, parse DNS...) |

### 🎨 Hệ Thống Màu Sắc

| Mức độ | Màu | Mã Hex | Ứng dụng |
|--------|-----|--------|----------|
| **Critical** | Đỏ | `#ff2d55` | Lỗ hổng nghiêm trọng, điểm rủi ro >70 |
| **High** | Cam đỏ | `#ff6b35` | Nguy cơ cao, cần ưu tiên |
| **Medium** | Cam | `#f5a623` | Cảnh báo trung bình |
| **Low** | Xanh lá | `#30d158` | An toàn, rủi ro thấp |
| **Info** | Xám xanh | `#4a5a7a` | Thông tin tham khảo |
| **Primary** | Xanh cyan | `#0af` | Điểm nhấn chính, link, accent |
| **Secondary** | Tím | `#bf5af2` | Nhấn mạnh phụ |
| **Tertiary** | Xanh dương | `#5e5ce6` | Công nghệ, infrastructure |

---

## 2. Domain — Trinh Sát Tên Miền

> **File chính:** `Domain/index.tsx` — Component `DomainRecon`  
> **Type tổng:** `Domain/types/recon-data.ts` — Interface `ReconData`  
> **Dữ liệu mẫu:** `Domain/data/phantoma-com.json`  

### 2.1 Domain Identity — Danh Tính Tên Miền

Nhận diện và phân tích WHOIS record của tên miền.

| Trường dữ liệu | Kiểu | Mô tả |
|---------------|------|-------|
| `domainName` | `string` | Tên miền đầy đủ |
| `registrar` | `string` | Nhà đăng ký (NameCheap, GoDaddy...) |
| `registry` | `string` | Registry quản lý TLD |
| `creationDate` | `string` | Ngày tạo (ISO 8601) |
| `expirationDate` | `string` | Ngày hết hạn |
| `updatedDate` | `string` | Ngày cập nhật gần nhất |
| `domainStatus` | `string[]` | Trạng thái domain (clientTransferProhibited, autoRenewPeriod...) |
| `whoisRaw` | `string` | WHOIS raw text đầy đủ |
| `nameservers` | `string[]` | Danh sách nameserver |
| `dnssec` | `string` | Trạng thái DNSSEC |
| `tld` | `string` | Top-level domain |
| `registrant` | `WhoisContact?` | Thông tin người đăng ký |
| `adminContact` | `WhoisContact?` | Thông tin admin |
| `techContact` | `WhoisContact?` | Thông tin kỹ thuật |
| `registrarAbuseContact` | `{ email, phone }` | Liên hệ abuse |
| `registrarIanaId` | `string?` | Mã IANA của registrar |
| `whoisServer` | `string?` | WHOIS server |

**Component:** `components/Identity.tsx` — Hiển thị dạng cards + stat boxes (Domain Age, Expires In, Nameservers, Domain Status).

---

### 2.2 DNS Data — Dữ Liệu DNS

Phân tích toàn bộ DNS records của tên miền.

| Record | Kiểu | Mô tả |
|--------|------|-------|
| **A** | `string[]` | IPv4 address |
| **AAAA** | `string[]` | IPv6 address |
| **MX** | `MXRecord[]` | Mail exchange (priority + exchange) |
| **NS** | `string[]` | Name servers |
| **SOA** | `SOARecord` | Start of Authority |
| **TXT** | `string[]` | Text records (SPF, DKIM, DMARC, verification...) |
| **CNAME** | `Record<string, string>?` | Canonical name aliases |
| **SRV** | `SRVRecord[]?` | Service records |
| **PTR** | `string[]?` | Reverse DNS |
| **CAA** | `CAARecord[]?` | Certificate Authority Authorization |

**Phân tích bảo mật DNS tự động:**
- 🔐 **SPF**: Parse từ TXT → đánh giá `~all` (softfail) vs `-all` (hardfail)
- 🔐 **DMARC**: Parse từ TXT → kiểm tra policy (`p=reject`, `p=quarantine`, `p=none`)
- 🔐 **DKIM**: Phát hiện TXT chứa `_domainkey`
- 🔐 **DNSSEC**: Trạng thái ký
- 🔐 **CAA**: Certificate Authority được ủy quyền
- 🔐 **Zone Transfer**: Kiểm tra khả năng AXFR
- 🔐 **NSEC3**: Phát hiện walking protection
- 🔐 **MTA-STS**: Chính sách bảo mật email

**Component:** `components/DNS.tsx` — Grid layout 2 cột, TXT records full-width, Security Posture 4-cột.

---

### 2.3 Subdomain Enumeration — Liệt Kê Subdomain

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | `string` | Tên subdomain đầy đủ |
| `category` | `SubdomainCategory` | Phân loại (api, admin, dev, staging, vpn, mail, cdn, internal, wildcard, orphan) |
| `risk` | `SubdomainRisk` | Mức rủi ro (critical, high, medium, low, info) |
| `resolvedIP` | `string?` | IP phân giải |
| `status` | `'active' \| 'inactive' \| 'resolved'` | Trạng thái |
| `httpStatus` | `number?` | HTTP response code |
| `banner` | `string?` | Banner server |
| `tech` | `string[]?` | Công nghệ phát hiện |

**Component:** `components/Subdomain.tsx` — Stat boxes + bảng dữ liệu.

---

### 2.4 Infrastructure Mapping — Ánh Xạ Hạ Tầng

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `ipAddress` | `string?` | IPv4 chính |
| `ipv6` | `string[]?` | Danh sách IPv6 |
| `asn` | `string?` | Autonomous System Number |
| `cidrRange` | `string[]?` | Dải IP CIDR |
| `reverseIp` | `string[]?` | Reverse IP lookup |
| `hostingProvider` | `string?` | Nhà cung cấp hosting |
| `cloudProvider` | `string?` | Nhà cung cấp cloud |
| `geoLocation` | `{ country, city, latitude?, longitude? }` | Vị trí địa lý |
| `cdn` | `string?` | Content Delivery Network |
| `waf` | `string?` | Web Application Firewall |
| `reverseProxy` | `string?` | Reverse proxy |
| `loadBalancer` | `string?` | Load balancer |

**Component:** `components/Infrastructure.tsx` — Grid 2 cột, stat boxes 4 cột.

---

### 2.5 Service Enumeration — Quét Dịch Vụ

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `port` | `number` | Số port |
| `protocol` | `string?` | TCP / UDP |
| `service` | `string` | Tên dịch vụ |
| `state` | `string` | Trạng thái (open, filtered, closed) |
| `banner` | `string` | Banner response |
| `version` | `string?` | Phiên bản dịch vụ |
| `ssl` | `PortSSL?` | Thông tin SSL/TLS |
| `httpResponse` | `PortHttpResponse?` | HTTP response (nếu là HTTP) |
| `risk` | `string?` | Mức rủi ro |
| `cve` | `string[]?` | CVE liên quan |

**PortSSL:** `{ tlsVersion?, cipherSuite?, certificateIssuer?, certificateExpiry?, certificateSubject? }`  
**PortHttpResponse:** `{ statusCode?, headers?, bodyPreview? }`

**Component:** `components/Service.tsx` — Bảng ports với màu trạng thái, risk badge, CVE list.

---

### 2.6 Web Surface Discovery — Bề Mặt Web

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `website` | `string?` | URL chính |
| `loginPage` | `string?` | Trang đăng nhập |
| `adminPanel` | `string?` | Trang quản trị |
| `apiEndpoints` | `string[]?` | API endpoints |
| `graphQLEndpoint` | `string?` | GraphQL endpoint |
| `swaggerOpenAPI` | `string?` | Tài liệu API |
| `websocket` | `string?` | WebSocket endpoint |
| `uploadEndpoint` | `string?` | Upload endpoint |
| `hiddenDirectories` | `string[]?` | Thư mục ẩn |
| `robotsTxt` | `string?` | robots.txt |
| `sitemapXml` | `string?` | sitemap.xml |
| `jsFiles` | `string[]?` | JavaScript files |
| `sourceMap` | `string?` | Source map |
| `fileListing` | `string[]?` | Directory listing |
| `redirect` | `string?` | Redirect chain |
| `errorPage` | `string?` | Trang lỗi |

**Component:** `components/WebSurface.tsx` — Grid cards theo nhóm chức năng.

---

### 2.7 Technology Fingerprinting — Nh��n Diện Công Nghệ

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `frontend` | `string[]` | Framework frontend |
| `backend` | `string[]` | Ngôn ngữ/framework backend |
| `database` | `string[]` | Hệ quản trị CSDL |
| `hosting` | `string[]` | Nền tảng hosting |
| `cms` | `string[]?` | Content Management System |
| `analytics` | `string[]?` | Công cụ phân tích |
| `cdn` | `string[]?` | CDN technologies |
| `runtime` | `string[]?` | Môi trường runtime |
| `tagManager` | `string[]?` | Tag manager |
| `packageLeak` | `string[]?` | Package bị lộ |

**Component:** `components/Technology.tsx` — Grid cards với tech badges.

---

### 2.8 Vulnerability Surface — Bề Mặt Lỗ Hổng

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | `string` | Tên lỗ hổng |
| `severity` | `string` | CRITICAL / HIGH / MEDIUM / LOW / INFO |
| `category` | `VulnerabilityCategory?` | Phân loại (16 loại) |
| `cve` | `string?` | Mã CVE |
| `cvss` | `number?` | Điểm CVSS (0-10) |
| `description` | `string?` | Mô tả chi tiết |
| `affectedComponent` | `string?` | Thành phần bị ảnh hưởng |
| `remediation` | `string?` | Hướng dẫn khắc phục |
| `references` | `string[]?` | Tài liệu tham khảo |

**16 loại lỗ hổng:**
`cve` | `missing-security-header` | `weak-tls` | `open-redirect` | `xss` | `sql-injection` | `ssrf` | `lfi-rfi` | `idor` | `default-credential` | `exposed-admin-panel` | `directory-traversal` | `rce-indicator` | `cors-misconfiguration` | `clickjacking` | `other`

**Component:** `components/Vulnerability.tsx` — Bảng + CVSS bar chart + severity badges.

---

### 2.9 Sensitive Exposure — Lộ Thông Tin Nhạy Cảm

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `envExposure` | `string[]?` | File .env bị lộ |
| `gitExposure` | `string[]?` | Thư mục .git bị lộ |
| `backupFiles` | `string[]?` | File backup public |
| `configFiles` | `string[]?` | File cấu hình lộ |
| `apiKeys` | `string[]?` | API keys trong source |
| `secretTokens` | `string[]?` | Token bí mật |
| `firebaseConfig` | `string?` | Cấu hình Firebase lộ |
| `publicS3Bucket` | `string?` | S3 bucket public |
| `jenkinsExposure` | `string?` | Jenkins server lộ |
| `kibanaExposure` | `string?` | Kibana dashboard lộ |
| `databaseDump` | `string?` | Database dump public |
| `logFiles` | `string[]?` | File log public |
| `sourceCodeExposure` | `string?` | Mã nguồn bị lộ |

**Component:** `components/SensitiveExposure.tsx` — Grid cards theo mức độ nghiêm trọng.

---

### 2.10 OSINT & Organization — Tình Báo Nguồn Mở

| Nhóm | Trường | Mô tả |
|------|--------|-------|
| **Data Breaches** | `breaches[]` | Lịch sử rò rỉ dữ liệu |
| **Emails** | `harvestedEmails[]` | Email thu thập được |
| **Social** | `socialIntel{}` | Tài khoản mạng xã hội (Twitter, GitHub, LinkedIn, Facebook, Instagram, Reddit, Discord) |
| **Dorks** | `googleDorks[]` | Google dork queries + kết quả |
| **Wayback** | `waybackSnapshots[]` | Ảnh chụp lịch sử website |
| **Certificates** | `certTransparency[]` | Certificate Transparency logs |
| **Employees** | `employeeData[]` | Nhân viên (tên, email, chức vụ, LinkedIn, phone) |
| **Documents** | `publicDocuments[]` | Tài liệu công khai |
| **Metadata** | `fileMetadata[]` | EXIF/metadata từ file |
| **Mobile Apps** | `mobileApps[]` | Ứng dụng di động liên quan |
| **Mentions** | `internetMentions[]` | Đề cập trên Internet (Reddit, Twitter, HN...) |

**Component:** `components/OSINT.tsx` — Grid 2 cột, breach timeline, email tags, dork list, cert transparency cards.

---

## 3. IPServer — Trinh Sát Máy Chủ & IP

> **File chính:** `IPServer/index.tsx`  
> **Type tổng:** `IPServer/types/ip-server-data.ts` — Interface `IPServerData`  

### 3.1 Network Information — Thông Tin Mạng

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `ipAddress` | `string` | Địa chỉ IP |
| `reverseDns` | `string?` | Reverse DNS (PTR) |
| `asn` | `string` | Autonomous System |
| `cidr` | `string[]` | Dải mạng CIDR |
| `geoIp` | `GeoLocation` | Vị trí địa lý |
| `isp` | `string` | Nhà cung cấp Internet |
| `latency` | `number?` | Độ trễ (ms) |
| `packetLoss` | `number?` | Tỷ lệ mất gói (%) |

**Component:** `components/NetworkInfo.tsx`

---

### 3.2 Port & Service Scan — Quét Cổng & Dịch Vụ

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `port` | `number` | Số cổng |
| `protocol` | `'tcp' \| 'udp'` | Giao thức |
| `state` | `'open' \| 'closed' \| 'filtered'` | Trạng thái |
| `service` | `string` | Tên dịch vụ |
| `banner` | `string?` | Banner |
| `version` | `string?` | Phiên bản |
| `ssl` | `PortSSL?` | Thông tin TLS |

**Component:** `components/PortService.tsx`

---

### 3.3 OS Detection — Nhận Diện Hệ Điều Hành

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `operatingSystem` | `string` | Tên OS |
| `kernelVersion` | `string?` | Phiên bản kernel |
| `architecture` | `string?` | Kiến trúc CPU |
| `hostname` | `string?` | Tên máy |
| `uptime` | `number?` | Thời gian hoạt động (giây) |

**Component:** `components/OSDetection.tsx`

---

### 3.4 Security Analysis — Phân Tích Bảo Mật

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | `string` | Tên phát hiện |
| `severity` | `Severity` | Mức độ |
| `category` | `SecurityCategory?` | Loại (cve, weak-cipher, weak-ssh-config, anonymous-ftp, smb/rdp/vnc/telnet-exposure, tls-weakness, other) |
| `cvss` | `number?` | Điểm CVSS |
| `cve` | `string?` | Mã CVE |
| `description` | `string` | Mô tả |
| `remediation` | `string?` | Cách khắc phục |
| `references` | `string[]?` | Tham khảo |

**Component:** `components/SecurityAnalysis.tsx`

---

### 3.5 Infrastructure Exposure — Lộ Hạ Tầng

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `dockerExposure` | `boolean?` | Docker API lộ |
| `kubernetesExposure` | `boolean?` | K8s API lộ |
| `redisExposure` | `boolean?` | Redis không auth |
| `elasticsearchExposure` | `boolean?` | ES không auth |
| `mongodbExposure` | `boolean?` | MongoDB không auth |
| `postgresqlExposure` | `boolean?` | PostgreSQL không auth |
| `mysqlExposure` | `boolean?` | MySQL không auth |

**Component:** `components/InfrastructureExposure.tsx`

---

## 4. Website — Trinh Sát Ứng Dụng Web

> **File chính:** `Website/index.tsx`  
> **Type tổng:** `Website/types/website-data.ts` — Interface `WebsiteData`  

### 4.1 Application Structure — Cấu Trúc Ứng Dụng

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `urlStructure` | `string[]` | Danh sách URL |
| `endpointMapping` | `{ path, method, description? }[]` | API endpoints map |
| `routeDiscovery` | `string[]` | Routes phát hiện |
| `apiDiscovery` | `string[]` | API paths |
| `hiddenPaths` | `string[]` | Đường dẫn ẩn |
| `uploadPaths` | `string[]` | Đường dẫn upload |
| `queryStringParams` | `{ url, params[] }[]?` | Tham số query string |
| `formDiscovery` | `{ url, action?, method?, fields[] }[]?` | Form phát hiện |

**Component:** `components/WebAppStructure.tsx`

---

### 4.2 Authentication Surface — Bề Mặt Xác Thực

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `loginPage` | `string` | Trang đăng nhập |
| `registerPage` | `string?` | Trang đăng ký |
| `passwordReset` | `string?` | Trang reset mật khẩu |
| `oauth` | `{ provider, url }[]?` | OAuth providers |
| `sso` | `string?` | Single Sign-On |
| `sessionCookie` | `{ name, httpOnly?, secure? }?` | Cookie phiên |
| `jwt` | `boolean?` | Sử dụng JWT |
| `mfa` | `boolean?` | Multi-Factor Auth |

**Component:** `components/AuthSurface.tsx`

---

### 4.3 Client-Side Analysis — Phân Tích Phía Client

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `jsFiles` | `string[]` | File JavaScript |
| `sourceMap` | `string[]?` | Source maps |
| `apiCalls` | `string[]` | API calls trong JS |
| `localStorage` | `string[]` | Dữ liệu localStorage |
| `sessionStorage` | `string[]` | Dữ liệu sessionStorage |
| `websocket` | `string?` | WebSocket endpoints |
| `csp` | `string` | Content Security Policy |

**Component:** `components/ClientSide.tsx`

---

### 4.4 Vulnerability Surface — Bề Mặt Lỗ Hổng Web

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | `string` | Tên lỗ hổng |
| `severity` | `Severity` | Mức độ |
| `category` | `WebVulnCategory?` | Loại (xss, sqli, csrf, ssrf, idor, file-upload, open-redirect, business-logic, missing-security-header, exposed-debug, clickjacking, cors, other) |
| `cvss` | `number?` | Điểm CVSS |
| `cve` | `string?` | Mã CVE |
| `description` | `string` | Mô tả |
| `location` | `string` | Vị trí phát hiện |
| `remediation` | `string?` | Cách khắc phục |
| `references` | `string[]?` | Tham khảo |

**Component:** `components/WebVulnerability.tsx`

---

### 4.5 Technology Detection — Nhận Diện Công Nghệ Web

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `frontendFramework` | `string[]` | Framework frontend |
| `backendFramework` | `string[]` | Framework backend |
| `cms` | `string[]?` | CMS |
| `webServer` | `string[]` | Web server |
| `runtime` | `string[]` | Runtime |
| `cdn` | `string[]` | CDN |
| `waf` | `string[]` | WAF |

**Component:** `components/TechnologyDetection.tsx`

---

## 5. Organization — Trinh Sát Tổ Chức

> **File chính:** `Organization/index.tsx`  
> **Type tổng:** `Organization/types/organization-data.ts` — Interface `OrganizationData`  

### 5.1 Company Information — Thông Tin Công Ty

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `companyName` | `string` | Tên công ty |
| `legalName` | `string?` | Tên pháp lý |
| `address` | `string?` | Địa chỉ |
| `phoneNumber` | `string?` | Số điện thoại |
| `email` | `string?` | Email liên hệ |
| `industry` | `string?` | Ngành nghề |
| `subsidiaries` | `string[]?` | Công ty con |

**Component:** `components/CompanyInfo.tsx`

---

### 5.2 Digital Assets — Tài Sản Số

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `type` | `AssetType` | Loại (domain, subdomain, mobileApp, cloudAsset, githubOrg, publicRepo) |
| `name` | `string` | Tên tài sản |
| `url` | `string?` | URL |
| `visibility` | `string?` | Phạm vi |
| `risk` | `string?` | Mức rủi ro |

**Component:** `components/DigitalAssets.tsx`

---

### 5.3 Employee Intelligence — Tình Báo Nhân Sự

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | `string` | Họ tên |
| `title` | `string?` | Chức danh |
| `email` | `string?` | Email |
| `linkedin` | `string?` | LinkedIn profile |
| `department` | `string?` | Phòng ban |

**Component:** `components/EmployeeIntel.tsx`

---

### 5.4 External Exposure — Lộ Thông Tin Ra Bên Ngoài

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `dataBreach` | `Breach[]?` | Rò rỉ dữ liệu |
| `credentialLeak` | `CredLeak[]?` | Lộ credentials |
| `publicDocuments` | `string[]?` | Tài liệu công khai |
| `pdfMetadata` | `PdfMetadata[]?` | Metadata từ PDF |
| `pressReleases` | `string[]?` | Thông cáo báo chí |
| `conferenceTalks` | `string[]?` | Bài nói tại hội thảo |

**Component:** `components/ExternalExposure.tsx`

---

## 6. Person — Trinh Sát Cá Nhân

> **File chính:** `Person/index.tsx`  
> **Type tổng:** `Person/types/person-data.ts` — Interface `PersonData`  

### 6.1 Identity Information — Thông Tin Danh Tính

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `fullName` | `string` | Họ tên đầy đủ |
| `alias` | `string[]?` | Bí danh |
| `username` | `string[]?` | Username |
| `nickname` | `string?` | Biệt danh |
| `avatar` | `string?` | URL avatar |
| `possibleRealNames` | `string[]?` | Tên thật khả dĩ |
| `estimatedAge` | `string?` | Tuổi ước tính |
| `gender` | `string?` | Giới tính |
| `nationality` | `string?` | Quốc tịch |
| `language` | `string[]?` | Ngôn ngữ |
| `notes` | `string?` | Ghi chú |

**Component:** `components/PersonIdentity.tsx`

---

### 6.2 Contact Information — Thông Tin Liên Hệ

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `email` | `string[]?` | Địa chỉ email |
| `phoneNumber` | `string[]?` | Số điện thoại |
| `address` | `string?` | Địa chỉ |
| `messengerAccounts` | `{ platform, username }[]?` | Tài khoản messenger |

**Component:** `components/ContactInfo.tsx`

---

### 6.3 Social Media — Mạng Xã Hội

| Nền tảng | Trường |
|----------|--------|
| Facebook | `facebook?` |
| X/Twitter | `twitter?` |
| Instagram | `instagram?` |
| LinkedIn | `linkedin?` |
| TikTok | `tiktok?` |
| Reddit | `reddit?` |
| Discord | `discord?` |
| GitHub | `github?` |
| YouTube | `youtube?` |
| Telegram | `telegram?` |

**Component:** `components/SocialMedia.tsx`

---

### 6.4 Technical Footprint — Dấu Chân Kỹ Thuật

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `github` | `string?` | GitHub profile |
| `gitlab` | `string?` | GitLab profile |
| `stackoverflow` | `string?` | StackOverflow |
| `publicKeys` | `string[]?` | Public keys |
| `domainOwnership` | `string[]?` | Tên miền sở hữu |
| `ipAddresses` | `string[]?` | IP addresses |
| `hostingProviders` | `string[]?` | Hosting providers |
| `technologies` | `string[]?` | Công nghệ sử dụng |
| `repositoryContributions` | `{ repo, contributions }[]?` | Đóng góp repo |
| `toolsPublished` | `string[]?` | Công cụ đã publish |
| `conferences` | `string[]?` | Hội thảo tham gia |
| `ctfResults` | `{ event, rank, team }[]?` | Kết quả CTF |

**Component:** `components/TechnicalFootprint.tsx`

---

### 6.5 Leak & Exposure — Rò Rỉ Dữ Liệu

| Nhóm | Trường | Mô tả |
|------|--------|-------|
| **Password Leaks** | `passwordLeaks[]` | Mật khẩu bị lộ (source, date, email, severity, hashType) |
| **Credential Leaks** | `credentialLeaks[]` | Credentials bị lộ |
| **Breach Database** | `breachDatabase[]` | Tên database bị breach |
| **Pastebin Leaks** | `pastebinLeaks[]` | Pastebin chứa dữ liệu |
| **Public Documents** | `publicDocuments[]` | Tài liệu công khai |
| **Darkweb Mentions** | `darkwebMentions[]` | Đề cập trên darkweb |

**Component:** `components/LeakExposure.tsx`

---

## 7. SourceCode — Trinh Sát Mã Nguồn

> **File chính:** `SourceCode/index.tsx`  
> **Type tổng:** `SourceCode/types/sourcecode-data.ts` — Interface `SourceCodeData`  

### 7.1 Repository Information — Thông Tin Repository

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `repositoryName` | `string` | Tên repo |
| `owner` | `string` | Chủ sở hữu |
| `visibility` | `'public' \| 'private'` | Phạm vi |
| `commitHistory` | `{ totalCommits, lastCommitDate, firstCommitDate }?` | Lịch sử commit |
| `branches` | `string[]?` | Danh sách branch |
| `tags` | `string[]?` | Tags |
| `releases` | `{ version, date }[]?` | Releases |

**Component:** `components/RepoInfo.tsx`

---

### 7.2 Developer Information — Thông Tin Nhà Phát Triển

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `contributors` | `{ name, email, commits }[]` | Người đóng góp |
| `commitEmails` | `string[]` | Email trong commit |
| `maintainers` | `string[]` | Người bảo trì |
| `commitMetadata` | `CommitMetadata[]?` | Chi tiết commit (hash, author, email, date, message) |

**Component:** `components/DeveloperInfo.tsx`

---

### 7.3 Secret Exposure — Lộ Bí Mật Trong Code

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `apiKeys` | `string[]?` | API keys |
| `secretTokens` | `string[]?` | Secret tokens |
| `sshKeys` | `string[]?` | SSH keys |
| `databaseCredentials` | `string[]?` | Credentials database |
| `cloudCredentials` | `string[]?` | Cloud credentials |
| `hardcodedPasswords` | `string[]?` | Mật khẩu cứng |

**Component:** `components/SecretExposure.tsx`

---

### 7.4 Infrastructure Information — Hạ Tầng Trong Code

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `ciCdConfig` | `string[]?` | File CI/CD |
| `dockerConfig` | `string[]?` | Docker config |
| `kubernetesConfig` | `string[]?` | K8s manifests |
| `terraform` | `string[]?` | Terraform files |
| `cloudFormation` | `string[]?` | CloudFormation templates |
| `deploymentScripts` | `string[]?` | Script triển khai |

**Component:** `components/InfrastructureInfo.tsx`

---

### 7.5 Application Intelligence — Tình Báo Ứng Dụng

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `apiEndpoints` | `string[]?` | API endpoints |
| `internalUrls` | `string[]?` | URL nội bộ |
| `debugEndpoints` | `string[]?` | Debug endpoints |
| `featureFlags` | `string[]?` | Feature flags |
| `adminRoutes` | `string[]?` | Routes admin |
| `hiddenRoutes` | `string[]?` | Routes ẩn |

**Component:** `components/AppIntelligence.tsx`

---

### 7.6 Dependency Analysis — Phân Tích Thư Viện

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `packageJson` | `Dependency[]?` | npm dependencies |
| `requirementsTxt` | `Dependency[]?` | Python dependencies |
| `pomXml` | `Dependency[]?` | Java/Maven dependencies |
| `composerJson` | `Dependency[]?` | PHP dependencies |
| `goMod` | `Dependency[]?` | Go dependencies |
| `cargoToml` | `Dependency[]?` | Rust dependencies |

Mỗi `Dependency` gồm: `name`, `version`, `vulnerable?`, `cve?[]`

**Component:** `components/DependencyAnalysis.tsx`

---

## 8. Luồng Dữ Liệu & API

### 8.1 Kiến Trúc Dữ Liệu

```
┌─────────────────────────────────────────────────┐
│                  RECON MODULE                     │
├─────────────────────────────────────────────────┤
│  index.tsx (Tab Container)                       │
│    │                                              │
│    ├── Domain/index.tsx    ← ReconData           │
│    ├── IPServer/index.tsx  ← IPServerData        │
│    ├── Website/index.tsx   ← WebsiteData         │
│    ├── Organization/index.tsx ← OrganizationData │
│    ├── Person/index.tsx    ← PersonData          │
│    └── SourceCode/index.tsx ← SourceCodeData     │
│                                                   │
│  Mỗi module:                                      │
│    types/ → interface definition                  │
│    components/ → React UI                         │
│    data/ → JSON sample (fallback)                 │
│    services/ → API calls (dự kiến)                │
└─────────────────────────────────────────────────┘
```

### 8.2 Cơ Chế Dữ Liệu

Hiện tại mỗi module hỗ trợ 2 chế độ:

1. **Sample Data Mode**: Import JSON từ `data/` folder để preview UI
2. **API Mode** (dự kiến): Gọi REST API `/api/recon/{target}` để lấy dữ liệu thực

```typescript
// Pattern chung trong mỗi index.tsx
async function fetchData(target: string): Promise<TargetData | null> {
  // 1. Thử sample data trước
  if (sampleData && sampleData.target === target) {
    return sampleData;
  }
  // 2. Fallback về API
  const response = await fetch(`/api/recon/${targetType}/${target}`);
  return response.json();
}
```

### 8.3 State Management

Mỗi module tự quản lý state qua React hooks:

| State | Mô tả |
|-------|-------|
| `sessions` | Danh sách target đã thêm |
| `activeTarget` | Target đang xem |
| `activeSubTab` | Tab con đang active |
| `data` | Dữ liệu reconnaissance |
| `isLoading` | Trạng thái loading |
| `searchQuery` | Từ khóa tìm kiếm |
| `isHistoryMode` | Chế độ xem lịch sử |

---

## 9. Hướng Dẫn Phát Triển

### 9.1 Thêm Tab Mới Vào Module

1. Tạo file type trong `types/`
2. Import type vào file aggregate (ví dụ: `recon-data.ts`)
3. Tạo component UI trong `components/`
4. Đăng ký tab trong `SUB_TABS` array của `index.tsx`
5. Thêm case trong `renderContent()`

### 9.2 Thêm Trường Dữ Liệu

1. Cập nhật interface trong `types/`
2. Thêm dữ liệu mẫu vào `data/*.json`
3. Cập nhật component để hiển thị trường mới
4. (Nếu cần) Cập nhật `Search.tsx` để tìm kiếm được trường mới

### 9.3 Quy Ước Code

- **Type**: Luôn dùng `interface` (ưu tiên hơn `type`) cho object
- **Optional field**: Dùng `?` cho mọi field không bắt buộc
- **Màu sắc**: Dùng hex code từ bảng màu chuẩn
- **Component UI helper**: `SectionHeader`, `KV`, `StatBox` được định nghĩa inline trong mỗi component
- **Import type**: Luôn dùng `import type { ... }` cho type-only imports
- **Font**: `font-mono` cho toàn bộ text hiển thị dữ liệu
- **Background**: `#0f1319` (chính), `#0d1017` (cards), `#1c2333` (borders)

### 9.4 Các File Cần Triển Khai Tiếp

| Thư mục | File | Trạng thái |
|---------|------|-----------|
| `Domain/hooks/` | `useReconData.ts` | ⏳ Chưa có |
| `Domain/services/` | `api.ts` | ⏳ Chưa có |
| `Domain/utils/` | `parsers.ts` | ⏳ Chưa có |
| `Domain/constants/` | `index.ts` | ⏳ Chưa có |

> Tương tự cho IPServer, Website, Organization, Person, SourceCode.

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số module** | 6 (Domain, IPServer, Website, Organization, Person, SourceCode) |
| **Tổng số nhóm dữ liệu** | 35 |
| **Tổng số type files** | 52 |
| **Tổng số components** | 71 |
| **Tổng data points** | 200+ |
| **Ngôn ngữ** | TypeScript + React |
| **UI Framework** | Tailwind CSS + Custom |

---

> **Phantoma RECON v2.0.0** — *"Biết người biết ta, trăm trận trăm thắng"* 🛡️