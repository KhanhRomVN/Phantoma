# Công Cụ Emulate

## Phần 1: Tool Chủ Động

Các tool này cần được AI gọi bằng lệnh XML tương ứng.

---

### 1. `list_https`
Liệt kê các request HTTPS đã được bắt giữ.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `limit` | Không | Số lượng request tối đa trả về |

Trả về bảng danh sách request với các cột `stt` (số thứ tự), `method`, `status`, `type`, `host`, `path`.

**Ví dụ:**
```
<list_https><limit>5</limit></list_https>
```

**Kết quả:**
```
[list_https] Total: 142, Filtered: 12, Showing: 5
| stt | method | status | type  | host | path |
|-----|--------|--------|-------|------|------|
| 0   | GET    | 200    | fetch | api.example.com                  | /v1/users                           |
| 1   | GET    | 200    | xhr   | api.example.com                  | /v1/products?page=1                 |
| 2   | GET    | 304    | fetch | api.example.com                  | /v1/categories                      |
| 3   | GET    | 200    | fetch | api.example.com                  | /v1/users/42                        |
| 4   | GET    | 401    | xhr   | api.example.com                  | /v1/auth/me                         |
```

---

### 2. `get_https_detail`
Lấy toàn bộ chi tiết request/response của một request HTTPS đã được bắt giữ.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `index` | **Có** | Số `stt` (số thứ tự) từ kết quả `list_https` trước đó |

⚠️ Luôn gọi `list_https` trước khi gọi `get_https_detail`.

Trả về đầy đủ chi tiết: method, URL, request headers, request body, response status, response headers, response body.

**Ví dụ:**
```
<get_https_detail><index>3</index></get_https_detail>
```

**Kết quả:**
```
[get_https_detail] Request #3
--- Request ---
Method:  GET
URL:     https://api.example.com/v1/users/42
Headers: {
  "Accept": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
}

--- Response ---
Status:  200 OK
Headers: {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-cache",
  "x-request-id": "req_8f3a2b1c"
}
Body:    {
  "id": 42,
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "role": "admin",
  "created_at": "2025-06-15T08:30:00Z"
}
```

---

### 3. `list_hosts`
Liệt kê tất cả host duy nhất từ traffic HTTPS đã bắt giữ, kèm số lượng request tương ứng.

Không có tham số.

Trả về bảng với các cột `stt` (số thứ tự), `host`, `count` (số lượng request).

**Ví dụ:**
```
<list_hosts />
```

**Kết quả:**
```
[list_hosts] Total unique hosts: 5
| stt | host                                               | count |
|-----|----------------------------------------------------|-------|
| 0   | api.example.com                                    | 47    |
| 1   | cdn.example.com                                    | 23    |
| 2   | analytics.example.com                              | 8     |
| 3   | fonts.googleapis.com                               | 3     |
| 4   | js.stripe.com                                      | 2     |
```

---

### 4. `list_sources`
Liệt kê các file nguồn (scripts, stylesheets) từ traffic đã bắt giữ, tổ chức dưới dạng cây thư mục.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `filter.host` | Không | Lọc theo tên miền — khớp một phần, không phân biệt hoa thường |
| `filter.type` | Không | Loại tài nguyên: `js`, `css`, `doc`, `other` |

⚠️ Luôn gọi `list_sources` trước khi gọi `get_source_detail`.

Trả về dạng cây thư mục với tên miền → thư mục → file. Mỗi file có `stt` (số thứ tự dùng cho `get_source_detail`), tên file, và kích thước.

**Ví dụ:**
```
<list_sources>
  <filter>
    <host>cdn.example.com</host>
    <type>js</type>
  </filter>
</list_sources>
```

**Kết quả:**
```
[list_sources] Total source files: 7
cdn.example.com/
├─ assets/
│  ├─ stt=0 app.min.js (156.2 KB)
│  ├─ stt=1 vendor.chunk.js (892.4 KB)
│  └─ stt=2 runtime.js (12.1 KB)
├─ static/
│  └─ js/
│     ├─ stt=3 main.js (45.8 KB)
│     └─ stt=4 utils.js (8.3 KB)
└─ third-party/
   ├─ stt=5 analytics.js (23.7 KB)
   └─ stt=6 pixel.js (5.0 KB)
```

---

### 5. `get_source_detail`
Lấy toàn bộ mã nguồn của một file cụ thể từ cây nguồn.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `index` | **Có** | Số `stt` từ kết quả `list_sources` trước đó |

⚠️ Luôn gọi `list_sources` trước khi gọi `get_source_detail`.

Trả về URL file, kích thước, loại nguồn (unpacked source hoặc original source), và toàn bộ mã nguồn (đã được định dạng lại nếu bị rút gọn). Nếu mã nguồn quá dài (>50000 ký tự), sẽ bị cắt bớt và có ghi chú.

**Ví dụ:**
```
<get_source_detail><index>4</index></get_source_detail>
```

**Kết quả:**
```
[get_source_detail] File: utils.js
URL: https://cdn.example.com/static/js/utils.js
Size: 8.3 KB
Source: unpacked source

/**
 * Utility functions for the application
 * @version 2.1.0
 */
const Utils = (() => {
  function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  return { formatCurrency };
})();
```

---

### 6. `list_resources`
Liệt kê tất cả file resource thu thập được (images, videos, audios, fonts, documents, wasm).

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `filter.type` | Không | Lọc theo loại: `image`, `video`, `audio`, `font`, `document`, `wasm` |

⚠️ Luôn gọi `list_resources` trước khi gọi `get_resource_content`.

Trả về bảng với các cột `stt` (số thứ tự), `type`, `filename`, `size`, `content-type`.

**Ví dụ:**
```
<list_resources>
  <filter>
    <type>image</type>
  </filter>
</list_resources>
```

**Kết quả:**
```
[list_resources] Total: 15, Filtered: 8
| stt | type     | filename | size | content-type |
|-----|----------|----------|------|--------------|
| 0   | image    | logo.png | 45.2 KB | image/png |
| 1   | image    | banner.jpg | 234.1 KB | image/jpeg |
| 2   | image    | avatar.svg | 12.8 KB | image/svg+xml |
```

---

### 7. `get_resource_content`
Lấy nội dung của một file resource cụ thể (hỗ trợ line range cho text resource).

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `index` | **Có** | Số `stt` từ kết quả `list_resources` trước đó |
| `start_line` | Không | Dòng bắt đầu (1-indexed). Chỉ cho text-based resource. |
| `end_line` | Không | Dòng kết thúc (1-indexed). Chỉ cho text-based resource. |

⚠️ Luôn gọi `list_resources` trước khi gọi `get_resource_content`.

Trả về thông tin file (type, filename, content-type, size, URL) và nội dung (cho text resource) hoặc metadata (cho binary resource). Text resource mặc định giới hạn 1000 dòng đầu.

**Ví dụ:**
```
<get_resource_content>
  <index>3</index>
  <start_line>1</start_line>
  <end_line>50</end_line>
</get_resource_content>
```

**Kết quả:**
```
[get_resource_content] Resource #3
Type: font
Filename: custom-font.woff2
Content-Type: font/woff2
Size: 87.3 KB
URL: https://cdn.example.com/fonts/custom-font.woff2
Lines: 1-50 of 120

@font-face {
  font-family: 'CustomFont';
  src: url('custom-font.woff2') format('woff2');
}
```

---

### 8. `apply_filter`
Thay đổi filter hiện tại của bảng request. Kiểm tra `<filter_context>` để biết trạng thái hiện tại trước khi gọi.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `method` | Không | Method với action: `hide` hoặc `show`. VD: `<method action="hide">OPTIONS</method>` |
| `status` | Không | Status code với action: `hide` hoặc `show`. VD: `<status action="hide">404</status>` |
| `type` | Không | Resource type với action: `hide` hoặc `show`. VD: `<type action="hide">css</type>` |
| `host` | Không | Host với action: `add` hoặc `remove`. VD: `<host action="add">api.example.com</host>` |
| `path` | Không | Path với action: `add` hoặc `remove`. VD: `<path action="add">/api/v2</path>` |
| `size` | Không | Khoảng size: `<size min="100" max="5000" />` |
| `time` | Không | Khoảng time: `<time min="0.5" max="3.0" />` |

Có thể gửi nhiều tham số trong cùng 1 lần gọi. Các tham số được áp dụng đồng thời.

**Ví dụ:**
```
<apply_filter>
  <method action="hide">OPTIONS</method>
  <type action="hide">css</type>
  <host action="add">api.example.com</host>
</apply_filter>
```

**Kết quả:**
```
[apply_filter] Applied: Methods: OPTIONS(hide); Types: css(hide); Hosts: api.example.com(add)
```

---

## Phần 2: Tool Bị Động

Các tool này tự động được đính kèm vào mỗi request, không cần AI kích hoạt bằng lệnh.

---

### 1. `get_traffic_summary`
Tự động đính kèm tổng quan distinct values của traffic hiện tại vào mỗi request.

**Không cần gọi** — luôn có sẵn trong context.

Trả về:
- `hosts`: Danh sách host với số lượng request
- `methods`: Danh sách method với số lượng request
- `statuses`: Danh sách status code với số lượng request
- `types`: Danh sách resource type với số lượng request

**Dữ liệu mẫu:**
```
Traffic Summary:
- Hosts: api.example.com (47), cdn.example.com (23), analytics.example.com (8)
- Methods: GET (120), POST (20), OPTIONS (2)
- Statuses: 200 (105), 304 (20), 401 (10), 404 (5)
- Types: fetch (98), xhr (30), image (14)
```

---

### 2. `get_filter` (filter_context)
Tự động đính kèm trạng thái filter hiện tại vào mỗi request dưới dạng `<filter_context>`.

**Không cần gọi** — luôn có sẵn trong context.

Mô tả filter đang áp dụng:
- Methods đang hiển thị (disabled kèm `(hide)`)
- Hosts whitelist
- Paths whitelist
- Statuses đang hiển thị (disabled kèm `(hide)`)
- Types đang hiển thị (disabled kèm `(hide)`)
- Khoảng size và time (nếu có)

**Dữ liệu mẫu:**
```
<filter_context>
Methods: GET, POST, PUT, DELETE, OPTIONS(hide)
Hosts: api.example.com
Statuses: 200, 304, 401, 404(hide)
Types: fetch, xhr, image, css(hide)
</filter_context>
```

---

## Quy Tắc Quan Trọng

1. **Luôn gọi `list_https` trước khi gọi `get_https_detail`**
2. **Luôn gọi `list_sources` trước khi gọi `get_source_detail`**
3. **Luôn gọi `list_resources` trước khi gọi `get_resource_content`**
4. **Kiểm tra `<filter_context>` trước khi gọi `apply_filter`**
5. **Tool bị động không cần gọi — chúng luôn có sẵn trong context**