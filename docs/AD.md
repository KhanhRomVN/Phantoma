# 🏢 Phantoma AD — Tài Liệu Module Active Directory

> **Phiên bản:** 1.0.0  
> **Module:** Active Directory Penetration Testing  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Thu Thập Thông Tin AD (Passive)](#2-thu-thập-thông-tin-ad-passive)
- [3. Tấn Công Xác Thực](#3-tấn-công-xác-thực)
- [4. Kerberoasting & AS-REP Roasting](#4-kerberoasting--as-rep-roasting)
- [5. Pass-the-Hash & Overpass-the-Hash](#5-pass-the-hash--overpass-the-hash)
- [6. Golden & Silver Ticket](#6-golden--silver-ticket)
- [7. DCSync & DCShadow](#7-dcsync--dcshadow)
- [8. ACL Abuse & Resource-Based Constrained Delegation](#8-acl-abuse--resource-based-constrained-delegation)
- [9. BloodHound & SharpHound](#9-bloodhound--sharphound)
- [10. Cơ Chế An Toàn & Giới Hạn](#10-cơ-chế-an-toàn--giới-hạn)
- [11. Luồng Dữ Liệu & API](#11-luồng-dữ-liệu--api)
- [12. Hướng Dẫn Phát Triển](#12-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **AD** kết hợp cả kỹ thuật **thụ động** (LDAP query, BloodHound) và **chủ động** (Kerberoasting, DCSync). Yêu cầu có quyền domain user (hoặc ít nhất là guest) để bắt đầu.

```
AD/
├── AD.md                        ← Tài liệu này
├── index.tsx                    ← Component chính
├── Recon/                       ← Thu thập thông tin
│   ├── LDAPEnum.tsx
│   ├── BloodHoundImport.tsx
│   └── ...
├── Attack/                      ← Khai thác
│   ├── Kerberoast.tsx
│   ├── ASREPRoast.tsx
│   ├── PassTheHash.tsx
│   ├── GoldenTicket.tsx
│   ├── SilverTicket.tsx
│   ├── DCSync.tsx
│   ├── ACLAbuse.tsx
│   └── ...
├── services/                    (impacket, bloodhound-python, rubeus wrapper)
├── types/
├── constants/
└── utils/
```

### 🎯 Các kỹ thuật chính

| # | Kỹ thuật | Loại | Mô tả |
|---|----------|------|-------|
| 1 | LDAP Enumeration | Thụ động | Liệt kê users, groups, OUs, GPOs |
| 2 | BloodHound | Thụ động | Lập bản đồ đường tấn công |
| 3 | Kerberoasting | Chủ động | Yêu cầu TGS, bẻ hash service account |
| 4 | AS-REP Roasting | Chủ động | Tấn công user không yêu cầu pre‑auth |
| 5 | Pass-the-Hash | Chủ động | Dùng NTLM hash để xác thực |
| 6 | Overpass-the-Hash | Chủ động | Dùng hash để lấy TGT |
| 7 | Golden Ticket | Chủ động | Tạo TGT với krbtgt hash |
| 8 | Silver Ticket | Chủ động | Tạo TGS cho service cụ thể |
| 9 | DCSync | Chủ động | Giả lập DC để đồng bộ hash |
| 10 | DCShadow | Chủ động | Tạo DC giả, sửa đổi đối tượng |
| 11 | ACL Abuse | Chủ động | Khai thác ACE (GenericAll, WriteProperty...) |
| 12 | RBCD (Resource-Based Constrained Delegation) | Chủ động | Tấn công delegation |

---

## 2. Thu Thập Thông Tin AD (Passive)

### 2.1 LDAP Enumeration

| Trường dữ liệu | Kiểu | Mô tả |
|----------------|------|-------|
| `domain` | `string` | Tên domain (ví dụ contoso.local) |
| `domainControllers` | `string[]` | Danh sách DC (FQDN, IP) |
| `users` | `User[]` | Tên, distinguishedName, enabled, lastLogon |
| `groups` | `Group[]` | Tên nhóm, thành viên |
| `computers` | `Computer[]` | Tên máy, OS, SPN |
| `ous` | `string[]` | Organizational Units |
| `gpos` | `GPO[]` | Chính sách nhóm |
| `trusts` | `Trust[]` | Mối quan hệ trust (inbound/outbound) |

**Công cụ:** `ldapsearch`, `PowerView`, `BloodHound-python`.  
**Component:** `Recon/LDAPEnum.tsx` – hiển thị bảng, có thể tìm kiếm.

### 2.2 BloodHound Data Collection

- **SharpHound** (Windows) hoặc **BloodHound.py** (Linux) thu thập dữ liệu.
- Dữ liệu bao gồm: user, group, session, local admin, ACL, GPO.
- Upload file zip vào BloodHound UI (tích hợp trong module bằng cách gọi API BloodHound hoặc mở cửa sổ riêng).

---

## 3. Tấn Công Xác Thực

### 3.1 Password Spraying

- Thử một mật khẩu phổ biến với nhiều user (ví dụ `Password123`).
- Tránh lockout: chậm (30 giây/lần), chỉ thử 2-3 lần/user.

**Output:** `{ user, success, password }`.

### 3.2 Brute-force (cẩn thận)

- Chỉ thực hiện khi chính sách khóa tài khoản lỏng lẻo.
- Dùng `hydra` hoặc `kerbrute`.

---

## 4. Kerberoasting & AS-REP Roasting

### 4.1 Kerberoasting

| Bước | Mô tả |
|------|-------|
| 1 | Liệt kê SPN (Service Principal Names) trong domain |
| 2 | Yêu cầu TGS cho các SPN |
| 3 | Lưu TGS vào file |
| 4 | Crack offline: `hashcat -m 13100 -a 0 tgs.txt wordlist.txt` |

**API trả về:** `{ spn, serviceAccount, hash, crackedPassword? }`.

**Công cụ:** `GetUserSPNs.py` (Impacket), `Rubeus kerberoast`.

### 4.2 AS-REP Roasting

- Dành cho user có `DONT_REQ_PREAUTH` flag.
- Yêu cầu AS-REP, lấy hash, crack bằng `hashcat -m 18200`.

---

## 5. Pass-the-Hash & Overpass-the-Hash

### 5.1 Pass-the-Hash (PtH)

Sử dụng NTLM hash của user để xác thực vào các dịch vụ (SMB, WMI, PsExec).

**Công cụ:** `psexec.py -hashes :<ntlmHash> domain/user@target`.

**API:** `POST /api/ad/pth` với body `{ target, user, domain, ntlmHash, command }`.

### 5.2 Overpass-the-Hash

- Dùng hash để lấy TGT (thông qua `sekurlsa::pth` trong Mimikatz hoặc Rubeus).
- TGT cho phép truy cập nhiều dịch vụ hơn.

---

## 6. Golden & Silver Ticket

### 6.1 Golden Ticket

| Thành phần | Mô tả | Lấy từ đâu |
|------------|-------|-------------|
| `domain` | Tên domain | known |
| `sid` | Domain SID | từ user hoặc DC |
| `krbtgt` | NTLM hash của krbtgt account | DCSync, hoặc Mimikatz trên DC |
| `user` | Người dùng giả mạo (thường Administrator) | tuỳ ý |

- Tạo ticket: `mimikatz "kerberos::golden /domain:... /sid:... /krbtgt:... /user:Administrator /ptt"`.
- Ticket có hiệu lực 10 năm.

**API trả về:** `{ ticketFile, instructions }`.

### 6.2 Silver Ticket

- Giả mạo TGS cho một service cụ thể (cifs, http, ldap...).
- Chỉ cần NTLM hash của service account (không cần krbtgt).
- Giới hạn phạm vi service đó.

---

## 7. DCSync & DCShadow

### 7.1 DCSync

- Giả lập Domain Controller để yêu cầu replication.
- Cần quyền `Replicating Directory Changes` (thường có sẵn cho Domain Admins).
- Dump hash của bất kỳ user (kể cả krbtgt).

**Công cụ:** `secretsdump.py -just-dc domain/user@dc`, `mimikatz lsadump::dcsync`.

### 7.2 DCShadow

- Tạo DC giả, đăng ký trong domain.
- Cho phép sửa đổi đối tượng (thêm user, sửa group) mà không ghi log.
- Rất nguy hiểm, chỉ dùng trong lab.

---

## 8. ACL Abuse & RBCD

### 8.1 ACL Abuse

Phát hiện các ACE (Access Control Entry) nguy hiểm:

| Quyền | Mô tả | Khai thác |
|-------|-------|-----------|
| `GenericAll` | Toàn quyền trên đối tượng | Đặt lại mật khẩu, thêm user vào group |
| `WriteProperty` | Ghi thuộc tính (ví dụ member) | Thêm user vào group |
| `ForceChangePassword` | Đặt lại mật khẩu user | Đổi pass, đăng nhập |
| `AddMember` | Thêm thành viên | Leo thang vào nhóm quyền cao |

**Công cụ:** `BloodHound`, `PowerView`.

### 8.2 RBCD (Resource-Based Constrained Delegation)

- Cho phép máy A ủy quyền cho máy B.
- Nếu kiểm soát được máy A, có thể tạo ticket để impersonate bất kỳ user nào lên máy B.

---

## 9. BloodHound & SharpHound

- **SharpHound** thu thập dữ liệu từ domain.
- **BloodHound** phân tích và hiển thị đường đi đến DA.
- Module AD sẽ cung cấp giao diện để:
  - Chạy SharpHound từ xa (qua WinRM hoặc upload file)
  - Upload zip vào BloodHound (có thể nhúng iframe hoặc gọi API Neo4j)
  - Hiển thị shortest path đến DA dưới dạng văn bản / đồ thị đơn giản.

---

## 10. Cơ Chế An Toàn & Giới Hạn

### 10.1 Yêu cầu ủy quyền

- Xác nhận “Tôi có quyền kiểm thử domain này” (checkbox + ghi log).
- Mọi thao tác chủ động (DCSync, Golden Ticket) đều cần xác nhận lần 2.

### 10.2 Chạy trên máy ảo lab

- Khuyến nghị tạo môi trường AD riêng (ví dụ Windows Server + Windows 10).
- Module có thể ghi lại toàn bộ lệnh đã chạy để phân tích sau.

### 10.3 Logging

- Lưu file log riêng cho mỗi phiên, bao gồm thời gian, lệnh, kết quả.
- Log không chứa plaintext password (chỉ hash).

---

## 11. Luồng Dữ Liệu & API

```
User → (chọn kỹ thuật) → Điền thông tin (DC, domain, user/pass hoặc hash)
   ↓
Backend: gọi công cụ (impacket, rubeus, bloodhound-python)
   ↓
Stream output → Hiển thị real‑time → Lưu kết quả
   ↓
Xuất báo cáo (có thể gửi sang REPORT)
```

### Endpoints dự kiến

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/ad/ldap/list` | `{ domainController, user, password }` | Liệt kê users/groups |
| POST | `/api/ad/kerberoast` | `{ domainController, user, password }` | Lấy TGS và crack (tùy chọn) |
| POST | `/api/ad/asreproast` | `{ domainController }` | Lấy hash AS-REP |
| POST | `/api/ad/pth` | `{ target, domain, user, ntlmHash, command }` | Pass-the-Hash |
| POST | `/api/ad/golden` | `{ domain, sid, krbtgtHash, user }` | Tạo golden ticket |
| POST | `/api/ad/dcsync` | `{ domainController, user, password, targetUser }` | Dump hash target |
| POST | `/api/ad/acl/abuse` | `{ domainController, user, password, targetObject, action }` | Thực thi ACL |
| POST | `/api/ad/bloodhound/collect` | `{ domainController, user, password }` | Chạy SharpHound, trả về zip |

---

## 12. Hướng Dẫn Phát Triển

### 12.1 Các thư viện cần dùng

| Ngôn ngữ | Thư viện / Công cụ |
|----------|---------------------|
| Python | impacket, ldap3, bloodhound-python |
| Node.js | child_process (gọi script Python hoặc binary) |
| UI | React, Tailwind, đồ thị (react‑flow) |

### 12.2 Tích hợp BloodHound

- Cài đặt BloodHound (Neo4j + app) riêng.
- Module có thể mở tab nội bộ với URL `http://localhost:8080` (giả sử BloodHound CE chạy).

### 12.3 Các service cần viết

| File | Mô tả |
|------|-------|
| `services/impacket.ts` | Gọi python script với tham số động |
| `services/rubeusWrapper.ts` | Chạy Rubeus.exe qua Wine hoặc trên Windows remote |
| `services/ldapClient.ts` | Kết nối LDAP, query |
| `services/bloodhound.ts` | Tự động hóa SharpHound collection |

### 12.4 UI Components

- **LDAPBrowser**: cây thư mục, có thể click xem thuộc tính.
- **KerberoastPanel**: bảng SPN, nút "Request TGS" và "Crack".
- **GoldenTicketWizard**: form nhập hash krbtgt, xuất ticket file.
- **BloodHoundIntegration**: nút "Run SharpHound", hiển thị tiến độ, tải zip.

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số kỹ thuật** | 12+ (LDAP enum, Kerberoast, AS-REP, PtH, Overpass, Golden, Silver, DCSync, DCShadow, ACL abuse, RBCD, BloodHound) |
| **Công cụ tích hợp** | impacket, Rubeus, BloodHound, SharpHound, PowerView (PS), mimikatz |
| **Phạm vi** | Domain Windows Server 2008–2022 |
| **Mức độ an toàn** | Cảnh báo nghiêm ngặt, log đầy đủ |

> **Phantoma AD v1.0.0** — *"Làm chủ miền, kiểm soát mọi quyền"* 👑