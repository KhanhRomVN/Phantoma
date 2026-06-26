# Button Variants - Hướng dẫn sử dụng biến theme

## Giới thiệu

Button component sử dụng các biến màu từ theme để tạo ra các variant khác nhau. Các biến này được định nghĩa trong file theme và tự động thay đổi theo theme đang active.

## Các biến theme sử dụng

- `primary`: Màu chính của theme
- `textForeground`: Màu chữ tương phản với primary (dùng cho solid variant)
- `textPrimary`: Màu chữ chính của theme
- `background`: Màu nền của theme

## 4 Variant Button

### 1. Solid (Nổi bật)

Button có nền đặc, màu sắc nổi bật, thường dùng cho hành động chính (primary action).

```tsx
// CSS classes
bg-primary text-textForeground hover:bg-primary/90

// Sử dụng trong component
<Button variant="solid">Primary Action</Button>
```

**Theme mapping:**
- **CrispWhite**: bg-[rgb(0,102,204)] text-[rgb(255,255,255)]
- **MonoBlack**: bg-[rgb(255,255,255)] text-[rgb(0,0,0)]
- **SoftLight**: bg-[rgb(90,108,138)] text-[rgb(245,240,235)]
- **MidnightBlue**: bg-[rgb(10,132,255)] text-[rgb(200,214,240)] ✅

---

### 2. Outline (Đường viền)

Button có viền, nền trong suốt, thường dùng cho hành động thứ cấp (secondary action).

```tsx
// CSS classes
border border-primary text-primary hover:bg-primary/10

// Sử dụng trong component
<Button variant="outline">Secondary Action</Button>
```

**Theme mapping:**
- Tất cả theme: border + text = primary màu, hover có nền primary trong suốt 10%

---

### 3. Soft (Mềm mại)

Button có nền nhẹ, màu sắc tinh tế, thường dùng cho hành động không quá quan trọng hoặc trong các context nhẹ nhàng.

```tsx
// CSS classes
bg-primary/10 text-primary hover:bg-primary/20

// Sử dụng trong component
<Button variant="soft">Soft Action</Button>
```

**Theme mapping:**
- Tất cả theme: nền primary với độ trong suốt 10%, text primary

---

### 4. Ghost (Trong suốt)

Button trong suốt, chỉ hiển thị text, thường dùng cho hành động không nổi bật hoặc trong toolbar/navigation.

```tsx
// CSS classes
text-primary hover:bg-primary/10

// Sử dụng trong component
<Button variant="ghost">Ghost Action</Button>
```

**Theme mapping:**
- Tất cả theme: text primary, hover có nền primary trong suốt 10%

---

## Bảng tóm tắt các variant

| Variant | CSS Classes | Use Case |
|---------|-------------|----------|
| **solid** | `bg-primary text-textForeground hover:bg-primary/90` | Primary action, nổi bật nhất |
| **outline** | `border border-primary text-primary hover:bg-primary/10` | Secondary action, có viền |
| **soft** | `bg-primary/10 text-primary hover:bg-primary/20` | Tertiary action, nhẹ nhàng |
| **ghost** | `text-primary hover:bg-primary/10` | Toolbar/Navigation, tối giản |

---

## Lưu ý quan trọng về MidnightBlue

**Vấn đề:** MidnightBlue có `textForeground = rgb(15, 19, 25)` (màu tối) không tương phản với `primary = rgb(10, 132, 255)` (màu xanh dương sáng).

**Giải pháp:** Đã sửa MidnightBlue theme:
```ts
// Trước (sai)
textForeground: 'rgb(15, 19, 25)',

// Sau (đúng)
textForeground: 'rgb(200, 214, 240)', // textPrimary
```

Giờ đây solid variant của MidnightBlue sẽ có text màu sáng trên nền blue, đảm bảo độ tương phản và khả năng đọc.

---

## Kiểm tra độ tương phản

Để đảm bảo button luôn đọc được, các theme cần đáp ứng:
- **Solid**: primary và textForeground phải tương phản tốt (tối thiểu 4.5:1)
- **Outline, Soft, Ghost**: text-primary phải tương phản với background (tối thiểu 4.5:1)

Nếu theme không đáp ứng, cần điều chỉnh màu sắc trong file theme.