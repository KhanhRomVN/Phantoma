# Nmap (Network Mapper) - Tài liệu đầy đủ

Nmap (Network Mapper) là công cụ quét mạng và bảo mật mã nguồn mở hàng đầu, được sử dụng để phát hiện host, dịch vụ, lỗ hổng trên mạng máy tính.

## Tính năng chính

- **Host discovery** (ping sweeps) - Phát hiện các host đang hoạt động trên mạng
- **Port scanning** (TCP, UDP, SYN, FIN, etc.) - Quét cổng với nhiều kỹ thuật khác nhau
- **Service and version detection** (-sV) - Phát hiện dịch vụ và phiên bản đang chạy
- **OS fingerprinting** (-O) - Xác định hệ điều hành của target
- **Nmap Scripting Engine (NSE)** - Hơn 600 script cho các tác vụ nâng cao
- **IPv6 support** - Hỗ trợ đầy đủ IPv6
- **Firewall/IDS evasion** - Kỹ thuật né tránh tường lửa và IDS

---

## BẢNG FLAGS ĐẦY ĐỦ

### Loại quét (Scan Types)

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-sS` | SYN stealth scan (cần root) | `nmap -sS 192.168.1.1` |
| `-sT` | TCP Connect scan (không cần root) | `nmap -sT 192.168.1.1` |
| `-sU` | UDP scan (chậm) | `nmap -sU 192.168.1.1` |
| `-sA` | ACK scan (phát hiện tường lửa) | `nmap -sA 192.168.1.1` |
| `-sW` | Window scan | `nmap -sW 192.168.1.1` |
| `-sM` | Maimon scan | `nmap -sM 192.168.1.1` |
| `-sN` | TCP null scan | `nmap -sN 192.168.1.1` |
| `-sF` | FIN scan | `nmap -sF 192.168.1.1` |
| `-sX` | Xmas scan (FIN+PSH+URG) | `nmap -sX 192.168.1.1` |
| `--scanflags` | Tùy chỉnh cờ TCP | `nmap --scanflags SYN,ACK 192.168.1.1` |
| `-sI <zombie>` | Idle scan (zombie) | `nmap -sI 192.168.0.10 192.168.1.1` |
| `-sO` | Quét giao thức IP | `nmap -sO 192.168.1.1` |
| `-b <FTP relay>` | FTP bounce scan | `nmap -b ftp.example.com 192.168.1.1` |

### Phát hiện Host (Host Discovery - Ping)

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-Pn` | Bỏ qua phát hiện host (không ping) | `nmap -Pn 192.168.1.1` |
| `-PS` | Ping TCP SYN | `nmap -PS22,80,443 192.168.1.1` |
| `-PA` | Ping TCP ACK | `nmap -PA22,80,443 192.168.1.1` |
| `-PU` | Ping UDP | `nmap -PU53,161 192.168.1.1` |
| `-PY` | Ping SCTP | `nmap -PY 192.168.1.1` |
| `-PE` | Ping ICMP echo | `nmap -PE 192.168.1.1` |
| `-PP` | Ping ICMP timestamp | `nmap -PP 192.168.1.1` |
| `-PM` | Ping ICMP netmask | `nmap -PM 192.168.1.1` |
| `-PO` | Ping giao thức IP | `nmap -PO1,2,4 192.168.1.1` |

### DNS

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-n` | Không phân giải DNS | `nmap -n 192.168.1.1` |
| `-R` | Luôn phân giải DNS | `nmap -R example.com` |
| `--dns-servers <servers>` | Chỉ định máy chủ DNS | `nmap --dns-servers 8.8.8.8,1.1.1.1` |
| `--system-dns` | Dùng DNS hệ thống | `nmap --system-dns example.com` |

### IPv6

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-6` | Bật quét IPv6 | `nmap -6 2001:db8::1` |

### Phát hiện hệ điều hành và phiên bản

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-A` | Quét aggressive (OS + version + scripts + traceroute) | `nmap -A example.com` |
| `-O` | Phát hiện hệ điều hành | `nmap -O example.com` |
| `--osscan-guess` | Đoán OS mạnh hơn | `nmap -O --osscan-guess example.com` |
| `-sV` | Phát hiện phiên bản dịch vụ | `nmap -sV example.com` |
| `--version-intensity <0-9>` | Cường độ dò version (cao hơn = chậm hơn) | `nmap -sV --version-intensity 9` |
| `--version-light` | Dò version nhẹ (intensity 2) | `nmap -sV --version-light` |
| `--version-all` | Thử tất cả probe version | `nmap -sV --version-all` |

### NSE Scripts

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-sC` | Chạy script mặc định (--script default) | `nmap -sC example.com` |
| `--script <category/script>` | Chạy script cụ thể | `nmap --script vuln example.com` |
| `--script-args <args>` | Tham số cho script | `nmap --script http-title --script-args http.useragent="Mozilla"` |
| `--script-trace` | Hiển thị thực thi script | `nmap --script vuln --script-trace` |
| `--script-updatedb` | Cập nhật cơ sở dữ liệu script | `nmap --script-updatedb` |

### Timing và hiệu suất

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-T0` | Chậm nhất (paranoid) | `nmap -T0 example.com` |
| `-T1` | Rất chậm (sneaky) | `nmap -T1 example.com` |
| `-T2` | Chậm (polite) | `nmap -T2 example.com` |
| `-T3` | Bình thường (mặc định) | `nmap -T3 example.com` |
| `-T4` | Nhanh (aggressive) | `nmap -T4 example.com` |
| `-T5` | Rất nhanh (insane) | `nmap -T5 example.com` |
| `--min-hostgroup <size>` | Nhóm host song song tối thiểu | `nmap --min-hostgroup 50 192.168.1.0/24` |
| `--max-hostgroup <size>` | Nhóm host song song tối đa | `nmap --max-hostgroup 10` |
| `--min-parallelism <num>` | Probe song song tối thiểu | `nmap --min-parallelism 100` |
| `--max-parallelism <num>` | Probe song song tối đa | `nmap --max-parallelism 1` |
| `--min-rtt-timeout <time>` | Timeout RTT tối thiểu | `nmap --min-rtt-timeout 100ms` |
| `--max-rtt-timeout <time>` | Timeout RTT tối đa | `nmap --max-rtt-timeout 10s` |
| `--initial-rtt-timeout <time>` | Timeout RTT ban đầu | `nmap --initial-rtt-timeout 500ms` |
| `--max-retries <num>` | Số lần thử lại tối đa | `nmap --max-retries 0` |
| `--host-timeout <time>` | Timeout cho mỗi host | `nmap --host-timeout 30m` |
| `--scan-delay <time>` | Độ trễ giữa các probe | `nmap --scan-delay 1s` |
| `--max-scan-delay <time>` | Độ trễ tối đa | `nmap --max-scan-delay 10s` |
| `-F` | Fast scan (100 cổng phổ biến) | `nmap -F example.com` |

### Kỹ thuật né tránh/che giấu

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-f` | Phân mảnh gói tin | `nmap -f example.com` |
| `-ff` | Phân mảnh thành 8 byte | `nmap -ff example.com` |
| `--mtu <size>` | Đặt MTU cho phân mảnh | `nmap --mtu 24 example.com` |
| `-D <decoy1,decoy2,...>` | Quét với địa chỉ mồi (decoy) | `nmap -D 10.0.0.1,10.0.0.2,ME example.com` |
| `-S <IP>` | Giả mạo IP nguồn | `nmap -S 10.0.0.1 example.com` |
| `-e <interface>` | Chỉ định giao diện mạng | `nmap -e eth0 example.com` |
| `-g <port>` | Chỉ định cổng nguồn | `nmap -g 53 example.com` |
| `--source-port <port>` | Chỉ định cổng nguồn | `nmap --source-port 53 example.com` |
| `--data-length <num>` | Thêm dữ liệu ngẫu nhiên | `nmap --data-length 200 example.com` |
| `--ip-options <options>` | Tùy chọn IP | `nmap --ip-options "R" example.com` |
| `--ttl <value>` | Đặt TTL cho IP | `nmap --ttl 5 example.com` |
| `--spoof-mac <MAC>` | Giả mạo địa chỉ MAC | `nmap --spoof-mac 00:11:22:33:44:55` |
| `--badsum` | Gửi checksum sai | `nmap --badsum example.com` |

### Định dạng output

| Flag | Mô tả | Ví dụ |
|------|-------|-------|
| `-oN <file>` | Xuất output dạng normal | `nmap -oN scan.txt example.com` |
| `-oX <file>` | Xuất output dạng XML | `nmap -oX scan.xml example.com` |
| `-oG <file>` | Xuất output dạng grepable | `nmap -oG scan.grep example.com` |
| `-oA <basename>` | Xuất tất cả định dạng (normal, XML, grepable) | `nmap -oA scan example.com` |
| `-v` | Chi tiết (verbose) | `nmap -v example.com` |
| `-vv` | Rất chi tiết | `nmap -vv example.com` |
| `-d` | Gỡ lỗi (debug) | `nmap -d example.com` |
| `--reason` | Hiển thị lý do trạng thái cổng | `nmap --reason example.com` |
| `--open` | Chỉ hiển thị cổng mở | `nmap --open example.com` |
| `--packet-trace` | Theo dõi gói tin gửi/nhận | `nmap --packet-trace example.com` |
| `--iflist` | Liệt kê giao diện mạng và router | `nmap --iflist` |
| `--append-output` | Ghi thêm vào file output | `nmap -oN scan.txt --append-output example.com` |
| `--resume <file>` | Tiếp tục quét bị gián đoạn | `nmap --resume scan.xml` |
| `--stylesheet <URL>` | Stylesheet cho XML | `nmap --stylesheet https://example.com/style.xsl` |
| `--webxml` | Dùng web XML stylesheet | `nmap --webxml -oX scan.xml` |
| `--no-stylesheet` | Bỏ qua stylesheet XML | `nmap --no-stylesheet -oX scan.xml` |

---

## Ví dụ kết hợp nâng cao

```bash
# Quét stealth với script vuln và version detection
sudo nmap -sS -sV --script vuln -T4 -p- 192.168.1.1

# Quét UDP nhanh với top 20 cổng
nmap -sU --top-ports 20 192.168.1.1

# Quét toàn bộ mạng con, phát hiện OS, output XML
nmap -O -oX network_scan.xml 192.168.1.0/24

# Né tránh tường lửa với decoy và fragmentation
nmap -D 10.0.0.1,10.0.0.2,ME -f 192.168.1.1

# Quét script http vulnerabilities
nmap --script http-vuln-* -p80,443 example.com
```

## Lưu ý quan trọng

- **Quyền root**: Các scan stealth (-sS, -sF, -sX, -sN, -sA, -sW, -sM, -sO) và OS detection (-O) yêu cầu quyền root/sudo
- **Pháp lý**: Luôn có authorization trước khi scan các hệ thống không thuộc quyền sở hữu. Quét trái phép là bất hợp pháp ở nhiều quốc gia
- **Performance**: Timing càng cao (T5) càng nhanh nhưng dễ bị phát hiện, có thể gây mất gói tin hoặc làm quá tải mạng
- **Aggressive**: -A tạo nhiều traffic, có thể bị IDS/IPS chặn hoặc gây chú ý
- **XML Output**: Định dạng -oX rất hữu ích cho tự động hóa và phân tích