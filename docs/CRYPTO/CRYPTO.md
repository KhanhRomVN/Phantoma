# 🔐 Phantoma CRYPTO — Tài Liệu Module Mật Mã Học

> **Phiên bản:** 1.0.0  
> **Module:** Cryptography, Hashing & Cipher Attacks  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Hash Cracking — Bẻ Khóa Hash](#2-hash-cracking--bẻ-khóa-hash)
  - [2.1 Nhận Diện Loại Hash](#21-nhận-diện-loại-hash)
  - [2.2 Dictionary Attack](#22-dictionary-attack)
  - [2.3 Brute Force (Mask Attack)](#23-brute-force-mask-attack)
  - [2.4 Rainbow Table](#24-rainbow-table-pre-computed)
  - [2.5 Hash Hiện Đại (bcrypt, scrypt, Argon2, PBKDF2)](#25-hash-hiện-đại-bcrypt-scrypt-argon2-pbkdf2)
  - [2.6 Hash Length Extension Attack](#26-hash-length-extension-attack)
- [3. Mã Hóa Đối Xứng — Symmetric Ciphers](#3-mã-hóa-đối-xứng--symmetric-ciphers)
- [4. Mã Hóa Bất Đối Xứng — Asymmetric Ciphers](#4-mã-hóa-bất-đối-xứng--asymmetric-ciphers)
  - [4.1 RSA — Tấn Công Số Mũ Nhỏ](#41-rsa--tấn-công-số-mũ-nhỏ)
  - [4.2 Tấn Công Wiener (d nhỏ)](#42-tấn-công-wiener-d-nhỏ)
  - [4.3 Tấn Công Common Modulus](#43-tấn-công-common-modulus)
  - [4.4 RSA Nâng Cao (Hastad, Coppersmith, Boneh-Durfee)](#44-rsa-nâng-cao-hastad-coppersmith-boneh-durfee)
  - [4.5 Elliptic Curve Cryptography (ECC) Attacks](#45-elliptic-curve-cryptography-ecc-attacks)
- [5. Tấn Công Giao Thức Mã Hóa](#5-tấn-công-giao-thức-mã-hóa)
  - [5.1 Padding Oracle Attack (CBC mode)](#51-padding-oracle-attack-cbc-mode)
  - [5.2 CBC Bit Flipping Attack](#52-cbc-bit-flipping-attack)
  - [5.3 CRIME / BREACH](#53-crime--breach)
  - [5.4 Lucky13](#54-lucky13-tls-timing-attack)
  - [5.5 JWT (JSON Web Token) Attacks](#55-jwt-json-web-token-attacks)
- [6. Xử Lý Chứng Chỉ Số & SSL/TLS](#6-xử-lý-chứng-chỉ-số--ssltls)
- [7. Cơ Chế An Toàn & Giới Hạn](#7-cơ-chế-an-toàn--giới-hạn)
- [8. Luồng Dữ Liệu & API](#8-luồng-dữ-liệu--api)
- [9. Hướng Dẫn Phát Triển](#9-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **CRYPTO** cung cấp các công cụ để phân tích và tấn công các hệ thống mã hóa, bẻ khóa hash, cũng như xử lý chứng chỉ số.

```
CRYPTO/
├── CRYPTO.md                    ← Tài liệu này
├── index.tsx                    ← Component chính
├── HashCracking/                ← Bẻ khóa hash
│   ├── HashIdentifier.tsx
│   ├── DictionaryAttack.tsx
│   ├── BruteForce.tsx
│   ├── RainbowTable.tsx
│   └── ...
├── Symmetric/                   ← Mã hóa đối xứng
│   ├── AESDecrypt.tsx
│   ├── DESCrack.tsx
│   ├── XORCrack.tsx
│   └── ...
├── Asymmetric/                  ← Mã hóa bất đối xứng
│   ├── RSAKeyCrack.tsx
│   └── ...
├── Protocol/                    ← Tấn công giao thức
│   ├── PaddingOracle.tsx
│   ├── CBCBitFlipping.tsx
│   ├── CRIME_BREACH.tsx
│   └── ...
├── Certificate/                 ← Xử lý chứng chỉ
│   ├── CertParser.tsx
│   ├── CertValidator.tsx
│   └── ...
├── services/                    (hashcat, john, openssl wrapper)
├── types/
└── utils/
```

### 🎯 Các nhóm kỹ thuật chính

| # | Loại | Kỹ thuật |
|---|------|----------|
| 1 | Hash Cracking | MD5, SHA1, SHA256, NTLM, bcrypt, etc. |
| 2 | Symmetric | AES, DES, 3DES, XOR, RC4 |
| 3 | Asymmetric | RSA (small key, common modulus, Wiener) |
| 4 | Protocol | Padding Oracle (CBC), CRIME/BREACH, Lucky13 |
| 5 | Certificate | Parse, validate, check revocation |

---

## 2. Hash Cracking — Bẻ Khóa Hash

### 2.1 Nhận Diện Loại Hash

| Đầu vào | Mô tả |
|---------|-------|
| `hash` | Chuỗi hash cần nhận diện |
| `suggestedType` | Gợi ý loại (nếu có) |

**Cơ chế:** Dựa vào độ dài, ký tự, pattern:
- MD5: 32 ký tự hex
- SHA1: 40 hex
- SHA256: 64 hex
- NTLM: 32 hex (thường viết hoa)
- bcrypt: bắt đầu bằng `$2a$`, `$2b$`, `$2y$`

**Công cụ:** `hashid`, `hash-identifier`.

**Output:** `{ possibleTypes: string[], certainty: number }`.

### 2.2 Dictionary Attack

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `hash` | `string` | Hash cần bẻ |
| `hashType` | `string` | Loại hash (md5, sha256, ntlm, ...) |
| `wordlist` | `string` | Đường dẫn đến file wordlist (hoặc nội dung) |
| `rules` | `string[]` | Các luật biến đổi (leet, append number...) |

**Công cụ:** `hashcat -m <type> -a 0 hash.txt wordlist.txt`, `john --wordlist`.

**Output:** `{ success: boolean, password: string, attempts: number, timeElapsed: number }`.

### 2.3 Brute Force (Mask Attack)

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `hash` | `string` | Hash cần bẻ |
| `hashType` | `string` | Loại hash |
| `mask` | `string` | Mask như `?l?l?l?d?d` (3 chữ cái + 2 số) |
| `minLength` | `number` | Độ dài tối thiểu |
| `maxLength` | `number` | Độ dài tối đa |

**Công cụ:** `hashcat -a 3 -m <type> hash.txt ?l?l?l?d?d`.

### 2.4 Rainbow Table (pre‑computed)

- Dùng cho các hash không salt (cũ).
- Có thể dùng các bảng có sẵn như `RainbowCrack`, `Ophcrack` (cho NTLM).

---

## 3. Mã Hóa Đối Xứng — Symmetric Ciphers

### 3.1 AES — Giải Mã Với Khóa Biết Trước

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `ciphertext` | `string` (base64 hoặc hex) | Dữ liệu mã hóa |
| `key` | `string` | Khóa bí mật |
| `iv` | `string?` | Initialization vector (nếu có) |
| `mode` | `'CBC' \| 'GCM' \| 'ECB'` | Chế độ |
| `padding` | `'PKCS7' \| 'Zero' \| 'None'` | Padding scheme |

**Output:** `plaintext: string`.

### 3.2 DES / 3DES Cracking (Brute Force)

- DES có key 56 bit, có thể brute force (tối đa 2^56 ≈ 72 triệu tỷ – cần GPU mạnh).
- 3DES mạnh hơn, thường tấn công bằng Meet‑in‑the‑middle nếu biết cặp plaintext/ciphertext.

**Component:** `Symmetric/DESCrack.tsx` – chạy với từ điển key hoặc brute force giới hạn.

### 3.3 XOR Cracking (Multi‑time Pad)

- Khi cùng một key XOR với nhiều ciphertext → có thể khôi phục key hoặc plaintext.
- Công cụ: `xortool`.

---

## 4. Mã Hóa Bất Đối Xứng — Asymmetric Ciphers

### 4.1 RSA — Tấn Công Số Mũ Nhỏ

| Kịch bản | Mô tả |
|----------|-------|
| `e = 3` | Nếu plaintext nhỏ, `c = m^3 < n` → có thể căn bậc 3 |
| `e = 65537` (không tấn công được) | Phổ biến, an toàn nếu đủ padding |
| `n` phân tích được | Nếu n quá nhỏ, có thể dùng `factordb` hoặc `yafu` |

**Công cụ:** `RsaCtfTool`, `sage`.

### 4.2 Tấn Công Wiener (d nhỏ)

- Nếu private exponent `d` quá nhỏ, có thể dùng Wiener attack.
- Áp dụng khi `d < (1/3)*N^(1/4)`.

### 4.3 Tấn Công Common Modulus

- Cùng modulus `n`, hai cặp `(e1, c1)` và `(e2, c2)` có thể tìm lại plaintext nếu `gcd(e1, e2)=1`.

---

## 5. Tấn Công Giao Thức Mã Hóa

### 5.1 Padding Oracle Attack (CBC mode)

| Điều kiện | Mô tả |
|-----------|-------|
| Server trả về lỗi padding khác biệt | Có thể dùng để giải mã bất kỳ ciphertext |
| Ứng dụng (ASP.NET, Java) | Thường gặp trong các framework cũ |

**Công cụ:** `padbuster`.

**Quy trình:**
1. Gửi ciphertext đã sửa byte cuối.
2. Quan sát lỗi padding.
3. Dần dần giải mã từng byte.

### 5.2 CBC Bit Flipping Attack

- Sửa ciphertext block để thay đổi plaintext tương ứng.
- Thường dùng để nâng quyền (ví dụ thay `"admin=0"` thành `"admin=1"`).

### 5.3 CRIME / BREACH (Compression side‑channel)

- Tấn công nén TLS (CRIME) hoặc HTTP (BREACH).
- Bằng cách chèn payload vào request, đo kích thước response để suy ra secret.

### 5.4 Lucky13 (TLS timing attack)

- Dựa trên thời gian xử lý padding trong CBC mode.

### 5.5 JWT (JSON Web Token) Attacks

JWT (`Header.Payload.Signature`) là chuẩn xác thực phổ biến. Module hỗ trợ các tấn công:

| Kỹ thuật | Mô tả | Công cụ |
|----------|-------|---------|
| **None Algorithm** | `alg: "none"` → bỏ qua chữ ký, token luôn hợp lệ | `jwt_tool`, `jwt.io` |
| **HS256→RS256 Confusion** | Dùng public key (RS256) làm HMAC secret (HS256) | `jwt_tool -X k` |
| **Kid Injection (Path Traversal)** | `kid: "../../tmp/key"` đọc file tùy ý | custom |
| **Kid Injection (Command Injection)** | `kid: "key; whoami"` (nếu backend dùng `system()`) | custom |
| **JKU (JWK Set URL) SSRF** | `jku: "http://attacker.com/jwks.json"` → dùng JWK giả | custom |
| **CVE‑2015‑9235 (key confusion)** | `alg: RS256` nhưng dùng public key làm secret | `jwt_forgery` |
| **Weak HMAC Secret Bruteforce** | HS256 với secret yếu | `hashcat -m 16500` |
| **JWK Injection** | Nhúng JWK trực tiếp vào header | custom |

**Quy trình kiểm tra JWT:**
1. Decode token (base64)
2. Kiểm tra `alg` có phải `none` không
3. Thử `HS256→RS256` confusion
4. Bruteforce HS256 secret (nếu cần)
5. Kiểm tra `kid`, `jku`, `x5u` injection

**Công cụ:** `jwt_tool`, `c-jwt-cracker`, `hashcat -m 16500`.

**Component:** `Protocol/JWTAttack.tsx` – nhập JWT token, chọn attack, hiển thị forged token.

---

## 6. Xử Lý Chứng Chỉ Số & SSL/TLS

### 6.1 Parse Chứng Chỉ

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `subject` | `string` | CN, O, OU, etc. |
| `issuer` | `string` | Nhà phát hành |
| `serialNumber` | `string` | Số serial |
| `validFrom` | `string` | Ngày bắt đầu |
| `validTo` | `string` | Ngày hết hạn |
| `publicKey` | `string` | Public key (PEM) |
| `signatureAlgorithm` | `string` | RSA, ECDSA, ... |
| `san` | `string[]` | Subject Alternative Names |
| `extensions` | `object` | Các extension (KeyUsage, BasicConstraints) |

**Công cụ:** `openssl x509 -in cert.pem -text -noout`.

### 6.2 Kiểm Tra Chứng Chỉ

| Kiểm tra | Mô tả |
|----------|-------|
| Hết hạn | `validTo < now` |
| Tự ký | `issuer == subject` |
| Weak key length | RSA < 2048 bits |
| CRL / OCSP | Kiểm tra thu hồi |
| Domain mismatch | Kiểm tra SAN có chứa domain cần không |

### 6.3 Tìm Chứng Chỉ (Certificate Transparency)

- Dùng `crt.sh` API tìm tất cả chứng chỉ của một domain.

---

## 7. Cơ Chế An Toàn & Giới Hạn

### 7.1 Giới hạn tài nguyên

- Hash cracking chỉ chạy trong thời gian giới hạn (có thể cấu hình, mặc định 30 phút).
- Chỉ sử dụng CPU (không tự động dùng GPU trừ khi được bật).

### 7.2 Wordlist an toàn

- Không tự động tải wordlist từ nguồn không rõ ràng.
- Wordlist mặc định: `rockyou.txt` (đã cắt bớt), `SecLists`.

### 7.3 Không giải mã trái phép

- Module yêu cầu xác nhận "Tôi có quyền giải mã dữ liệu này" trước khi chạy.

---

## 8. Luồng Dữ Liệu & API

```
User → (chọn kỹ thuật, nhập hash/ciphertext) → chạy
   ↓
Backend: gọi hashcat / john / openssl / custom script
   ↓
Trả về kết quả (password, plaintext, ...)
```

### Endpoints dự kiến

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/crypto/hash/identify` | `{ hash }` | Nhận dạng loại hash |
| POST | `/api/crypto/hash/crack` | `{ hash, hashType, wordlist, rules? }` | Bẻ khóa |
| POST | `/api/crypto/symmetric/decrypt` | `{ ciphertext, key, iv?, mode, padding }` | Giải mã AES |
| POST | `/api/crypto/rsa/decrypt` | `{ ciphertext, n, d (or p,q) }` | RSA decrypt |
| POST | `/api/crypto/padding/oracle` | `{ targetUrl, ciphertext, blockSize }` | Padding Oracle |
| POST | `/api/crypto/cert/parse` | `{ certPem }` | Parse chứng chỉ |
| GET | `/api/crypto/cert/ct` | `{ domain }` | CT logs |

---

## 9. Hướng Dẫn Phát Triển

### 9.1 Các thư viện cần dùng

| Ngôn ngữ | Thư viện |
|----------|----------|
| Node.js | `crypto` (native), `node-forge`, `asn1.js` |
| Python (gọi từ Node) | `hashcat`, `john`, `pycryptodome`, `rsactftool` |

### 9.2 Tích hợp hashcat

- Gọi `hashcat` với tham số phù hợp.
- Parse output JSON (`-O` hoặc `--outfile-format`).

### 9.3 UI Components

- **HashIdentifier**: ô nhập hash, hiển thị gợi ý loại, nút "Copy to Cracker".
- **HashCracker**: chọn loại hash, chọn wordlist, nút "Start", progress bar.
- **PaddingOracleWizard**: nhập URL, ciphertext, block size, chạy, hiển thị giải mã.

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số kỹ thuật** | 25+ (hash ID, dictionary/brute/rainbow, bcrypt/scrypt/Argon2, length extension, AES, DES, XOR, RSA small key/wiener/common modulus/broadcast/coppersmith/boneh, ECC (invalid curve, nonce reuse, subgroup), padding oracle, CBC flip, CRIME, JWT (none/confusion/kid/jku), cert parse, CT) |
| **Công cụ tích hợp** | hashcat, john, openssl, padbuster, rsactftool, xortool, jwt_tool, hash_extender, sage, ecctool |
| **Hiệu năng** | Có thể xử lý hash tốc độ cao nếu dùng GPU |
| **Mức độ an toàn** | Cảnh báo, giới hạn thời gian, xác nhận quyền |

> **Phantoma CRYPTO v1.0.0** — *"Giải mã bí ẩn, làm sáng tỏ thông tin"* 🔓