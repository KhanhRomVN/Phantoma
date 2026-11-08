# Quy tắc khi tạo theme

## 1. Không dùng màu background thiên về đỏ, xanh lá, xanh biển, vàng

Các màu này là màu ngữ nghĩa của UI (`--error`, `--success`, `--info`/`--primary`, `--warn`) và các màu trạng thái khác. Nếu dùng cho background (`--background`, `--card-background`, `--sidebar-background`, `--input-background`, `--dropdown-background`, `--button-soft-background`...) thì sẽ lẫn với trạng thái và làm mất tác dụng báo hiệu.

- Background, surface, sidebar, input, dropdown, table, button soft nên là màu trung tính (đen, xám, xám ngả tím/than nhạt).
- Màu đỏ / xanh lá / xanh biển / vàng chỉ dùng cho semantic colors và base palette.

## 2. Theme chủ đạo là dark

- Chỉ tạo theme có `type: 'dark'`.
- Không tạo theme light. Các theme light cũ (`CrispWhite`, `Embersunset`, `LavenderMist`, `SoftLight`) đã bị xóa.

## 3. Checklist trước khi thêm theme mới

1. `type` là `'dark'`.
2. Mọi key background là màu trung tính, không ngả đỏ / xanh lá / xanh biển / vàng.
3. Đủ key theo `ThemeConfig` (xem `types/theme.types.ts`) và khớp whitelist biến trong `.styling-rules.md`.