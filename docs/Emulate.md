# Module Emulate — Giả lập và phân tích lưu lượng mạng

## 1. Giới thiệu

Module **Emulate** là công cụ giúp bạn chạy thử và phân tích các ứng dụng (web, desktop, Android, CLI) trong môi trường có kiểm soát. Khi một ứng dụng chạy, mọi request/response truyền qua mạng đều được ghi lại để bạn xem chi tiết, lọc, chỉnh sửa và gửi lại.

Bạn có thể chọn cách can thiệp:
- **MITM** — đặt một proxy trung gian để bắt và thay đổi lưu lượng.
- **CDP** — điều khiển trình duyệt trực tiếp thông qua giao thức dành cho nhà phát triển.
- **Frida** — can thiệp sâu vào ứng dụng, đặc biệt hữu ích với ứng dụng Android.

---

## 2. Chức năng chính

### 2.1. Quản lý mục tiêu
- Thêm mục tiêu mới với 4 loại: Web, Desktop, Android, CLI.
- Chỉnh sửa thông tin mục tiêu (tên, URL, đường dẫn ứng dụng, tham số khởi động).
- Xóa mục tiêu không còn dùng.
- Tự chọn mục tiêu đầu tiên khi mở module.
- Lưu l���i thời gian sử dụng gần nhất của từng mục tiêu.

### 2.2. Điều khiển mục tiêu
- Khởi chạy mục tiêu với chế độ MITM, CDP hoặc Frida.
- Dừng phiên và đóng ứng dụng.
- Bật/tắt chế độ chặn request để chỉnh sửa trước khi gửi tiếp.
- Đếm thời gian mục tiêu đã chạy.

### 2.3. Theo dõi lưu lượng mạng
- Ghi lại mọi request/response khi mục tiêu hoạt động.
- Xem chi tiết từng request: URL, phương thức, trạng thái, header, body.
- Tự động bỏ qua các request không phải mạng thật.
- Đánh dấu request bị timeout hoặc không phản hồi.
- Tính toán thống kê: số request HTTPS, tổng dung lượng truyền tải, thời gian phản hồi.

### 2.4. Lọc request
- Lọc theo phương thức HTTP (GET, POST, PUT...).
- Lọc theo tên miền.
- Lọc theo trạng thái (thành công, lỗi...).
- Lọc theo loại tài nguyên (script, hình ảnh, stylesheet...).
- Tự động lưu và nạp lại bộ lọc khi mở mục tiêu.

### 2.5. Tấn công tự động và fuzz (Intruder)
- Tự động gửi nhiều biến thể của một request với các tham số khác nhau.
- Cấu hình vị trí cần fuzz (tham số, header...).
- Tạo danh sách payload để thử.
- Chạy fuzz tự động và xem kết quả.

### 2.6. Gửi lại request thủ công (Repeater)
- Lấy request đã bắt được, chỉnh sửa và gửi lại nhiều lần.
- Quản lý danh sách request dùng để thử lại.
- Tạo nhiều payload cho một request.
- Chạy request với từng payload và xem kết quả.
- Lưu lịch sử các lần chạy để so sánh.

### 2.7. Quản lý tài nguyên trang
- Liệt kê tất cả tài nguyên mà trang web đã tải (hình ảnh, script, stylesheet...).
- Xem trước nội dung từng tài nguyên.
- Phân tích những tài nguyên nào trang web sử dụng.

### 2.8. Xem mã nguồn
- Hiển thị mã nguồn của các script mà trang web tải về.
- Xem mã nguồn đã được giải nén từ source map.
- Duyệt cây file và xem nội dung với tô màu cú pháp.

### 2.9. Nhật ký Android (logcat)
- Thu thập nhật ký từ thiết bị Android đang kết nối.
- Lọc log theo mức độ (info, warning, error...).
- Phân tích hành vi ứng dụng Android.

### 2.10. Quản lý thiết bị Android
- Xem danh sách thiết bị Android kết nối.
- Chọn thiết bị để làm việc.
- Theo dõi trạng thái thiết bị.

---

## 3. Tiện ích và tính năng

- **Phân tích request/response**: tự động phân loại và giải mã nội dung.
- **Giải mã body nhị phân**: hiển thị nội dung nhị phân dạng dễ đọc.
- **Làm đẹp mã nguồn**: format JSON, JavaScript, CSS...
- **Phát hiện WebAssembly**: nhận diện nội dung WebAssembly trong response.
- **Phân trang request**: tự động quản lý bộ nhớ khi có nhiều request.
- **Tìm kiếm mục tiêu**: tìm theo tên hoặc URL.
- **Lọc mục tiêu theo nền tảng**: chỉ xem mục tiêu web, Android...
- **Xóa hàng loạt mục tiêu**.

---

## 4. Nghiệp vụ tiêu biểu

1. **Phân tích website** — Thêm mục tiêu web, khởi chạy chế độ CDP, duyệt web và xem mọi request được ghi lại.
2. **Can thiệp lưu lượng** — Dùng chế độ MITM để chặn và chỉnh sửa request trước khi gửi.
3. **Phân tích ứng dụng Android** — Kết nối thiết bị, xem logcat, dùng Frida để can thiệp.
4. **Fuzz tham số API** — Gửi request sang Intruder hoặc Repeater, tạo payload và chạy thử.
5. **Xem mã nguồn trang web** — Xem script đã tải, kể cả mã đã được giải nén.
6. **Quản lý tài nguyên trang** — Xem tất cả hình ảnh, script, stylesheet mà trang web tải về.
7. **Lọc request lỗi** — Lọc chỉ xem request có trạng thái 500 để nhanh chóng tìm vấn đề.
8. **Gửi lại request cũ** — Từ lịch sử Repeater, chọn request đã lưu và chạy lại.
9. **Xóa mục tiêu không dùng** — Loại bỏ mục tiêu, dữ liệu liên quan được quản lý tự động.
10. **Theo dõi hiệu năng mạng** — Xem tổng dung lượng truyền tải, số request HTTPS, thời gian phản hồi.

---

## 5. Liên kết với các phần khác

- **Trợ lý AI**: trạng thái mục tiêu đang hoạt động được chia sẻ cho trợ lý.