# Browser Agent Tools — Spec v2

> Phiên bản cải tiến dựa trên rà soát bộ 15 tool gốc. Các thay đổi so với v1 được đánh dấu bằng tag `[NEW]` (tool mới) hoặc `[CHANGED]` (tool sửa đổi). Xem mục [Changelog](#changelog--ưu-tiên) ở cuối file để đối chiếu với từng vấn đề đã phát hiện.

## Mục lục

- [Nhóm 1: Quản lý Tab & Điều hướng](#nhóm-1-quản-lý-tab--điều-hướng)
- [Nhóm 2: Đọc nội dung trang](#nhóm-2-đọc-nội-dung-trang)
- [Nhóm 3: Tương tác](#nhóm-3-tương-tác)
- [Nhóm 4: Đồng bộ & Nâng cao](#nhóm-4-đồng-bộ--nâng-cao)
- [Chuẩn xử lý lỗi](#chuẩn-xử-lý-lỗi)
- [Changelog & Ưu tiên](#changelog--ưu-tiên)

---

## Nhóm 1: Quản lý Tab & Điều hướng

### 1. `list_tabs`
Liệt kê tất cả tab đang mở trong phiên trình duyệt đang hoạt động.

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

### 2. `create_tab`
Tạo tab mới với URL tùy chọn.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `url` | Không | URL để điều hướng đến. Nếu không chỉ định, mở tab trống. |

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

### 3. `close_tab`
Đóng một tab cụ thể.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `tabId` | **Có** | ID của tab cần đóng. Lấy từ `list_tabs`. |

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

### 4. `switch_tab`
Chuyển sang một tab cụ thể.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `tabId` | **Có** | ID của tab cần chuyển đến. Lấy từ `list_tabs`. |

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

### 5. `navigate` `[CHANGED]`
Điều hướng đến URL trong tab đang hoạt động.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `url` | **Có** | URL để điều hướng đến. |
| `waitUntil` | Không | Điều kiện coi là "load xong": `domcontentloaded`, `load`, `networkidle`. Mặc định: `load`. |
| `timeoutMs` | Không | Thời gian chờ tối đa (ms). Mặc định: `30000`. Nếu vượt quá → trả lỗi `timeout` (xem [Chuẩn xử lý lỗi](#chuẩn-xử-lý-lỗi)). |

> 🆕 Lý do thêm: nhiều trang SPA trả `status: loaded` (DOM đã dựng) trước khi nội dung JS-render thực sự sẵn sàng. `waitUntil: networkidle` giúp tránh đọc phải trang rỗng ngay sau `navigate`.

**Ví dụ:**
```
<navigate>
  <url>https://example.com</url>
  <waitUntil>networkidle</waitUntil>
</navigate>
```

**Kết quả:**
```
[navigate] Navigation complete
url: https://example.com
status: loaded
loadTimeMs: 842
```

---

### 6. `back`
Quay lại trang trước trong tab đang hoạt động.

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

### 7. `forward`
Tiến tới trang tiếp theo trong tab đang hoạt động.

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

### 8. `reload`
Tải lại tab đang hoạt động.

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

## Nhóm 2: Đọc nội dung trang

### 9. `get_page_content` `[CHANGED]`
Lấy nội dung trang hiện tại dưới dạng markdown kèm tham chiếu phần tử.

Trả về tiêu đề trang, URL, nội dung markdown và danh sách phần tử tương tác (inputs, buttons) với ref ID để tương tác.

**Hành vi rút gọn (mới chuẩn hóa):**
- Nếu nội dung trang > **8000 ký tự**, nội dung sẽ bị cắt (`...(truncated)`), giữ ưu tiên phần đầu trang.
- Nếu số phần tử tương tác > **20**, phần "Interactive elements" chỉ hiện **10 dòng đầu** kèm dòng thông báo `N found (use list_elements to see details)`. Agent nên gọi `list_elements` với bộ lọc phù hợp thay vì đọc hết ở đây.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `maxChars` | Không | Ghi đè ngưỡng cắt mặc định (8000). |

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

Interactive elements: 3 found
| ref | type | selector | label |
|-----|------|----------|-------|
| input-email | input | #email | Email |
| input-password | input | #password | Mật khẩu |
| btn-login | button | button[type=submit] | Đăng nhập |
```

---

### 10. `list_elements` `[CHANGED]`
Liệt kê phần tử tương tác trên trang, có lọc.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `elementType` | Không | Lọc theo loại: `input`, `button`, `link`, `select`, `textarea`, `checkbox`, `radio`. |
| `labelContains` | Không | 🆕 Lọc theo từ khóa xuất hiện trong `label`/`placeholder` (không phân biệt hoa thường). |
| `visibleOnly` | Không | 🆕 Nếu `true`, chỉ trả về phần tử đang hiển thị trong viewport hiện tại. Mặc định: `false`. |
| `limit` | Không | 🆕 Giới hạn số kết quả trả về. Mặc định: `50`. |
| `offset` | Không | 🆕 Vị trí bắt đầu, dùng để phân trang khi số phần tử lớn. Mặc định: `0`. |
| `frameId` | Không | 🆕 Chỉ định tìm trong 1 iframe cụ thể (lấy từ `list_frames`). Bỏ trống = tìm ở frame chính. |

Mỗi phần tử trả về gồm: `ref`, `type`, `selector`, `label`, `value`, `placeholder`, và bổ sung:
- `visible: boolean` 🆕 — phần tử có đang hiển thị (không bị `display:none`, không nằm ngoài viewport) hay không.
- `boundingBox: {x, y, width, height}` 🆕 — tọa độ khung phần tử, hữu ích để phân biệt các phần tử trùng label.

**Ví dụ:**
```
<list_elements>
  <elementType>input</elementType>
  <labelContains>search</labelContains>
  <visibleOnly>true</visibleOnly>
</list_elements>
```

**Kết quả:**
```
[list_elements] Total matched: 1 (of 81 total interactive elements)
| ref | type | selector | label | value | placeholder | visible | boundingBox |
|-----|------|----------|-------|-------|-------------|---------|-------------|
| search-query | input | #search | Search | | Search | true | {x:412,y:12,w:400,h:36} |
```

---

### 11. `list_frames` `[NEW]`
Liệt kê các iframe đang tồn tại trong trang hiện tại.

> 🆕 Lý do thêm: nhiều form quan trọng (thanh toán, đăng nhập OAuth, captcha) nằm trong iframe lồng — DOM chính không thấy các phần tử này nếu không tìm đúng frame.

Trả về mảng: `frameId`, `frameUrl`, `name` (nếu có).

**Ví dụ:**
```
<list_frames />
```

**Kết quả:**
```
[list_frames] Total frames: 2
| frameId | frameUrl | name |
|---------|----------|------|
| frame-0 | https://example.com (main) | - |
| frame-1 | https://checkout.stripe.com/embed | stripe-checkout |
```

---

### 12. `capture_screenshot` `[CHANGED]`
Chụp ảnh trang web hiện tại kèm overlay đánh số (Set-of-Marks) trên từng phần tử tương tác, upload ảnh lên server.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `fullPage` | Không | 🆕 Nếu `true`, chụp toàn bộ chiều dài trang (kể cả phần phải cuộn). **Mặc định: `false`** — chỉ chụp viewport hiện tại, đánh số chỉ áp dụng cho phần tử đang hiển thị. Giữ mặc định `false` để tránh quá tải số lượng đánh dấu trên 1 ảnh. |
| `frameId` | Không | 🆕 Giới hạn overlay trong 1 iframe cụ thể. |

**Ví dụ:**
```
<capture_screenshot />
```

**Kết quả:**
```
[capture_screenshot] Screenshot captured with element overlay.
Title: Example Website
URL: https://example.com
Scope: viewport (fullPage=false)

Ảnh chụp có overlay đánh số thứ tự (badge cam) trên từng element tương tác đang hiển thị.

Element ref-map:
| index | ref | selector | type | label |
|-------|-----|----------|------|-------|
| 1 | input-email | #email | input | Email |
| 2 | input-password | #password | input | Mật khẩu |
| 3 | btn-login | button[type=submit] | button | Đăng nhập |
```

**Cách dùng:** Nhìn số trên ảnh → tra ref tương ứng trong ref-map → dùng ref đó khi gọi `click_element` hoặc `fill_input`.

---

## Nhóm 3: Tương tác

### 13. `click_element` `[CHANGED]`
Nhấp vào một phần tử trên trang.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `ref` | **Có** | Ref ID của phần tử từ `get_page_content`, `list_elements` hoặc `capture_screenshot`. |
| `clickType` | Không | 🆕 `single` (mặc định), `double`, hoặc `right` (mở context menu). |
| `frameId` | Không | 🆕 Chỉ định nếu phần tử nằm trong iframe. |

⚠️ Luôn lấy `ref` từ kết quả `get_page_content` hoặc `list_elements`, không tự đoán selector.

⚠️ **Ref có thể lỗi thời (stale)** nếu DOM đã thay đổi kể từ lần lấy `ref` gần nhất (trang SPA re-render, AJAX cập nhật nội dung). Nếu gặp lỗi `stale_ref`, gọi lại `list_elements`/`get_page_content` để lấy ref mới trước khi thử lại.

**Kết quả khi thao tác gây mở tab mới** (`target="_blank"`): trường `newTabId` sẽ xuất hiện trong kết quả, nhưng **tab hiện tại không tự động chuyển** — cần gọi `switch_tab` thủ công nếu muốn thao tác tiếp trên tab mới.

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
newTabId: null
```

---

### 14. `fill_input` `[CHANGED]`
Điền văn bản vào trường nhập liệu. **Mặc định sẽ xóa giá trị cũ rồi điền giá trị mới** (không nối thêm).

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `ref` | **Có** | Ref ID của phần tử. |
| `value` | **Có** | Văn bản cần điền. |
| `frameId` | Không | 🆕 Chỉ định nếu phần tử nằm trong iframe. |

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

### 15. `clear_input` `[NEW]`
Xóa nội dung hiện tại của một trường nhập liệu mà không điền giá trị mới.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `ref` | **Có** | Ref ID của phần tử. |

**Ví dụ:**
```
<clear_input>
  <ref>input-email</ref>
</clear_input>
```

**Kết quả:**
```
[clear_input] Input cleared
ref: input-email
```

---

### 16. `select_option` `[NEW]`
Chọn 1 giá trị trong phần tử `<select>` (dropdown).

> 🆕 Lý do thêm: `list_elements` liệt kê `select` là 1 loại phần tử nhưng bộ tool gốc không có cách nào thao tác với nó — `click_element` mở dropdown nhưng không chọn được option.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `ref` | **Có** | Ref ID của phần tử `<select>`. |
| `value` | Một trong hai | Giá trị (`value` attribute) của option cần chọn. |
| `label` | Một trong hai | Text hiển thị của option cần chọn (dùng khi không biết `value`). |

**Ví dụ:**
```
<select_option>
  <ref>select-country</ref>
  <label>Việt Nam</label>
</select_option>
```

**Kết quả:**
```
[select_option] Option selected
ref: select-country
selected: {value: "VN", label: "Việt Nam"}
```

---

### 17. `hover` `[NEW]`
Rê chuột vào một phần tử mà không click — dùng cho menu/tooltip chỉ hiện khi hover.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `ref` | **Có** | Ref ID của phần tử. |

**Ví dụ:**
```
<hover>
  <ref>menu-products</ref>
</hover>
```

**Kết quả:**
```
[hover] Hover triggered
ref: menu-products
```

---

### 18. `upload_file` `[NEW]`
Tải file lên qua phần tử `<input type="file">`.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `ref` | **Có** | Ref ID của phần tử input file. |
| `filePath` | **Có** | Đường dẫn file cần upload (trên máy chạy agent). |

**Ví dụ:**
```
<upload_file>
  <ref>input-avatar</ref>
  <filePath>/tmp/avatar.png</filePath>
</upload_file>
```

**Kết quả:**
```
[upload_file] File uploaded
ref: input-avatar
fileName: avatar.png
```

---

### 19. `press_key`
Nhấn phím trong phần tử đang hoạt động (hoặc phần tử chỉ định).

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `key` | **Có** | Tên phím (`Enter`, `Tab`, `Escape`, `ArrowDown`, v.v.) hoặc ký tự. |
| `ref` | Không | 🆕 Nếu chỉ định, focus vào phần tử này trước khi nhấn phím. Nếu bỏ trống, dùng phần tử đang focus hiện tại. |

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

### 20. `scroll`
Cuộn trang theo hướng/khoảng cách chỉ định.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `direction` | **Có** | Hướng cuộn: `up`, `down`, `top`, `bottom`. |
| `amount` | Không | Số pixel cần cuộn (cho `up`/`down`). Mặc định: 500. |

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

### 21. `scroll_to_element` `[NEW]`
Cuộn thẳng đến vị trí một phần tử cụ thể (đã biết `ref` từ trước nhưng đang nằm ngoài viewport).

> 🆕 Lý do thêm: `scroll` theo pixel là "mù" — agent phải đoán khoảng cách. Với phần tử đã biết ref, cuộn trực tiếp tới đó chính xác và nhanh hơn.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `ref` | **Có** | Ref ID của phần tử cần cuộn tới. |

**Ví dụ:**
```
<scroll_to_element>
  <ref>btn-submit</ref>
</scroll_to_element>
```

**Kết quả:**
```
[scroll_to_element] Scrolled into view
ref: btn-submit
visible: true
```

---

## Nhóm 4: Đồng bộ & Nâng cao

### 22. `wait_for` `[NEW]`
Chờ cho đến khi một điều kiện được thỏa mãn trước khi tiếp tục — quan trọng với trang SPA load nội dung bất đồng bộ.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `condition` | **Có** | Một trong: `element_visible`, `element_hidden`, `text_present`, `network_idle`. |
| `ref` | Tùy điều kiện | Bắt buộc nếu `condition` là `element_visible`/`element_hidden`. |
| `text` | Tùy điều kiện | Bắt buộc nếu `condition` là `text_present`. |
| `timeoutMs` | Không | Mặc định: `10000`. Hết thời gian → trả lỗi `timeout`. |

**Ví dụ:**
```
<wait_for>
  <condition>element_visible</condition>
  <ref>result-list</ref>
  <timeoutMs>5000</timeoutMs>
</wait_for>
```

**Kết quả:**
```
[wait_for] Condition met
condition: element_visible
ref: result-list
waitedMs: 1240
```

---

### 23. `evaluate_js` `[NEW]` ⚠️ Dùng hạn chế
Thực thi đoạn JavaScript tùy ý trong ngữ cảnh trang hiện tại. Dùng làm "cửa thoát hiểm" khi các tool có sẵn không đủ (đọc `localStorage`, trigger custom event...).

> ⚠️ **Lưu ý an toàn:** tool này có phạm vi ảnh hưởng rộng nhất trong bộ — nên cân nhắc giới hạn quyền (whitelist domain, sandbox riêng, hoặc yêu cầu xác nhận thủ công) trước khi bật cho agent tự động dùng không giám sát.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `script` | **Có** | Đoạn JS cần chạy. Giá trị `return` cuối cùng sẽ được trả về (phải serializable). |

**Ví dụ:**
```
<evaluate_js>
  <script>return document.title;</script>
</evaluate_js>
```

**Kết quả:**
```
[evaluate_js] Executed
result: "Example Website"
```

---

## Chuẩn xử lý lỗi

Tất cả tool hành động (`click_element`, `fill_input`, `select_option`, `hover`, `upload_file`, `press_key`, `scroll_to_element`, `navigate`, `wait_for`...) khi thất bại trả về cùng 1 schema thống nhất thay vì im lặng hoặc lỗi không rõ ràng:

```
{
  "status": "error",
  "tool": "click_element",
  "ref": "btn-login",
  "reason": "stale_ref",
  "message": "Phần tử với ref 'btn-login' không còn khớp với DOM hiện tại. Gọi lại list_elements để lấy ref mới."
}
```

**Danh sách `reason` chuẩn hóa:**

| reason | Ý nghĩa | Gợi ý xử lý cho agent |
|--------|---------|------------------------|
| `element_not_found` | Ref không tồn tại trong DOM hiện tại | Gọi lại `list_elements`/`get_page_content` |
| `stale_ref` | Ref từng hợp lệ nhưng DOM đã thay đổi | Gọi lại `list_elements` để lấy ref mới |
| `element_not_visible` | Phần tử tồn tại nhưng đang ẩn/ngoài viewport | Gọi `scroll_to_element` trước |
| `element_disabled` | Phần tử bị disable, không thể thao tác | Kiểm tra điều kiện trang trước khi thao tác |
| `intercepted` | Phần tử bị 1 lớp khác che (modal, overlay) | Đóng overlay trước hoặc thử lại sau |
| `timeout` | Thao tác/điều hướng vượt quá thời gian chờ | Tăng `timeoutMs` hoặc kiểm tra kết nối mạng |
| `frame_not_found` | `frameId` chỉ định không tồn tại | Gọi lại `list_frames` |

---

## Changelog & Ưu tiên

Tổng hợp thay đổi so với v1, theo mức ưu tiên đã đánh giá:

| Ưu tiên | Thay đổi | Tool liên quan |
|---------|----------|-----------------|
| 🔴 Cao | Thêm `select_option` | Nhóm 3, #16 |
| 🔴 Cao | Thêm `wait_for` | Nhóm 4, #22 |
| 🔴 Cao | Chuẩn hóa schema lỗi (`reason` enum) | Toàn bộ tool hành động |
| 🔴 Cao | Cảnh báo + xử lý `stale_ref` | `click_element`, `fill_input`, v.v. |
| 🔴 Cao | Làm rõ `capture_screenshot` mặc định = viewport, thêm `fullPage` | #12 |
| 🔴 Cao | Chuẩn hóa ngưỡng truncation của `get_page_content` | #9 |
| 🟠 Trung bình | Thêm `labelContains`, `limit`, `offset`, `visibleOnly` cho `list_elements` | #10 |
| 🟠 Trung bình | Thêm `waitUntil`, `timeoutMs` cho `navigate` | #5 |
| 🟠 Trung bình | Thêm `scroll_to_element` | #21 |
| 🟠 Trung bình | Thêm `visible`, `boundingBox` vào kết quả phần tử | #10 |
| 🟠 Trung bình | Thêm `list_frames` + hỗ trợ `frameId` | #11 |
| 🟠 Trung bình | Ghi rõ hành vi `newTabId` khi click mở tab mới | #13 |
| 🟡 Thấp | Thêm `hover` | #17 |
| 🟡 Thấp | Thêm `upload_file` | #18 |
| 🟡 Thấp | Làm rõ `fill_input` ghi đè + thêm `clear_input` | #14, #15 |
| 🟡 Thấp | Thêm `evaluate_js` (kèm cảnh báo an toàn) | #23 |
| 🟡 Thấp | Tách `checkbox`/`radio` trong `elementType` enum | #10 |
| 🟡 Thấp | Thêm `clickType` cho `click_element` | #13 |

**Tổng số tool: 15 (gốc) → 23 (v2)**, gồm 8 tool mới và 6 tool được chỉnh sửa/bổ sung tham số.