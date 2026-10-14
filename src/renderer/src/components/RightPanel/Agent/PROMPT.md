# Template Prompt: Đồng bộ Component từ Zen (Gốc) sang Phantoma (Target)

Dưới đây là mẫu prompt chuẩn để yêu cầu AI thực hiện việc phân tích và đồng bộ hóa một component bất kỳ giữa hai phiên bản dự án.

## Cách sử dụng
1. Copy toàn bộ nội dung bên dưới.
2. Thay thế `{{TARGET_FOLDER_PATH}}` bằng đường dẫn folder component trong dự án **Phantoma** (nơi cần được cập nhật).
3. Thay thế `{{ROOT_FOLDER_PATH}}` bằng đường dẫn folder component tương ứng trong dự án **Zen/temp/Zen** (nguồn tham chiếu/gốc).
4. Gửi prompt cho AI.

---

## PROMPT TEMPLATE

```text
# NHIỆM VỤ: PHÂN TÍCH VÀ ĐỒNG BỘ CHỨC NĂNG & GIAO DIỆN COMPONENT

Hãy phân tích sâu sự khác biệt giữa hai thành phần sau và tiến hành đồng bộ hóa chúng theo nguyên tắc "Tương đồng về hành vi và trải nghiệm", không nhất thiết phải giống nhau 100% về mã nguồn hay phong cách CSS.

1. **Nguồn tham chiếu (Root/Gốc - Zen)**: 
   Đường dẫn: `{{ROOT_FOLDER_PATH}}`
   
2. **Thành phần đích (Target - Phantoma)**: 
   Đường dẫn: `{{TARGET_FOLDER_PATH}}`

## BỐI CẢNH KỸ THUẬT & TRIẾT LÝ ĐỒNG BỘ HÓA

- **Phiên bản Gốc (Zen)**: React + Inline Styles/CSS Modules + VSCode Theme Variables (`--vscode-*`). Đây là "Source of Truth" về mặt tính năng và UX.
- **Phiên bản Đích (Phantoma)**: React + Tailwind CSS + Custom Theme System. Đây là nơi cần áp dụng các tính năng đó nhưng phải tuân thủ quy ước code của Phantoma.
- **Nguyên tắc cốt lõi**:
    1. **Không copy-paste mù quáng**: Đừng cố gắng sao chép từng dòng code hay class name. Hãy hiểu *tại sao* nó làm vậy.
    2. **Tập trung vào Logic & Interaction**: So sánh kỹ các hook, state management, event handlers, điều kiện hiển thị (conditional rendering), và luồng xử lý dữ liệu. Nếu Gốc có tính năng A, Đích cũng phải có tính năng A hoạt động tương tự.
    3. **UI/UX Tương đồng, không Giống hệt**: Giao diện cuối cùng phải mang lại cảm giác sử dụng giống nhau (vị trí nút, thông tin hiển thị, feedback khi thao tác). Tuy nhiên, hãy chấp nhận khác biệt nhỏ về spacing, font-weight, hoặc màu sắc chi tiết nếu chúng phù hợp với Design System của Phantoma (Tailwind theme).
    4. **Xử lý Dependency**: Nếu Gốc dùng một utility/hook/component con mà Đích chưa có, hãy đánh giá xem nên Port sang Đích hay viết lại đơn giản hơn dựa trên khả năng sẵn có của Đích.

## CÁC BƯỚC THỰC HIỆN CHI TIẾT

### Bước 1: Khám phá & Phân tích Toàn diện (Deep Dive Analysis)
- Liệt kê tất cả các file trong cả hai folder.
- Đọc nội dung chi tiết các file chính (`index.tsx`, `types.ts`) và các component con/hook quan trọng.
- Tạo bảng so sánh đa chiều:
    - **Chức năng (Functionality)**: Các feature flags, chế độ hoạt động (modes), khả năng tương tác (drag-drop, paste, keyboard shortcuts).
    - **Trạng thái (State Management)**: Local state, global context usage, persistence (localStorage/sessionStorage).
    - **Luồng dữ liệu (Data Flow)**: Input props -> Processing -> Output events/callbacks.
    - **Giao diện (UI Layout)**: Cấu trúc DOM tree, thứ tự render, các badge/icon cảnh báo, dropdown menus.
    - **Khác biệt công nghệ**: Ghi chú rõ chỗ nào là do khác biệt CSS framework (VSCode var vs Tailwind class) để bỏ qua việc so sánh khắt khe.

### Bước 2: Lập kế hoạch Chiến lược (Strategic Planning)
- Xác định danh sách hành động cho từng file:
    - **Delete**: File/component thừa thãi hoặc đã bị deprecated ở bản Gốc.
    - **Create New**: Component/Hook/Util mới cần thiết để hỗ trợ tính năng từ bản Gốc.
    - **Refactor/Edit**: Cập nhật logic hiện có để khớp với hành vi của bản Gốc.
- Đề xuất giải pháp cho các vấn đề kỹ thuật:
    - Làm thế nào để map VSCode theme variables sang Tailwind classes?
    - Xử lý các import thiếu bằng cách tạo stub tạm thời hay port hoàn chỉnh?

### Bước 3: Thực thi Code Changes (Implementation)
Thực hiện theo thứ tự ưu tiên sau (batch operations):

1. **Cleanup**: Xóa các file thừa thãi (`delete_file`).
2. **Foundation**: Cập nhật `types.ts` và interfaces để mở khóa các props/state mới.
3. **Core Components**: 
    - Tạo mới các component phụ trợ cần thiết (`write_to_file`).
    - Chỉnh sửa các component hiện có để hỗ trợ logic mới (`replace_in_file`).
4. **Main Integration**: Viết lại hoặc chỉnh sửa nặng `index.tsx` để ghép nối toàn bộ layout và logic (`write_to_file` hoặc nhiều `replace_in_file`). Đảm bảo mọi tính năng từ bản Gốc đều được kích hoạt trong bản Đích.
5. **Polish & Fix**: Xử lý lỗi biên dịch TypeScript. Ưu tiên fix lỗi logic/type trước, lỗi style/theming sau. Dùng `as any` hoặc cast an toàn nếu cần thiết để đảm bảo build pass nhanh chóng, sau đó refactor sạch sẽ nếu còn thời gian.

### Bước 4: Kiểm tra & Verify (Validation)
- Chạy lệnh kiểm tra TypeScript: `npx tsc --noEmit --project tsconfig.web.json`.
- Lọc lỗi liên quan đến folder `{{TARGET_FOLDER_PATH}}`.
- Nếu có lỗi, quay lại Bước 3 để fix.
- Báo cáo kết quả cuối cùng:
    - Danh sách file đã thay đổi.
    - Tóm tắt các tính năng/chức năng đã được đồng bộ.
    - Liệt kê các điểm khác biệt còn tồn tại (và lý do chấp nhận chúng).
    - Hướng dẫn test thủ công cho người dùng.

## YÊU CẦU ĐẦU RA CUỐI CÙNG
- Mã nguồn sạch, không lỗi biên dịch nghiêm trọng.
- Hành vi (Behavior) và Trải nghiệm người dùng (UX) của `{{TARGET_FOLDER_PATH}}` phải tương đương với `{{ROOT_FOLDER_PATH}}`.
- Code phải tuân thủ quy ước của Phantoma (Tailwind, Project Structure) thay vì ép buộc theo kiểu Zen.
- Cung cấp tóm tắt ngắn gọn về những gì đã làm và những gì người dùng cần lưu ý/test.
```

---

## VÍ DỤ ÁP DỤNG CHO MESSAGEINPUT

Nếu bạn muốn áp dụng template này cho trường hợp cụ thể vừa rồi, giá trị điền vào sẽ là:

- `{{ROOT_FOLDER_PATH}}`: `Phantoma/temp/Zen/src/webview-ui/src/components/MessageInput`
- `{{TARGET_FOLDER_PATH}}`: `Phantoma/src/renderer/src/components/RightPanel/Agent/components/MessageInput`