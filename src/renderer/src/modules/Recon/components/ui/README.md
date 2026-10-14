# Recon UI

Các UI dùng trong module Recon. Mỗi section trong file `.recon` bắt đầu bằng `# Tiêu đề`, dòng `@box ...` chọn UI, phần còn lại là dữ liệu của UI đó. Ví dụ đầy đủ nằm ở `Recon/mock/mock1/_<tên>.recon`.

## Cấu hình chung của `@box`

```recon
# Tiêu đề box
@box w=5 h=6 ui=kv icon=IdCard desc="Mô tả ngắn dưới tiêu đề"
```

| Tham số | Ý nghĩa |
|---|---|
| `w` | Chiều rộng theo ô lưới, 1-10 (mặc định 10) |
| `h` | Chiều cao theo hàng (mặc định 3) |
| `x`, `y` | Vị trí bắt đầu (cột 1-10, hàng >= 1); bỏ trống = tự xếp |
| `ui` | Loại UI (bảng bên dưới); sai tên thì quay về `markdown` |
| `id` | Định danh box |
| `icon` | Tên icon lucide-react ở tiêu đề (vd `IdCard`) |
| `desc` | Mô tả ngắn dưới tiêu đề |

Tham số khác được lưu vào `options` và UI tương ứng tự đọc (vd `cols`, `lang`, `unit`).

## Màu

Chỉ cần ghi id màu, ví dụ `{color=orange}`: `blue`, `purple`, `green`, `orange`, `yellow`, `pink`, `cyan`, `red`, `gray` (định nghĩa ở `Recon/constants/colors.ts`).

Meta dùng chung ở cuối dòng: `{src=S-001,S-002}` (nguồn), `{conf=0.85}` (độ tin cậy), `{tone=ok|warn|danger|info|neutral}`.

## Danh sách UI

| `ui=` | Thư mục | Mock | Dữ liệu |
|---|---|---|---|
| `kv` | `Kv/` | `_kv.recon` | Cặp khoá - giá trị |
| `table` | `Table/` | `_table.recon` | Bảng markdown |
| `timeline` | `Timeline/` | `_timeline.recon` | Mốc thời gian |
| `checklist` | `Checklist/` | `_checklist.recon` | Danh sách việc, 1 cấp con |
| `graph` | `Graph/` | `_graph.recon` | Node và edge |
| `code` | `Code/` | `_code.recon` | Khối code |
| `markdown` | `Markdown/` | `_markdown.recon` | Văn bản markdown |
| `callout` | `Callout/` | `_callout.recon` | Hộp cảnh báo theo tone |
| `quote` | `Quote/` | `_quote.recon` | Trích dẫn |
| `annotation` | `Annotation/` | `_annotation.recon` | Ghi chú của người phân tích |
| `files` | `FileManager/` | `_files.recon` | Trình quản lý file |
| `map` | `Map/` | `_location.recon` | Bản đồ địa điểm và vùng |
| `donut` | `Donut/` | `_donut.recon` | Biểu đồ vòng |
| `barline` | `BarLine/` | `_barline.recon` | Biểu đồ cột kết hợp đường |

## Cú pháp từng UI

### kv

```recon
Email: a.nguyen@gmail.com [email] {src=S-001}
Mức ưu tiên: Cao [enum] {tone=danger}
```

Kiểu trong `[...]`: `email`, `url`, `domain`, `phone`, `ip`, `hash`, `mono`, `date`, `period`, `enum`, `text` (mặc định). Giá trị dạng `["a", "b"]` hiển thị thành các chip.

### table

```recon
@box w=10 h=5 ui=table filterable=true

| Mã:sort | Loại:badge:sort | Tin cậy:percent:sort |
|---|---|---|
| S-001 | OSINT {color=orange} | 0.55 {color=yellow} |
```

- Hậu tố cột: `:sort` cho phép sắp xếp, `:badge` và `:percent` chọn kiểu hiển thị.
- `filterable=true` hiện ô tìm kiếm ở header.
- `{color=id}` tô màu từng ô.

### timeline

```recon
- 2021-03-01 | Bắt đầu làm việc tại TechCorp VN | S-002 {tone=ok}
- 2021 - nay | Senior Backend Engineer | TechCorp VN {color=blue}
```

Dạng `ngày | tiêu đề | ghi chú`. Ngày chứa "nay" được tô cam; `{tone=...}` hoặc `{color=...}` đổi màu mốc.

### checklist

```recon
- [x] Kiểm tra WHOIS tên miền
- [ ] Xác minh ngày sinh
  - [x] Tìm nguồn mạng xã hội
```

Mục con thụt lề 2 dấu cách dưới mục cha (chỉ 1 cấp).

### graph

```recon
@box w=10 h=8 ui=graph

node: P-001 | Nguyễn Văn A | person
node: D-001 | nguyenvana.com | domain
edge: P-001 -> D-001 | sở hữu tên miền | 0.95
```

`source=manual` dùng đúng các dòng `node:` và `edge:` thay vì dữ liệu liên kết; `scope` được truyền xuống Graph.

### code

```recon
@box w=5 h=4 ui=code lang=shell

whois nguyenvana.com
```

`lang` chọn ngôn ngữ (mặc định `plaintext`).

### markdown

Nội dung markdown thường, đặt ngay dưới dòng `@box`.

### callout

```recon
@box w=5 h=8 ui=callout cols=1

- danger | Tiêu đề | Nội dung {src=S-003}
- neutral | Chưa có kết luận | Đang chờ đối chiếu {color=purple}
```

Dạng `tone | tiêu đề | nội dung`; tone: `ok`, `warn`, `danger`, `info`, `neutral`. `cols` chia số cột.

### quote

```recon
- Nội dung trích dẫn | Tác giả {src=S-001}
- Chỉ có nội dung trích.
```

Tác giả, `{src}` và `{color}` là tuỳ chọn.

### annotation

```recon
@box w=10 h=7 ui=annotation cols=2

- 2026-05-12 14:30 | Minh Anh | Tra cứu WHOIS | Nội dung ghi chú {color=cyan}
- 2026-05-16 08:40 | Quốc Bảo | Nội dung ghi chú (không có mô tả)
```

Dạng `thời gian | tác giả | mô tả ngắn | nội dung`; bỏ mô tả thì chỉ còn 3 phần.

### files

Không có nội dung riêng, cấu hình qua `@box`:

```recon
@box w=5 h=8 ui=files view=tree root=ghi-chu sort=modified:desc kinds=image,video features=-viewSwitch,-upload,-delete
```

| Tham số | Ý nghĩa |
|---|---|
| `view` | `grid` hoặc `tree` |
| `root` | Chỉ hiện một thư mục con (vd `ghi-chu`) |
| `kinds` | Lọc theo loại file (vd `image,video`) |
| `sort` | Sắp xếp sẵn (vd `modified:desc`) |
| `features` | Tắt tính năng bằng tiền tố `-` (vd `-viewSwitch,-upload,-delete`) |

### map

```recon
@box w=10 h=12 ui=map

Trọ Của Tôi: 10.373444, 105.433250
An Giang: region {tone=warn}
```

Địa điểm dạng `Tên: vĩ độ, kinh độ`; vùng dạng `Tên: region` (ranh giới tra theo tên). `{tone=...}` đổi màu. Header có nút chuyển Google Map / Custom Map và toàn màn hình; `title` và `subtitle` đặt tiêu đề trên bản đồ.

### donut

```recon
@box w=5 h=7 ui=donut unit=requests

- claude-sonnet-5-5-low | 70 | 70 req · 86.2k {color=blue}
- claude-sonnet-4.5 | 38 | 38 req · 2.0M {color=yellow}
```

Dạng `nhãn | giá trị | ghi chú`. Tổng hiển thị giữa vòng, `unit` là nhãn dưới tổng. Màu chọn riêng từng mục bằng `{color=id}`; bỏ trống thì dùng màu mặc định theo thứ tự.

### barline

```recon
@box w=10 h=9 ui=barline barLabel=Requests lineLabel=Tokens barColor=blue lineColor=green

- 00:00 | 38 | 2000000
- 07:00 | 58 | 90000
```

Dạng `nhãn trục X | giá trị cột | giá trị đường`; bỏ giá trị thứ ba thì không vẽ đường. Cột dùng trục trái, đường dùng trục phải.

| Tham số | Ý nghĩa |
|---|---|
| `barLabel`, `lineLabel` | Tên hiện trong badge ở header box (mặc định `Requests`, `Tokens`) |
| `barColor`, `lineColor` | Id màu của cột và đường (mặc định `blue`, `green`) |

## Thêm một UI mới

1. Thêm tên vào `UiType` và `SectionData` trong `types.ts`.
2. Thêm tên vào `KNOWN_UI_TYPES` và một `case` trong `inferAndParseUi` của `parser.ts`.
3. Tạo component trong thư mục riêng và thêm `case` trong `renderBody` của `SectionBox.tsx`.
4. Export ở `index.ts` và thêm file mock tương ứng vào `Recon/mock/mock1/`.