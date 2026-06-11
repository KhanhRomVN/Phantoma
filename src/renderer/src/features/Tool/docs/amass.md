# Amass — OWASP Subdomain Enumeration

Amass là công cụ OWASP hàng đầu cho subdomain enumeration, network mapping, và external asset discovery. Nó sử dụng nhiều nguồn dữ liệu (passive) và kỹ thuật active để tìm kiếm subdomain.

## Tính năng chính

- **Passive enumeration**: 100+ nguồn dữ liệu (AlienVault, Censys, Shodan, VirusTotal, DNSDB, v.v.)
- **Active enumeration**: Brute force DNS, zone transfers, reverse DNS
- **Network mapping**: ASN lookup, IP ranges, certificate transparency logs
- **Output formats**: JSON, CSV, Graphviz (DOT), text
- **Visualization**: Tạo sơ đồ network mapping

---

## BẢNG FLAGS AMASS

### Chế độ hoạt động

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `enum` | Chế độ chính - enum subdomain | `amass enum -d example.com` |
| `intel` | Thu thập thông tin về target | `amass intel -whois -d example.com` |
| `db` | Tương tác với cơ sở dữ liệu | `amass db -names` |

### Cờ cơ bản (enum)

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-d` | Domain target | `amass enum -d example.com` |
| `-o` | Output file | `amass enum -d example.com -o results.txt` |
| `-oA` | Output tất cả định dạng | `amass enum -d example.com -oA scan` |
| `-json` | Output JSON | `amass enum -d example.com -json out.json` |
| `-csv` | Output CSV | `amass enum -d example.com -csv out.csv` |
| `-dir` | Thư mục output | `amass enum -d example.com -dir /tmp/amass` |

### Nguồn dữ liệu (Data Sources)

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-active` | Bật active enumeration | `amass enum -active -d example.com` |
| `-brute` | Brute force subdomain | `amass enum -brute -d example.com` |
| `-w` | Wordlist cho brute force | `amass enum -brute -w wordlist.txt -d example.com` |
| `-min-for-recursive` | Ngưỡng recursive brute | `amass enum -brute -min-for-recursive 3 -d example.com` |
| `-passive` | Chỉ passive enumeration | `amass enum -passive -d example.com` |
| `-no-dns` | Bỏ qua DNS resolution | `amass enum -no-dns -d example.com` |

### Kiểm soát nguồn dữ liệu

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-config` | File cấu hình API keys | `amass enum -config config.ini -d example.com` |
| `-include` | Chỉ sử dụng các nguồn cụ thể | `amass enum -include crtsh,alienvault -d example.com` |
| `-exclude` | Loại trừ các nguồn | `amass enum -exclude archiveit -d example.com` |

### Cờ khác

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-v` | Verbose output | `amass enum -v -d example.com` |
| `-vv` | Very verbose | `amass enum -vv -d example.com` |
| `-log` | Ghi log ra file | `amass enum -log amass.log -d example.com` |
| `-timeout` | Timeout (giây) | `amass enum -timeout 30 -d example.com` |
| `-max-dns-queries` | Giới hạn DNS queries | `amass enum -max-dns-queries 10000 -d example.com` |
| `-dns-qps` | DNS queries per second | `amass enum -dns-qps 10 -d example.com` |
| `-resolvers` | File chứa DNS resolvers | `amass enum -resolvers resolvers.txt -d example.com` |

---

## Các nguồn dữ liệu (Data Sources)

Amass thu thập từ nhiều nguồn:

| Nguồn | Loại | Mô tả |
|-------|------|-------|
| `crtsh` | Passive | Certificate Transparency logs |
| `alienvault` | Passive | OTX threat intelligence |
| `wayback` | Passive | Wayback Machine archive |
| `shodan` | Passive | Shodan search engine |
| `censys` | Passive | Censys certificate search |
| `virustotal` | Passive | VirusTotal domain reports |
| `dnsdb` | Passive | Farsight DNSDB |
| `archiveit` | Passive | Archive.it |
| `dnsdumpster` | Passive | DNSDumpster |
| `dnslytics` | Passive | DNSlytics |
| `networksdb` | Passive | NetworksDB |
| `binaryedge` | Passive | BinaryEdge |
| `securitytrails` | Passive | SecurityTrails |
| `rapiddns` | Passive | RapidDNS |
| `sitedossier` | Passive | SiteDossier |
| `threatcrowd` | Passive | ThreatCrowd |
| `threatminer` | Passive | ThreatMiner |
| `bufferover` | Passive | BufferOver |
| `hackerone` | Passive | HackerOne |

---

## Ví dụ kết hợp

```bash
# Passive enumeration (nhanh, không gửi request)
amass enum -passive -d example.com

# Active + Brute force (chậm hơn, toàn diện hơn)
amass enum -active -brute -w /usr/share/wordlists/subdomains.txt -d example.com

# Với resolvers tùy chỉnh
amass enum -d example.com -resolvers resolvers.txt -dns-qps 20

# Thu thập thông tin ASN
amass intel -whois -d example.com

# Output JSON để parse
amass enum -d example.com -json results.json -o results.txt
```

## Output

Amass trả về danh sách subdomain, mỗi dòng một subdomain:

```
mail.example.com
www.example.com
api.example.com
admin.example.com
dev.example.com
...
```

## Lưu ý quan trọng

- **API Keys**: Một số nguồn yêu cầu API key (Shodan, Censys, VirusTotal) - cấu hình trong file config
- **Rate limiting**: Sử dụng `-dns-qps` để tránh bị chặn
- **Pháp lý**: Chỉ scan các domain bạn có quyền
- **Performance**: Enum đầy đủ có thể mất vài giờ đến vài ngày