# Nmap (Network Mapper)

Nmap là công cụ quét mạng và bảo mật mã nguồn mở hàng đầu, được sử dụng để phát hiện host và dịch vụ trên mạng máy tính.

## Tính năng chính

- **Host discovery** (ping sweeps) - Phát hiện các host đang hoạt động trên mạng
- **Port scanning** (TCP, UDP, SYN, FIN, etc.) - Quét cổng với nhiều kỹ thuật khác nhau
- **Service and version detection** (-sV) - Phát hiện dịch vụ và phiên bản đang chạy
- **OS fingerprinting** (-O) - Xác định hệ điều hành của target
- **Nmap Scripting Engine (NSE)** - Hơn 600 script cho các tác vụ nâng cao
- **IPv6 support** - Hỗ trợ đầy đủ IPv6

## Các tham số quan trọng

| Flag | Mô tả |
|------|-------|
| `-sS` | SYN stealth scan (cần root) |
| `-sT` | TCP Connect scan (không cần root) |
| `-sU` | UDP scan |
| `-sV` | Version detection |
| `-O` | OS detection |
| `-A` | Aggressive scan (OS + version + scripts + traceroute) |
| `-p` | Specify ports (ví dụ: `-p 22,80,443` hoặc `-p 1-1000`) |
| `-T0` đến `-T5` | Timing templates (T0 chậm nhất, T5 nhanh nhất) |
| `--script` | Chạy NSE script (ví dụ: `--script vuln`) |

## Ví dụ sử dụng

```bash
# Quét cơ bản
nmap example.com

# Quét với version detection
nmap -sV example.com

# OS detection
nmap -O example.com

# Aggressive scan (toàn diện)
nmap -A example.com

# Quét các cổng cụ thể
nmap -p 22,80,443 example.com

# SYN stealth scan (cần sudo)
sudo nmap -sS example.com

# Quét script lỗ hổng
nmap --script vuln example.com

# Quét nhanh với timing T4
nmap -T4 -F example.com
```

## Lưu ý

- Một số scan types (SYN, FIN, etc.) yêu cầu quyền root
- Timing càng cao (T5) càng nhanh nhưng dễ bị phát hiện và có thể gây mất gói tin
- Aggressive scan (-A) tạo nhiều traffic, có thể bị IDS/IPS phát hiện
- Luôn có authorization trước khi scan các hệ thống không thuộc quyền sở hữu