# SCHEMA — proxy server

Lưu ở: `<dataDir>/proxy.sql` (mặc định `~/.phantoma/proxy/proxy.sql`).

## sources

| Cột          | Kiểu             | Ghi chú                                                        |
| ------------ | ---------------- | -------------------------------------------------------------- |
| `id`         | TEXT PK          | uuid                                                           |
| `name`       | TEXT NOT NULL    | UNIQUE. Source VPN có tên cố định: `Cloudflare WARP`, `ProtonVPN`, `Foxhole VPN` |
| `type`       | TEXT NOT NULL    | `vpn` (source của VPN-to-proxy) hoặc `normal` (chỉ lưu proxy ở bảng `proxies`) |
| `website_url` | TEXT NOT NULL   | URL website của source (dùng lấy favicon), rỗng = không có, mặc định `''` (schema v7) |
| `ephemeral`  | INTEGER NOT NULL | `1` = proxy/account của source chỉ sống trong phiên chạy của server (hiện chỉ `Cloudflare WARP`), mặc định `0` |
| `created_at` | INTEGER NOT NULL | unix ms                                                        |
| `updated_at` | INTEGER NOT NULL | unix ms                                                        |

`name` là UNIQUE, không phân biệt hoa/thường ở service. Install mới tự tạo source `Default` (`normal`) và các source `vpn`. Source `vpn` không đổi tên/xóa được. Xóa source thì proxy và account của nó bị xóa theo (`ON DELETE CASCADE`). Source `ephemeral = 1`: mỗi lần server khởi động sẽ xóa toàn bộ proxy của source đó và thư mục dữ liệu WARP (`warpService.purgeAccounts`), vì thiết bị WARP chỉ giữ được session trong phiên chạy của server (schema v6). Bảng `vpn_accounts` đã bị xóa (schema v5): id của source VPN chính là id dùng ở API `/vpn/accounts/:id`.

## proxies

| Cột               | Kiểu             | Ghi chú                                      |
| ----------------- | ---------------- | -------------------------------------------- |
| `id`              | TEXT PK          | uuid                                         |
| `source_id`       | TEXT NOT NULL    | FK `sources.id`                              |
| `name`            | TEXT NOT NULL    | tự sinh nếu trống (xem dưới bảng)            |
| `host`            | TEXT NOT NULL    |                                              |
| `port`            | INTEGER NOT NULL | 1–65535                                      |
| `protocol`        | TEXT             | `http`, `https`, `socks4`, `socks5`          |
| `username`        | TEXT NOT NULL    | rỗng = không có (API trả `null`)             |
| `password`        | TEXT NOT NULL    | rỗng = không có (API trả `null`)             |
| `kind`            | TEXT             | `datacenter`, `residential`, `mobile`, `isp` |
| `ownership`       | TEXT             | `private`, `shared`                          |
| `status`          | TEXT             | `healthy`, `degraded`, `dead`, `unchecked`   |
| `provider`        | TEXT             |                                              |
| `country`         | TEXT             | mã ISO viết hoa                              |
| `city`            | TEXT             |                                              |
| `isp`             | TEXT             |                                              |
| `exit_ip`         | TEXT             | IP thoát của lần check gần nhất              |
| `latency_ms`      | INTEGER          | ms của lần check gần nhất                    |
| `success_rate`    | INTEGER          | % thành công                                 |
| `latency_history` | TEXT (JSON)      | 24 mẫu gần nhất, `0` = thất bại              |
| `last_message`    | TEXT NOT NULL    | kết quả lần check gần nhất                   |
| `quota_used_gb`   | REAL             |                                              |
| `quota_total_gb`  | REAL             | NULL/0 = không giới hạn                      |
| `sticky_enabled`  | INTEGER          |                                              |
| `sticky_ttl_min`  | INTEGER          |                                              |
| `rotation_min`    | INTEGER          | 0 = tắt xoay IP                              |
| `max_conns`       | INTEGER          |                                              |
| `tags`            | TEXT (JSON)      | mảng string                                  |
| `used_by`         | TEXT (JSON)      | mảng string                                  |
| `notes`           | TEXT             |                                              |
| `created_at`      | INTEGER          | unix ms                                      |
| `updated_at`      | INTEGER          | unix ms                                      |
| `last_checked`    | INTEGER          | unix ms, NULL được                           |
| `expires_at`      | INTEGER          | unix ms, NULL được                           |

## accounts

Dùng cho các VPN (account)-to-proxy (hiện có `foxhole`, `proton`).

| Cột          | Kiểu                 | Ghi chú                                      |
| ------------ | -------------------- | -------------------------------------------- |
| `id`         | TEXT PK              | uuid                                         |
| `source_id`  | TEXT NOT NULL        | FK `sources.id`, cascade                     |
| `email`      | TEXT NOT NULL        | rỗng nếu chưa biết                           |
| `credential` | TEXT (JSON) NOT NULL | field tùy loại VPN (xem dưới), mặc định `{}` |
| `created_at` | INTEGER NOT NULL     | unix ms                                      |
| `updated_at` | INTEGER NOT NULL     | unix ms                                      |