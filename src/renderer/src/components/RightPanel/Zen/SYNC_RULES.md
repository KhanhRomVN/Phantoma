# Quy Tắc Đồng Bộ Hóa: Zen -> Phantoma (One-Way Sync)

> 🔴 **QUY TẮC CỐT LÕI (BẤT DI BẤT DỊCH):**
> 1. **ZEN LÀ GỐC TUYỆT ĐỐI (SOURCE OF TRUTH).** Mọi logic, UI, flow đều lấy Zen làm chuẩn.
> 2. **PHANTOMA CÓ - ZEN KHÔNG CÓ** => **XÓA** khỏi Phantoma ngay lập tức.
> 3. **PHANTOMA THIẾU - ZEN CÓ** => **THÊM/COPY** từ Zen sang Phantoma.
> 4. **CẢ 2 ĐỀU CÓ** => **SO SÁNH LOGIC**. Nếu Phantoma khác/sai so với Zen => **SỬA PHANTOMA THEO ZEN**.
>
> *Ngoại lệ duy nhất:* Khác biệt về Tech Stack (CSS/Tailwind vs Inline/VSCode vars, Electron IPC vs Webview PostMessage). Phần này được map tương đương, không cần xóa hay thêm file mới nếu chức năng giống nhau.

## Cách sử dụng cho AI Agent
Khi người dùng yêu cầu đồng bộ một feature (ví dụ: Account, Chat, Home):
1. Đọc kỹ folder nguồn (`temp/Zen/...`) và folder đích (`src/renderer/...`).
2. Áp dụng 4 quy tắc trên để tạo danh sách hành động:
   - **DELETE LIST**: Files/Folders tồn tại ở Phantoma nhưng không có ở Zen.
   - **CREATE LIST**: Files/Folders tồn tại ở Zen nhưng không có ở Phantoma.
   - **UPDATE LIST**: Files trùng tên/cùng mục đích nhưng nội dung/logic khác nhau.
3. Thực thi theo thứ tự: Delete -> Create -> Update.
4. Không hỏi lại người dùng về chiến lược đồng bộ, vì quy tắc đã cố định ở trên.

## QUY TRÌNH THỰC HIỆN CHI TIẾT (CHO AGENT)

### Bước 1: Khảo sát & Phân loại File
Liệt kê tất cả file trong cả 2 folder (bao gồm subfolders). Áp dụng luật:
- **Group DELETE**: Có ở Phantoma, KHÔNG có ở Zen -> Đánh dấu xóa.
- **Group CREATE**: Có ở Zen, KHÔNG có ở Phantoma -> Đánh dấu tạo mới (copy logic từ Zen).
- **Group UPDATE**: Có ở cả 2 -> Đọc nội dung, so sánh logic/state/UI flow. Nếu khác -> Đánh dấu sửa Phantoma theo Zen.
- **Rename Check**: Nếu tên file khác nhau nhưng chức năng giống (vd: `ConfirmDeleteDrawer` vs `ConfirmDeleteAccountDrawer`) -> Ưu tiên đặt tên theo Zen.

### Bước 2: Thực thi Delete
Xóa toàn bộ Group DELETE khỏi Phantoma. Sửa imports liên quan nếu cần.

### Bước 3: Thực thi Create
Copy nội dung file từ Zen sang Phantoma cho Group CREATE.
- **Map Tech Stack**: Chuyển đổi CSS variables (`--vscode-*`, inline styles) sang Tailwind classes/custom vars của Phantoma.
- **Adjust Imports**: Sửa đường dẫn import để khớp cấu trúc thư mục Phantoma.

### Bước 4: Thực thi Update
Với Group UPDATE, chỉnh sửa file Phantoma để đạt trạng thái tương đương Zen:
- **Logic**: Sync state management, hooks, API calls, error handling.
- **UI/UX**: Sync layout, conditional rendering, interaction patterns (hover, click, drag).
- **Data Structure**: Đảm bảo Types/Interfaces khớp với data trả về từ backend/API như Zen mong đợi.

### Bước 5: Verify
Chạy build/type-check. Đảm bảo không còn tham chiếu đến file đã xóa. Kiểm tra visual/logic runtime.

---

## LƯU Ý QUAN TRỌNG

1. **KHÔNG BỎ QUA FILE NÀO**: Mọi file trong folder gốc (Zen) đều phải được xem xét. Nếu file đó không cần thiết cho Phantoma do kiến trúc khác, phải ghi rõ lý do skip, mặc định là COPY.
2. **KHÔNG ĐỒNG BỘ RESPONSIVE**: Bỏ qua toàn bộ logic responsive (useContainerWidth, @container queries, width breakpoints). Phantoma mặc định luôn sử dụng layout hẹp (narrow) cố định cho desktop.
3. **GIỮ NGUYÊN KIẾN TRÚC RIÊNG CỦA PHANTOMA KHI MAP TECH STACK**: 
   - Ví dụ: Zen dùng `extensionService.postMessage`, Phantoma dùng `ipcRenderer.invoke`. Khi copy code, chỉ thay đổi phần giao tiếp này, giữ nguyên luồng xử lý dữ liệu và UI logic của Zen.
   - Ví dụ: Zen dùng Inline Style, Phantoma dùng Tailwind. Chuyển đổi class name tương ứng, không giữ inline style nếu không bắt buộc.

## VÍ DỤ ÁP DỤNG

Nếu bạn muốn đồng bộ Home feature:

- `ROOT_FOLDER_PATH`: `Phantoma/temp/Zen/src/webview-ui/src/features/home`
- `TARGET_FOLDER_PATH`: `Phantoma/src/renderer/src/components/RightPanel/Agent/feature/Home`

AI sẽ tự động:
1. Quét 2 folder.
2. Liệt kê files thừa/thiếu/khác.
3. Xóa files thừa ở Phantoma.
4. Copy files thiếu từ Zen vào Phantoma (map tech stack).
5. Sửa files chung để khớp logic Zen.
6. Báo cáo kết quả.