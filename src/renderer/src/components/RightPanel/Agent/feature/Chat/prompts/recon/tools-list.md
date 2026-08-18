# Công Cụ Recon

## 1. `list_tabs`
Liệt kê tất cả tab đang mở trong phiên trình duyệt đang hoạt động.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

Trả về mảng các tab với: `tabId`, `title`, `url`, `isActive`.

**Ví dụ:**
```
<list_tabs />
```

**Kết quả:**
```
[list_tabs] Total tabs: 3
| stt | tabId | title | url | isActive |
|-----|-------|-------|-----|----------|
| 0 | tab-1 | Google | https://google.com | false |
| 1 | tab-2 | GitHub | https://github.com | true |
| 2 | tab-3 | New Tab | about:blank | false |
```

---

## 2. `create_tab`
Tạo tab mới với URL tùy chọn.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `url` | Không | URL để điều hướng đến. Nếu không chỉ định, mở tab trống. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

Trả về ID tab mới và trạng thái.

**Ví dụ:**
```
<create_tab>
  <url>https://example.com</url>
</create_tab>
```

**Kết quả:**
```
[create_tab] Tab created
tabId: tab-4
status: loaded
```

---

## 3. `close_tab`
Đóng một tab cụ thể.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `tabId` | **Có** | ID của tab cần đóng. Lấy từ `list_tabs`. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

⚠️ Luôn gọi `list_tabs` trước khi gọi `close_tab`.

**Ví dụ:**
```
<close_tab>
  <tabId>tab-123</tabId>
</close_tab>
```

**Kết quả:**
```
[close_tab] Tab closed
tabId: tab-123
```

---

## 4. `switch_tab`
Chuyển sang một tab cụ thể.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `tabId` | **Có** | ID của tab cần chuyển đến. Lấy từ `list_tabs`. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

⚠️ Luôn gọi `list_tabs` trước khi gọi `switch_tab`.

**Ví dụ:**
```
<switch_tab>
  <tabId>tab-123</tabId>
</switch_tab>
```

**Kết quả:**
```
[switch_tab] Switched to tab
tabId: tab-123
```

---

## 5. `navigate`
Điều hướng đến URL trong tab đang hoạt động.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `url` | **Có** | URL để điều hướng đến. |
| `tabId` | Không | ID tab cụ thể. Nếu không chỉ định, dùng tab đang hoạt động. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

**Ví dụ:**
```
<navigate>
  <url>https://example.com</url>
</navigate>
```

**Kết quả:**
```
[navigate] Navigation complete
url: https://example.com
status: loaded
```

---

## 6. `back`
Quay lại trang trước trong tab đang hoạt động.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `tabId` | Không | ID tab cụ thể. Nếu không chỉ định, dùng tab đang hoạt động. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

**Ví dụ:**
```
<back />
```

**Kết quả:**
```
[back] Navigated back
url: https://example.com/previous
```

---

## 7. `forward`
Tiến tới trang tiếp theo trong tab đang hoạt động.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `tabId` | Không | ID tab cụ thể. Nếu không chỉ định, dùng tab đang hoạt động. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

**Ví dụ:**
```
<forward />
```

**Kết quả:**
```
[forward] Navigated forward
url: https://example.com/next
```

---

## 8. `reload`
Tải lại tab đang hoạt động.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `tabId` | Không | ID tab cụ thể. Nếu không chỉ định, dùng tab đang hoạt động. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

**Ví dụ:**
```
<reload />
```

**Kết quả:**
```
[reload] Page reloaded
url: https://example.com
```

---

## 9. `get_page_content`
Lấy nội dung trang hiện tại dưới dạng markdown kèm tham chiếu phần tử.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `tabId` | Không | ID tab cụ thể. Nếu không chỉ định, dùng tab đang hoạt động. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

Trả về tiêu đề trang, URL, nội dung markdown và danh sách phần tử tương tác (inputs, buttons) với ref ID để tương tác.

**Ví dụ:**
```
<get_page_content />
```

**Kết quả:**
```
[get_page_content] Page content retrieved
Title: Đăng nhập - Example
URL: https://example.com/login

# Đăng nhập
Vui lòng nhập thông tin đăng nhập

Interactive elements:
| ref | type | selector | label |
|-----|------|----------|-------|
| input-email | input | #email | Email |
| input-password | input | #password | Mật khẩu |
| btn-login | button | button[type=submit] | Đăng nhập |
```

---

## 10. `list_elements`
Liệt kê tất cả phần tử tương tác trên trang.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `elementType` | Không | Lọc theo loại: `input`, `button`, `link`, `select`, `textarea`. |
| `tabId` | Không | ID tab cụ thể. Nếu không chỉ định, dùng tab đang hoạt động. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

Trả về mảng phần tử với: `ref`, `type`, `selector`, `label`, `value`, `placeholder`.

**Ví dụ:**
```
<list_elements>
  <elementType>input</elementType>
</list_elements>
```

**Kết quả:**
```
[list_elements] Total inputs: 2
| ref | type | selector | label | value | placeholder |
|-----|------|----------|-------|-------|-------------|
| input-email | input | #email | Email | | user@example.com |
| input-password | input | #password | Mật khẩu | | ******** |
```

---

## 11. `click_element`
Nhấp vào một phần tử trên trang.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `ref` | **Có** | Ref ID của phần tử từ `get_page_content` hoặc `list_elements`. |
| `tabId` | Không | ID tab cụ thể. Nếu không chỉ định, dùng tab đang hoạt động. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

⚠️ Luôn lấy `ref` từ kết quả `get_page_content` hoặc `list_elements`, không tự đoán selector.

**Ví dụ:**
```
<click_element>
  <ref>btn-login</ref>
</click_element>
```

**Kết quả:**
```
[click_element] Element clicked
ref: btn-login
```

---

## 12. `fill_input`
Điền văn bản vào trường nhập liệu.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `ref` | **Có** | Ref ID của phần tử từ `get_page_content` hoặc `list_elements`. |
| `value` | **Có** | Văn bản cần điền. |
| `tabId` | Không | ID tab cụ thể. Nếu không chỉ định, dùng tab đang hoạt động. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

**Ví dụ:**
```
<fill_input>
  <ref>input-email</ref>
  <value>user@example.com</value>
</fill_input>
```

**Kết quả:**
```
[fill_input] Input filled
ref: input-email
value: user@example.com
```

---

## 13. `press_key`
Nhấn phím trong phần tử đang hoạt động.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `key` | **Có** | Tên phím (Enter, Tab, Escape, ArrowDown, v.v.) hoặc ký tự. |
| `tabId` | Không | ID tab cụ thể. Nếu không chỉ định, dùng tab đang hoạt động. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

**Ví dụ:**
```
<press_key>
  <key>Enter</key>
</press_key>
```

**Kết quả:**
```
[press_key] Key pressed
key: Enter
```

---

## 14. `scroll`
Cuộn trang.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `direction` | **Có** | Hướng cuộn: `up`, `down`, `top`, `bottom`. |
| `amount` | Không | Số pixel cần cuộn (cho `up`/`down`). Mặc định: 500. |
| `tabId` | Không | ID tab cụ thể. Nếu không chỉ định, dùng tab đang hoạt động. |
| `targetId` | Không | ID mục tiêu. Nếu không chỉ định, dùng mục tiêu đang hoạt động. |

**Ví dụ:**
```
<scroll>
  <direction>down</direction>
  <amount>1000</amount>
</scroll>
```

**Kết quả:**
```
[scroll] Page scrolled
direction: down
amount: 1000
```

---

## Quy Tắc Quan Trọng

1. **Luôn gọi `list_tabs` trước khi giả định trạng thái tab.**
2. **Luôn gọi `get_page_content` hoặc `list_elements` trước khi tương tác với phần tử trang.**
3. **Dùng refs từ kết quả `get_page_content`/`list_elements`, không tự đoán selector.**
4. **Chờ điều hướng hoàn tất trước khi lấy nội dung trang.**