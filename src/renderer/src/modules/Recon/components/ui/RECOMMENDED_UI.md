# Đề xuất UI mới cho Recon

Tài liệu này đánh giá bộ UI hiện có (14 loại trong `README.md`) và đề xuất các UI cần thêm để Recon xử lý được đa dạng tác vụ: trinh sát email, ảnh, camera quanh vị trí, domain, username, số điện thoại, IP, v.v.

Cú pháp mẫu bám đúng quy ước `.recon` hiện tại (`@box ...`, dòng `a | b | c`, `{color=}`, `{tone=}`, `{src=}`). Đây là mẫu để duyệt, chưa phải spec cuối.

## 1. Đánh giá nhanh

Bộ UI hiện tại mạnh ở hiển thị dữ liệu dạng chữ và cấu trúc: `kv`, `table`, `timeline`, `checklist`, `graph`, `callout`, `annotation`, `map`, `files`, cộng 2 biểu đồ `donut` và `barline`.

Còn thiếu ở 5 nhóm:

| Nhóm thiếu | Hệ quả hiện tại | Tác vụ bị ảnh hưởng |
|---|---|---|
| Thẻ thực thể (người, tài khoản, domain) | Phải nhồi vào `kv` hoặc `table`, mất ảnh đại diện và nhãn nền tảng | Email, username, mạng xã hội |
| Kết quả có hình (ảnh, link preview) | `files` chỉ hợp file nội bộ, không có độ giống, nguồn, trạng thái | Tìm ảnh ngược, trang liên quan tới ảnh |
| Dữ liệu không gian có thuộc tính | `map` chỉ có điểm và vùng, không có loại marker, bán kính, hướng nhìn | Camera quanh tôi, wifi, trạm sóng |
| Chỉ số tổng quan và tiến trình | Không có KPI, điểm rủi ro, trạng thái chạy của từng bước trinh sát | Mọi task lớn nhiều bước |
| So sánh và bằng chứng | Không có đối chiếu 2 bên, ảnh có đánh dấu vùng, lịch sử thay đổi | Xác minh khuôn mặt, WHOIS history, chứng cứ |

Kết luận: đủ để trình bày báo cáo dạng văn bản, chưa đủ để làm công cụ trinh sát trực quan. Nên thêm khoảng 6 UI ưu tiên P0 trước.

## 2. Bảng tổng hợp

| Ưu tiên | `ui=` | Tên | Giải quyết |
|---|---|---|---|
| P0 | `stat` | Thẻ chỉ số | Số liệu tổng quan đầu báo cáo |
| P0 | `profile` | Thẻ thực thể | Người, tài khoản, domain, email |
| P0 | `gallery` | Lưới ảnh kết quả | Tìm ảnh ngược, ảnh liên quan |
| P0 | `links` | Danh sách liên kết | Website liên quan, kết quả tìm kiếm |
| P0 | `map` (mở rộng) | Bản đồ có loại marker | Camera, wifi, trạm sóng, bán kính |
| P0 | `steps` | Tiến trình trinh sát | Trạng thái từng bước, nguồn đã quét |
| P1 | `gauge` | Đồng hồ điểm số | Điểm rủi ro, độ tin cậy tổng |
| P1 | `evidence` | Ảnh bằng chứng | Ảnh có đánh dấu vùng, ghim |
| P1 | `compare` | So sánh 2 bên | Khuôn mặt, ảnh gốc và ảnh tìm thấy |
| P1 | `tags` | Nhóm thẻ có thể copy | Username, alias, số điện thoại |
| P1 | `heatmap` | Bản đồ nhiệt thời gian | Giờ hoạt động của tài khoản |
| P1 | `tree` | Cây phân cấp | Subdomain, ASN, thư mục |
| P1 | `host` | Thẻ máy chủ | IP, cổng mở, dịch vụ, chứng chỉ |
| P1 | `diff` | Lịch sử thay đổi | WHOIS, DNS, nội dung trang |
| P1 | `bar` | Cột ngang xếp hạng | Top domain, top nền tảng |
| P2 | `tabs`, `radar`, `media`, `wordcloud`, `sankey` | Xem mục 5 | Bổ sung sau |

## 3. Chi tiết P0

### 3.1 stat - Thẻ chỉ số

Hàng thẻ số liệu lớn, đặt đầu báo cáo để nắm nhanh kết quả.

```recon
# Tổng quan
@box w=10 h=2 ui=stat

- Subdomain | 47 | +12 so với lần trước {color=blue}
- Rò rỉ dữ liệu | 3 | Cần xử lý {tone=danger}
- Tài khoản liên quan | 18 | 6 nền tảng {color=purple}
- Độ tin cậy TB | 0.82 | 31 nguồn {tone=ok}
```

Dạng `nhãn | giá trị | ghi chú`.

```text
┌───────────┬───────────┬───────────┬───────────┐
│ Subdomain │ Rò rỉ     │ Tài khoản │ Tin cậy   │
│    47     │     3     │    18     │   0.82    │
│ +12       │ Cần xử lý │ 6 nền tảng│ 31 nguồn  │
└───────────┴───────────┴───────────┴───────────┘
```

### 3.2 profile - Thẻ thực thể

Một hoặc nhiều thẻ cho người, tài khoản, domain, email. Có ảnh đại diện, loại, nền tảng, vài trường chính và nguồn.

```recon
# Hồ sơ liên quan
@box w=5 h=6 ui=profile cols=1

- person | Nguyễn Văn A | @nguyenvana | https://example.com/avatar.jpg {src=S-001} {conf=0.9}
  - Email: a.nguyen@gmail.com
  - Nơi ở: An Giang
  - Nền tảng: Facebook, GitHub
- domain | nguyenvana.com | Đăng ký 2019 {color=cyan}
```

Dạng `loại | tên | phụ đề | ảnh`; dòng con thụt 2 dấu cách là cặp `khoá: giá trị`.

```text
┌──────────────────────────────┐
│ (ảnh)  Nguyễn Văn A   [person]│
│        @nguyenvana     90%    │
│  Email   a.nguyen@gmail.com   │
│  Nơi ở   An Giang             │
│  [Facebook] [GitHub]   S-001  │
└──────────────────────────────┘
```

### 3.3 gallery - Lưới ảnh kết quả

Kết quả tìm ảnh ngược hoặc ảnh liên quan: thumbnail, độ giống, trang nguồn. Khác `files` ở chỗ mỗi ô có metadata của kết quả web.

```recon
# Ảnh khớp
@box w=10 h=8 ui=gallery cols=4 sort=score:desc

- https://img.example/1.jpg | 0.96 | facebook.com | Ảnh đại diện cũ {color=green}
- https://img.example/2.jpg | 0.81 | tiktok.com | Video thumbnail {color=yellow}
- https://img.example/3.jpg | 0.55 | blogspot.com | Ảnh trong bài viết {color=orange}
```

Dạng `url ảnh | độ giống | domain nguồn | chú thích`. Bấm vào ô mở xem lớn và liên kết sang trang gốc.

```text
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ (ảnh)  │ │ (ảnh)  │ │ (ảnh)  │ │ (ảnh)  │
│ 96%    │ │ 81%    │ │ 55%    │ │ ...    │
│facebook│ │ tiktok │ │blogspot│ │        │
└────────┘ └────────┘ └────────┘ └────────┘
```

### 3.4 links - Danh sách liên kết

Kết quả dạng trang web: favicon, tiêu đề, trích đoạn, domain, trạng thái còn sống hay không.

```recon
# Website liên quan tới ảnh
@box w=6 h=8 ui=links

- https://facebook.com/nguyenvana | Nguyễn Văn A | Ảnh đại diện trùng khớp | alive {conf=0.9}
- https://old-blog.com/post/12 | Bài viết 2018 | Dùng cùng ảnh | dead {tone=warn}
```

Dạng `url | tiêu đề | trích đoạn | trạng thái`; trạng thái: `alive`, `dead`, `redirect`, `unknown`. Có nút mở link, copy, và pivot.

```text
┌────────────────────────────────────────────┐
│ (f) Nguyễn Văn A                    alive  │
│     facebook.com/nguyenvana         90%    │
│     Ảnh đại diện trùng khớp                │
├────────────────────────────────────────────┤
│ (b) Bài viết 2018                   dead   │
│     old-blog.com/post/12                   │
└────────────────────────────────────────────┘
```

### 3.5 map (mở rộng) - Marker có loại, bán kính, hướng nhìn

Không thêm UI mới, mở rộng `map` hiện có để trinh sát camera, wifi, trạm sóng quanh một vị trí.

```recon
# Camera quanh tôi
@box w=10 h=12 ui=map center=10.373444,105.433250 radius=300

Tôi: 10.373444, 105.433250 | self
Cam cửa hàng A: 10.373900, 105.433600 | camera | fov=90 heading=120 range=40 {tone=danger}
Wifi quán cà phê: 10.373100, 105.432800 | wifi {tone=info}
An Giang: region {tone=warn}
```

Phần sau dấu `|` thứ nhất là loại marker: `self`, `camera`, `wifi`, `cell`, `poi`. Camera vẽ thêm hình quạt theo `fov`, `heading`, `range`. `radius` vẽ vòng tròn quanh `center`. Header có nút bật tắt từng loại marker và gom cụm khi nhiều điểm.

```text
┌──────────────────────────────────┐
│ [camera] [wifi] [cell]           │
│         ◜ quạt camera            │
│    ◉ Tôi    ▲ Cam A              │
│      ( vòng 300m )   ◈ Wifi      │
└──────────────────────────────────┘
```

### 3.6 steps - Tiến trình trinh sát

Recon có nhiều bước và nhiều nguồn. UI này cho thấy bước nào đã chạy, đang chạy, lỗi hay bỏ qua.

```recon
# Tiến trình
@box w=4 h=7 ui=steps

- done | Tra cứu WHOIS | 1.2s {src=S-001}
- done | Quét subdomain | 47 kết quả
- running | Tìm tài khoản mạng xã hội | 4/9 nền tảng
- failed | Kiểm tra rò rỉ HIBP | Hết hạn mức API {tone=danger}
- skipped | Tìm ảnh ngược | Không có ảnh đầu vào
```

Dạng `trạng thái | tên bước | ghi chú`; trạng thái: `pending`, `running`, `done`, `failed`, `skipped`.

```text
 ✔ Tra cứu WHOIS               1.2s
 ✔ Quét subdomain              47 kết quả
 ◐ Tìm tài khoản MXH           4/9
 ✖ Kiểm tra rò rỉ HIBP         Hết hạn mức
 ○ Tìm ảnh ngược               Bỏ qua
```

## 4. Chi tiết P1

### 4.1 gauge - Đồng hồ điểm số

```recon
# Điểm rủi ro
@box w=3 h=4 ui=gauge min=0 max=100 unit=điểm

- Rủi ro lộ thông tin | 72 {tone=danger}
```

Dạng `nhãn | giá trị`. Nếu có nhiều dòng thì vẽ nhiều đồng hồ nhỏ. Dải màu theo tone.

### 4.2 pin - Ghim file để xem


# Ảnh hiện trường
@box w=6 h=9 ui=pin file=anh-hien-truong/scene.svg


Chỉ ghim một file (ảnh, video, PDF, markdown, code...) để xem, không có đánh dấu hay body.
### 4.3 compare - So sánh 2 bên

```recon
# Đối chiếu khuôn mặt
@box w=6 h=7 ui=compare mode=image

- left | https://img.example/a.jpg | Ảnh gốc
- right | https://img.example/b.jpg | Ảnh tìm thấy
- score | 0.93 | Độ giống {tone=ok}
```

Cũng dùng được với `mode=text` để đối chiếu 2 đoạn dữ liệu cạnh nhau, thanh trượt kéo ngang giữa 2 ảnh.

### 4.4 tags - Nhóm thẻ có thể copy

```recon
# Định danh tìm thấy
@box w=5 h=5 ui=tags

## Username
nguyenvana, nvana.dev, vana_95 {color=blue}
## Số điện thoại
+84 912 345 678 [phone] {src=S-004}
## Email
a.nguyen@gmail.com, vana@proton.me [email]
```

Mỗi thẻ có nút copy và pivot. Khác chip trong `kv` ở chỗ có nhóm, đếm số lượng, và bấm để pivot.

### 4.5 heatmap - Bản đồ nhiệt thời gian

```recon
# Giờ hoạt động
@box w=6 h=6 ui=heatmap mode=weekhour color=green

- Mon | 09 | 12
- Mon | 21 | 30
- Sat | 23 | 45
```

Dạng `thứ hoặc ngày | giờ | giá trị`. Dùng để đoán múi giờ và thói quen đăng bài. `mode=calendar` hiển thị theo ngày trong năm.

### 4.6 tree - Cây phân cấp

```recon
# Subdomain
@box w=5 h=8 ui=tree

- example.com
  - mail.example.com | 1.2.3.4
  - api.example.com | 1.2.3.5 {tone=warn}
    - v2.api.example.com
```

Thụt lề 2 dấu cách theo cấp, nhiều cấp, có thu gọn mở rộng. Dùng cho subdomain, ASN và dải IP, cấu trúc thư mục.

### 4.7 host - Thẻ máy chủ

```recon
# Máy chủ
@box w=5 h=8 ui=host

- 1.2.3.4 | AS15169 Google LLC | Mountain View, US
  - 22 | ssh | OpenSSH 8.9
  - 443 | https | nginx 1.24 {tone=ok}
  - 3389 | rdp | Mở ra internet {tone=danger}
  - cert | CN=example.com | Hết hạn 2026-12-01
```

Dạng dòng cha `ip | ASN và tổ chức | vị trí`, dòng con là cổng, dịch vụ, phiên bản, hoặc chứng chỉ.

### 4.8 diff - Lịch sử thay đổi

```recon
# Lịch sử WHOIS
@box w=6 h=7 ui=diff

- 2024-03-01 | Registrant | Nguyễn Văn A | Công ty ABC
- 2025-01-15 | Nameserver | ns1.old.com | ns1.cloudflare.com
```

Dạng `ngày | trường | giá trị cũ | giá trị mới`. Cũ gạch đỏ, mới xanh, gom theo ngày.

### 4.9 bar - Cột ngang xếp hạng

```recon
# Nền tảng xuất hiện nhiều nhất
@box w=5 h=6 ui=bar unit=lần

- facebook.com | 24 {color=blue}
- github.com | 11 {color=gray}
- tiktok.com | 7 {color=pink}
```

Dạng `nhãn | giá trị`. Đơn giản hơn `barline`, không có trục thời gian.

## 5. Đề xuất P2 (bổ sung sau)

| `ui=` | Dùng khi |
|---|---|
| `tabs` | Gộp nhiều UI vào một box với các tab, tiết kiệm diện tích khi báo cáo lớn |
| `radar` | So sánh nhiều chỉ số của một đối tượng (mức lộ thông tin theo từng nhóm) |
| `media` | Phát audio, video thu thập được, kèm mốc thời gian đánh dấu |
| `wordcloud` | Từ khoá nổi bật trong bài đăng, bio |
| `sankey` | Dòng liên kết giữa nguồn, tài khoản, danh tính |

## 6. Tính năng dùng chung (áp cho mọi UI)

Các tính năng này quan trọng không kém UI mới, vì Recon là chuỗi truy vết liên tục.

| Tính năng | Mô tả |
|---|---|
| Pivot | Mỗi giá trị nhận diện được (email, domain, IP, username, ảnh) có nút `Trinh sát tiếp`, tạo task mới từ chính giá trị đó. Ghi trong `.recon` bằng `{pivot=email}` |
| Copy nhanh | Mọi giá trị dạng mono có nút copy |
| Nguồn và độ tin cậy | Mọi item đều hiểu `{src=}` và `{conf=}`, hiện badge nhất quán |
| Trạng thái rỗng | Khi không có kết quả hiện thông báo rõ `Không tìm thấy` thay vì box trống |
| Xuất | Xuất từng box ra CSV, JSON, ảnh |

## 7. Thứ tự làm đề xuất

1. `stat`, `steps`, `links`: dễ, giá trị cao, dùng ngay cho mọi task.
2. `profile`, `gallery`: phục vụ email, username, tìm ảnh.
3. Mở rộng `map`: phục vụ trinh sát camera quanh vị trí.
4. P1 theo nhu cầu thực tế: `host`, `tree`, `diff` cho domain; `compare`, `evidence` cho ảnh.
5. Pivot làm song song với bước 1, vì ảnh hưởng tới cách mọi UI render.

Mỗi UI mới theo đúng quy trình trong mục `Thêm một UI mới` của `README.md` (types, parser, SectionBox, index, mock).