# Công Cụ Code

## Phần 1: Tool Chủ Động

Các tool này cần được AI gọi bằng lệnh XML tương ứng.

---

### 1. `read_file`
Đọc nội dung file. Có thể đọc toàn bộ hoặc một đoạn bằng `start_line`/`end_line`.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `file_path` | **Có** | Đường dẫn file cần đọc |
| `start_line` | Không | Dòng bắt đầu (1-indexed) |
| `end_line` | Không | Dòng kết thúc (1-indexed) |

⚠️ Nên đọc theo đoạn nếu file quá lớn (>500 dòng) để tránh tràn context.

**Ví dụ:**
```
<read_file><file_path>src/utils.ts</file_path></read_file>
```

**Kết quả mẫu:**
```
[read_file] src/utils.ts (120 dòng)
1: import { logger } from './logger';
2:
3: export function add(a: number, b: number) {
...
```

---

### 2. `write_to_file`
Tạo file mới hoặc ghi đè nội dung file hiện có.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `file_path` | **Có** | Đường dẫn file cần tạo/ghi đè |
| `content` | **Có** | Toàn bộ nội dung file (dùng newline thật, không dùng `\n`) |

**Ví dụ:**
```
<write_to_file>
  <file_path>src/utils.ts</file_path>
  <content>
export function add(a: number, b: number) {
  return a + b;
}
  </content>
</write_to_file>
```

**Kết quả mẫu:**
```
[write_to_file] Created src/utils.ts
```

---

### 3. `replace_in_file`
Thay thế một đoạn nội dung chính xác trong file hiện có.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `file_path` | **Có** | Đường dẫn file cần sửa |
| `old_content` | **Có** | Đoạn nội dung cũ — phải khớp chính xác từng ký tự (kể cả thụt lề, khoảng trắng) |
| `new_content` | **Có** | Đoạn nội dung mới thay thế |

⚠️ Thẻ đóng của `new_content` phải là `</new_content>`, không được viết nhầm `</old_content>`.

⚠️ Không thử lại quá 2 lần với cùng `old_content`; nếu fail lần 2, hãy đọc lại file.

**Ví dụ:**
```
<replace_in_file>
  <file_path>src/utils.ts</file_path>
  <old_content>return a + b;</old_content>
  <new_content>return a - b;</new_content>
</replace_in_file>
```

**Kết quả mẫu:**
```
[replace_in_file] Updated src/utils.ts
```

---

### 4. `view_replace_history`
Xem lịch sử tất cả thao tác `replace_in_file` trên một file.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `file_path` | **Có** | Đường dẫn file cần xem lịch sử |

**Ví dụ:**
```
<view_replace_history><file_path>src/utils.ts</file_path></view_replace_history>
```

**Kết quả mẫu:**
```
[view_replace_history] src/utils.ts
[Version 1] Errors: 0, Warnings: 0
[Version 2] Errors: 0, Warnings: 0
```

---

### 5. `revert_file`
Hoàn tác thay đổi cuối cùng trên file, hoặc hoàn tác về một version cụ thể.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `file_path` | **Có** | Đường dẫn file cần hoàn tác |
| `version` | Không | Số version muốn quay về (từ `view_replace_history`). Nếu bỏ trống, hoàn tác thay đổi cuối cùng. |

**Ví dụ:**
```
<revert_file><file_path>src/utils.ts</file_path></revert_file>
```

**Kết quả mẫu:**
```
[revert_file] Reverted src/utils.ts
```

---

### 6. `list_files`
Liệt kê nội dung thư mục.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `folder_path` | **Có** | Đường dẫn thư mục cần liệt kê |
| `depth` | Không | Độ sâu đệ quy: `1`, `2`, `3`, `max` |

**Ví dụ:**
```
<list_files>
  <folder_path>src/components</folder_path>
  <depth>2</depth>
</list_files>
```

**Kết quả mẫu:**
```
[list_files] src/components (2 cấp)
src/components/
├─ Button.tsx
├─ Table/
│  ├─ index.tsx
│  └─ types.ts
└─ Modal.tsx
```

---

### 7. `find_files`
Tìm file theo tên hoặc pattern (tôn trọng `.gitignore`).

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `file_name` | **Có** | Tên file hoặc pattern (VD: `config.json`, `*.test.ts`) |
| `folder_path` | Không | Giới hạn phạm vi tìm trong thư mục này |

**Ví dụ:**
```
<find_files>
  <file_name>utils.ts</file_name>
  <folder_path>src</folder_path>
</find_files>
```

**Kết quả mẫu:**
```
[find_files] 1 file found
src/utils.ts
```

---

### 8. `grep`
Tìm kiếm nội dung theo regex trong một file hoặc toàn bộ thư mục.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `search_term` | **Có** | Regex pattern (case-insensitive) |
| `file_path` | Một trong hai | Tìm trong một file cụ thể |
| `folder_path` | Một trong hai | Tìm đệ quy trong thư mục |

⚠️ Phải cung cấp **một** trong hai: `file_path` hoặc `folder_path`.

**Ví dụ:**
```
<grep>
  <search_term>import.*useState</search_term>
  <folder_path>src/renderer/src</folder_path>
</grep>
```

**Kết quả mẫu:**
```
[grep] 3 matches in 2 files
src/App.tsx:
  1: import { useState } from 'react';
src/Home.tsx:
  5: import { useState, useEffect } from 'react';
```

---

### 9. `delete_file`
Xóa một file.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `file_path` | **Có** | Đường dẫn file cần xóa |

⚠️ Hành động không thể hoàn tác — chỉ xóa khi thực sự cần thiết.

**Ví dụ:**
```
<delete_file><file_path>src/old-file.ts</file_path></delete_file>
```

**Kết quả mẫu:**
```
[delete_file] Deleted src/old-file.ts
```

---

### 10. `run_command`
Chạy lệnh shell trong workspace.

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `command` | **Có** | Lệnh shell cần chạy |
| `folder_path` | Không | Thư mục chạy lệnh (mặc định là workspace root) |

⚠️ Nếu exit code khác 0, lệnh thất bại — phải phân tích `stderr` trước khi làm gì tiếp.

⚠️ Không chạy lệnh phá hủy (`rm -rf`, `git push --force`, `git reset --hard`, ...) khi chưa có xác nhận rõ ràng.

**Ví dụ:**
```
<run_command><command>npm test</command></run_command>
```

**Kết quả mẫu:**
```
[run_command] npm test
PASS  tests/utils.test.ts
```

---

## Quy Tắc Quan Trọng

1. **Đọc trước khi sửa**: luôn dùng `read_file` để xem nội dung file trước khi `write_to_file`/`replace_in_file`.
2. **Không đoán kết quả tool**: phải chờ output thực tế trả về rồi mới quyết định bước tiếp theo.
3. **Batch độc lập**: gộp nhiều thao tác đọc/ghi độc lập vào cùng một lượt, tối đa 3 lệnh cùng loại mỗi turn.
4. **Không tự ý mở rộng scope**: chỉ sửa file liên quan trực tiếp tới yêu cầu.
5. **Ưu tiên xóa hơn thêm**: code tốt nhất là code không cần viết.
6. **Khi thay thế nhiều file**: nếu >4 file hoặc chạm shared code, phải xác nhận với user trước.