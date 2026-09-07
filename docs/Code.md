# Module Code — Trình soạn thảo và quản lý dự án

## 1. Giới thiệu

Module **Code** là môi trường làm việc chính dành cho lập trình viên ngay trong ứng dụng. Tại đây, bạn có thể mở và quản lý nhiều dự án, soạn thảo mã nguồn với đầy đủ tính năng hỗ trợ thông minh, chạy lệnh trong terminal, quản lý công việc, thiết kế và cấu hình trợ lý AI.

Mọi trạng thái làm việc — dự án đang mở, file đang chỉnh sửa, bảng đang bật/tắt — đều được tự động lưu lại. Khi mở lại ứng dụng, bạn tiếp tục công việc ngay tại nơi đã dừng mà không cần thao tác lại.

---

## 2. Chức năng chính

### 2.1. Quản lý dự án
- Thêm dự án mới từ thư mục trên máy hoặc tạo dự án trống.
- Chuyển đổi giữa nhiều dự án, mỗi dự án giữ nguyên trạng thái làm việc riêng.
- Xóa dự án không còn dùng.
- Tự động khôi phục dự án và cây file khi mở lại ứng dụng.

### 2.2. Quản lý dịch vụ
Mỗi dự án có thể gắn nhiều loại nội dung đặc biệt:
- Website, ứng dụng, thiết bị, cơ sở dữ liệu, API.
- Thiết kế — mỗi bản thiết kế tự động có tab riêng.
- Nhóm trợ lý AI — mỗi nhóm có không gian làm việc riêng.
- Tiện ích mở rộng (MCP) — xem và cấu hình chi tiết.

### 2.3. Soạn thảo mã nguồn
- Hỗ trợ 11 ngôn ngữ lập trình: TypeScript, JavaScript, Python, Go, Rust, Java, C++, C, C#, PHP, Ruby.
- Tự động nhận diện ngôn ngữ và tô màu cú pháp.
- Phát hiện lỗi và cảnh báo ngay trong lúc gõ.
- Mở nhiều file cùng lúc, mỗi file là một tab.

### 2.4. Lưu và bảo vệ dữ liệu
- Tự động theo dõi file chưa lưu.
- Cảnh báo khi đóng ứng dụng nếu còn file chưa lưu.
- Lưu nhanh bằng phím tắt.
- Lưu file thành bản sao mà không ảnh hưởng bản gốc.

### 2.5. Theo dõi thay đổi file bên ngoài
- Phát hiện khi file bị thay đổi bởi chương trình khác (git, editor ngoài...).
- Tự động cập nhật nội dung mới vào trình soạn thảo.
- Giải phóng tài nguyên thông minh khi file không còn được dùng.

### 2.6. Chạy lệnh và xem log
- Cửa sổ terminal tích hợp để chạy lệnh trực tiếp.
- Xem nhật ký hoạt động của hệ thống.
- Xem danh sách tất cả lỗi và cảnh báo trong dự án.

---

## 3. Tiện ích và tính năng

- **Tìm và mở file nhanh**: gõ tên gần đúng vẫn tìm ra file (tìm kiếm mờ).
- **Tìm kiếm trong toàn bộ dự án**: tìm theo tên file hoặc nội dung bên trong.
- **Quản lý công việc**: tạo danh sách việc cần làm, theo dõi trạng thái hoàn thành.
- **Quản lý thiết kế**: tạo, chỉnh sửa, xóa bản thiết kế.
- **Quản lý nhóm trợ lý AI**: tạo nhóm, thêm terminal cho trợ lý.
- **Quản lý MCP**: thêm, cài đặt, gỡ cài đặt MCP server.
- **So sánh khác biệt**: xem sự khác nhau giữa các phiên bản nội dung file.
- **Thông báo dạng toast**: hiển thị thông báo thành công, lỗi, cảnh báo.
- **Phím tắt toàn cục**: mở dự án, tạo dự án, tìm file nhanh, lưu file, đóng tab, bật/tắt bảng dưới, mở terminal.

---

## 4. Nghiệp vụ tiêu biểu

1. **Mở và làm việc với dự án cũ** — Ứng dụng tự khôi phục cây file và các tab đang mở từ lần trước.
2. **Viết code với hỗ trợ thông minh** — Lỗi được báo ngay khi gõ, không cần build thủ công.
3. **Quản lý công việc theo dự án** — Tạo danh sách việc cần làm, đánh dấu hoàn thành.
4. **Làm việc với thiết kế** — Tạo thiết k���, mở ngay để xem và chỉnh sửa.
5. **Cấu hình trợ lý AI** — Tạo nhóm trợ lý, thêm terminal để trợ lý thao tác.
6. **Cài đặt MCP** — Thêm MCP server, cài đặt và cấu hình.
7. **Chạy lệnh trong terminal** — Mở terminal để chạy lệnh trực tiếp.
8. **Tìm lỗi nhanh** — Xem danh sách lỗi, nhấp để nhảy tới vị trí cần sửa.
9. **Lưu bản sao file** — Lưu file thành bản sao mà không ảnh hưởng bản gốc.
10. **Bảo vệ dữ liệu khi đóng ứng dụng** — Nhận cảnh báo nếu còn file chưa lưu.
11. **Làm việc đa dự án** — Chuyển đổi giữa nhiều dự án không mất ngữ cảnh.
12. **Đồng bộ với công cụ bên ngoài** — File bị thay đổi bên ngoài được tự động cập nhật.

---

## 5. Liên kết với các phần khác

- **Trợ lý AI**: trạng thái dự án hiện tại được chia sẻ cho trợ lý, giúp trợ lý biết bạn đang làm việc ở đâu.