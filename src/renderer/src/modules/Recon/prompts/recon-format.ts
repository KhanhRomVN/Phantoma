/**
 * Hướng dẫn cấu trúc file .recon
 * Nội dung được tổng hợp từ các file mẫu trong src/renderer/src/modules/Recon/mock/mock1
 * (không gồm thư mục files/).
 */

export const RECON_FORMAT_GUIDE = `# RECON FILE FORMAT (.recon)

Collected intelligence is stored as plain-text .recon files, managed with read_file / create_file / update_file / list_files / delete_file. Follow the syntax below exactly — the renderer parses it strictly. Every sample below is valid content: copy its shape.

## 1. Workspace layout
- _index.recon — the single index file (type: index): target name, target type, tags, theme and a header box.
- One .recon file per tab (type: tab). A tab holds many sections, each rendered as a box.
- Attachments (images, notes, scripts) live in the files/ sub-folder, e.g. files/ghi-chu/tong-quan.md. Paths in file= (ui=pin) and root= (ui=files) are relative to files/.
- Every new .recon file MUST start with a frontmatter block.

## 2. Frontmatter
Tab file:
---
recon: 1.0
type: tab
title: Annotation
---

Index file (values below are the ones seen in samples):
---
recon: 1.0
type: index
title: Thanh Nông Sản
target_type: person
tags: Công khai, Facebook, Gmail, Nha Trang, Du lịch, Chưa xác minh
updated: 2026-10-12 21:30
theme:
  preset: ember
  mode: dark
---

# Header
@box w=10 ui=kv

priority: high [enum] {tone=danger}
period: 2026-10-01 → 2026-10-12 [period]
entities: 4
sources_used: 2

## 3. Sections and boxes
Each section = a "# Title" line, then an @box line, then a blank line, then the body.

@box attributes:
- w: width. 5 = half a row, 10 = full row.
- maxh: max height of the box.
- ui: box kind (required) — see section 4.
- icon: a Lucide icon name (e.g. MessageSquare, ChartColumn, FolderOpen).
- desc="...": short description of the box.
- Extra attributes depend on the ui kind.

Item modifiers go in braces at the end of a line:
- {color=blue}  colors seen: blue, green, yellow, orange, red, purple, cyan, pink, gray
- {tone=ok}  tones seen: ok, warn, danger, info (callout also accepts neutral)
- {src=S-001,S-002}  source ids
- {icon=Globe}  per-item icon (ui=stat)

## 4. Box kinds (ui=...)

### ui=kv
Key-value pairs. Line: Label: value [type] {modifiers}. Types seen: text, date, email, phone, location, enum, period.
# KV cơ bản
@box w=5 maxh=4 ui=kv icon=IdCard desc="Cặp khoá - giá trị kèm kiểu và nguồn"

Họ và tên: Nguyễn Văn A [text] {src=S-001}
Ngày sinh: 1990-05-15 [date] {src=S-001}
Email cá nhân: a.nguyen@gmail.com [email] {src=S-001}
Số điện thoại: +84901234567 [phone] {src=S-001}
Địa chỉ nhà: Quận 7, TP.HCM [location] {src=S-001}
Mức ưu tiên: Cao [enum] {tone=danger}

### ui=table
Markdown table. Header cell = Name[:type][:sort]. Types seen: badge, percent. :sort makes the column clickable. Attribute filterable=true adds a filter. Cells accept {color=...}.
# Bảng có sort
@box w=10 maxh=10 ui=table filterable=true icon=ArrowUpDown desc="Cột có :sort bấm được"

| Mã:sort | Tên:sort | Loại:badge:sort | Tin cậy:percent:sort |
|---|---|---|---|
| S-001 | Hồ sơ công khai & mạng xã hội | OSINT {color=orange} | 0.55 {color=yellow} |
| S-010 | WHOIS Lookup | Hạ tầng {color=cyan} | 0.90 {color=green} |
| S-004 | Dữ liệu rò rỉ | Rò rỉ {color=red} | 0.30 {color=red} |

### ui=stat
Metric cards. attribute variant=card (default) | compact | split | minimal. Line: - label | value | note | sparkline (comma-separated numbers, optional) {color=...|tone=...} {icon=...}
# Card
@box w=10 maxh=6 ui=stat variant=card icon=LayoutDashboard desc="Nhãn | giá trị | ghi chú | sparkline"

- Subdomain | 47 | +12 so với lần trước | 20,24,23,30,35,38,47 {color=blue} {icon=Globe}
- Rò rỉ dữ liệu | 3 | Cần xử lý | 0,0,1,1,2,2,3 {tone=danger} {icon=ShieldAlert}
- Độ tin cậy TB | 0.82 | 31 nguồn | 0.6,0.7,0.65,0.74,0.78,0.8,0.82 {tone=ok} {icon=CircleCheck}

Without sparkline:
# Compact
@box w=5 maxh=6 ui=stat variant=compact icon=List desc="Gọn, mỗi chỉ số một hàng"

- Email tìm thấy | 12 | 4 đã xác minh {color=cyan} {icon=Mail}
- Cảnh báo | 2 | Mức trung bình {tone=warn} {icon=TriangleAlert}

### ui=timeline
Line: - date | title | source-or-note {tone=...|color=...}. The date is YYYY-MM-DD or a range such as 2021 - nay (nay = ongoing, highlighted). The third field is optional.
# Timeline đủ tone
@box w=5 maxh=16 ui=timeline icon=History desc="Sự kiện theo ngày, kèm nguồn"

- 2020-01-10 | Đăng ký tên miền nguyenvana.com | S-004 {tone=info}
- 2023-06-15 | Email xuất hiện trong dữ liệu rò rỉ | S-003 {tone=danger}
- 2026-10-01 | Bắt đầu thu thập dữ liệu

# Sự nghiệp
@box w=5 maxh=12 ui=timeline icon=Briefcase desc="Mục có nay tô cam"

- 2021 - nay | Senior Backend Engineer | TechCorp VN, Quận 1
- 2015 - 2021 | Software Engineer | ABC Software, TP.HCM {color=blue}

### ui=callout
Line: - tone | title | body {src=...}. Tones: danger, warn, ok, info, neutral. Attribute cols=1|2.
# Callout đủ tone
@box w=5 maxh=8 ui=callout cols=1 icon=Info desc="Bốn tone: danger, warn, ok, info"

- danger | Email xuất hiện trong dữ liệu rò rỉ | Địa chỉ a.nguyen@gmail.com có trong bộ dữ liệu rò rỉ năm 2023. {src=S-003}
- warn | Ngày sinh chưa được xác minh | Chỉ có một nguồn mạng xã hội. {src=S-001}
- neutral | Chưa có kết luận | Đang chờ kết quả đối chiếu. {color=purple}

### ui=annotation
Notes with author and time. Line: - YYYY-MM-DD HH:mm | Author | Title | Body {color=...}. The Title field is optional (then: date | Author | Body). Attribute cols=2 is optional.
# Annotation nhiều tác giả
@box w=10 maxh=6 ui=annotation cols=2 icon=MessageSquare desc="Ghi chú kèm tác giả, thời gian và màu"

- 2026-05-12 14:30 | Minh Anh | Tra cứu WHOIS | Tên miền đăng ký qua registrar nước ngoài, bật WHOIS privacy. {color=cyan}
- 2026-05-13 09:05 | Minh Anh | Chứng chỉ TLS cấp bởi Let's Encrypt. {color=cyan}
- 2026-05-16 08:40 | Quốc Bảo | Địa chỉ Wi-Fi công ty xuất hiện trong ảnh check-in.

### ui=quote
Line: - quote text | Author {src=...}. Author and src are optional.
# Quote có tác giả và nguồn
@box w=10 maxh=12 ui=quote icon=Quote desc="Trích dẫn kèm tác giả và nguồn"

- Tên miền nguyenvana.com là dự án cá nhân của tôi. | Nguyễn Văn A {src=S-001}
- Tôi thường đăng ảnh khi đi công tác ở Nha Trang.

### ui=checklist
- [x] done item, - [ ] open item. Sub-items are indented by 2 spaces.
# Việc cần xác minh
@box w=5 maxh=12 ui=checklist icon=ListChecks desc="Mục đã hoàn thành và chưa hoàn thành"

- [x] Đối chiếu email với dữ liệu rò rỉ
- [ ] Xác minh ngày sinh qua nguồn thứ hai
  - [x] Tìm nguồn mạng xã hội thứ nhất
  - [ ] Tìm nguồn báo chí hoặc hồ sơ công khai

### ui=tags
Groups: a "## Group" line, then comma-separated values with optional [type] and modifiers.
# Định danh tìm thấy
@box w=5 maxh=12 ui=tags icon=Tags desc="Nhóm bằng ## rồi liệt kê, ngăn cách bằng dấu phẩy"

## Username
nguyenvana, nvana.dev, vana_95 {color=blue}
## Số điện thoại
+84 912 345 678 [phone] {color=green} {src=S-004}
## Email
a.nguyen@gmail.com, vana@proton.me [email] {color=cyan}

### ui=donut
Line: - label | value | caption {color=...}. Attribute unit=... names the unit.
# Nguồn dữ liệu
@box w=5 maxh=6 ui=donut icon=ChartPie desc="Ba mục, màu chọn riêng từng mục" unit=nguồn

- Mạng xã hội | 12 | 12 nguồn {color=green}
- Rò rỉ dữ liệu | 5 | 5 nguồn {color=yellow}
- Đăng ký tên miền | 3 | 3 nguồn {color=blue}

### ui=barline
Bars (left axis) plus an optional line (right axis). Attributes: barLabel, lineLabel, barColor, lineColor. Line: - label | barValue | lineValue (lineValue optional; omit it to draw bars only).
# Hoạt động theo giờ
@box w=10 maxh=8 ui=barline icon=ChartColumn desc="Cột kết hợp đường" barLabel=Requests lineLabel=Tokens barColor=blue lineColor=green

- 00:00 | 38 | 2000000
- 06:00 | 0 | 20000
- 07:00 | 58 | 90000

### ui=heatmap
Line: - Day | hour (0-23) | value. Days: Mon Tue Wed Thu Fri Sat Sun. Attribute color=green.
# Giờ hoạt động
@box w=10 maxh=8 ui=heatmap icon=Activity color=green desc="Dạng thứ | giờ | giá trị"

- Mon | 9 | 12
- Mon | 21 | 30
- Sat | 23 | 45

### ui=diff
Change history. Line: - date | field | old value | new value. Empty old value = added, empty new value = removed.
# Lịch sử WHOIS
@box w=5 maxh=18 ui=diff icon=GitCompare desc="Ngày | trường | giá trị cũ | giá trị mới"

- 2025-01-15 | Nameserver | ns1.old.com | ns1.cloudflare.com
- 2025-01-15 | Registrar | | NameCheap Inc.
- 2024-03-01 | Email liên hệ | a.nguyen@gmail.com |

### ui=graph
Relationship graph. Lines: node: ID | label | type (types seen: person, domain, device, social) and edge: FROM -> TO | label | confidence (0 to 1). Attribute source=manual marks a hand-written graph.
# Graph quan hệ
@box w=10 ui=graph icon=Share2 desc="Node theo loại và edge kèm độ tin cậy"

node: P-001 | Nguyễn Văn A | person
node: D-001 | nguyenvana.com | domain
node: IP-001 | iPhone 15 Pro | device
edge: P-001 -> D-001 | sở hữu tên miền | 0.95
edge: P-001 -> IP-001 | dùng thiết bị | 0.80

### ui=map
Locations. Line: Name: lat, lng — or Name: region {tone=...} for an area.
# Các địa điểm quan trọng
@box w=10 ui=map icon=MapPin desc="Bản đồ với các tọa độ đánh dấu"

Trọ Của Tôi: 10.373444, 105.433250
An Giang: region {tone=warn}

### ui=markdown
Free-form markdown body: ## and ### headings, **bold**, *italic*, bullet and numbered lists, > quotes, fenced code blocks and [links](url).
# Markdown ngắn
@box w=5 maxh=4 ui=markdown icon=FileText desc="Định dạng cơ bản"

Đối tượng dùng tên miền **nguyenvana.com**, đăng ký từ *2020*.

- Bật bảo vệ thông tin WHOIS
- Cần đối chiếu thêm nguồn thứ hai

> Chưa có bằng chứng độc lập cho nơi cư trú.

### ui=code
Raw code body (no fence). Attribute lang=shell|json|... sets highlighting.
# Code ngắn
@box w=5 maxh=8 ui=code lang=shell icon=Code desc="Đoạn lệnh ngắn"

whois nguyenvana.com
dig +short NS nguyenvana.com

### ui=pin
Pins an attachment (image, markdown, code) — NO body. Attribute file= is relative to files/.
# Ảnh hiện trường
@box w=5 maxh=10 ui=pin icon=Pin file=anh-hien-truong/scene.svg desc="Ghim ảnh để xem"

### ui=files
File browser over files/ — NO body. Optional attributes: root=<sub-folder>, view=grid|tree, kinds=image,video, sort=modified:desc, features=-viewSwitch,-upload,-delete.
# Notes as tree
@box w=5 maxh=16 ui=files icon=Table root=ghi-chu view=tree sort=modified:desc features=-viewSwitch,-upload,-delete desc="Chỉ thư mục ghi-chu, dạng cây"

## 5. Rules for writing .recon files
1. Always begin with frontmatter (recon: 1.0, type, title). Use type: index only for _index.recon.
2. One "# Title" + @box pair per section, with a blank line between the @box line and the body.
3. Use only the ui kinds and attributes documented above — do not invent new ones.
4. Cite {src=S-xxx} only with source ids that really exist; never fabricate sources or data.
5. Record only what was actually collected; mark unverified items with {tone=warn}.
6. Before editing an existing .recon file, read_file it first and change it with update_file (small exact snippets).
`;