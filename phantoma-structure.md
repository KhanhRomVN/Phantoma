# Cấu trúc thư mục Phantoma

## Giải thích phân cấp
- **App**: Ứng dụng Phantoma bao gồm nhiều **Module**.
- **Module**: Mỗi module là một thành phần độc lập, có thể hoạt động như một ứng dụng riêng biệt mà không ảnh hưởng đến các module khác. Ví dụ: Emulate, Scan, Recon, Wireless là các module.
- **Feature**: Là các tính năng cụ thể bên trong một module. Một module có thể có nhiều feature, nhưng một feature không thể tạo thành một module độc lập. Ví dụ: General, Proxy Manager là các feature của module Setting.


Phantoma/
├── Dashboard [UI]/
├── Recon [MODULE]/
├── Scan [MODULE]/
├── Emulate [MODULE]/
├── Wireless [MODULE]/
└── Setting [UI]/
    ├── General [FEATURE]/
    └── Proxy Manager [FEATURE]/
```

---

## Mô tả chức năng các module

### Dashboard [UI]
**Vai trò**: Mô phỏng tấn công, kiểm tra và đánh giá khả năng phòng thủ của hệ thống thông qua việc bắt, phân tích và tái sử dụng lưu lượng HTTPS từ website/ứng dụng mục tiêu. Trang tổng quát về toàn bộ hệ thống Phantoma. Người dùng có thể xem các chỉ số hoạt động, cảnh báo, và truy cập nhanh vào các chức năng chính.

---

### Recon [MODULE]
**Vai trò**: Thu thập thông tin chủ động và bị động như: dò tìm cổng, phân tích subdomain, thu thập thông tin DNS, và xác định công nghệ sử dụng của mục tiêu.

---

### Scan [MODULE]
**Vai trò**: Quét lỗ hổng tự động, bao gồm quét web, quét API, và quét cơ sở hạ tầng. Hỗ trợ cấu hình và tùy chỉnh các quy trình quét theo nhu cầu.

---

### Emulate [MODULE]
**Vai trò**: Mô phỏng tấn công, kiểm tra và đánh giá khả năng phòng thủ của hệ thống thông qua việc bắt, phân tích và tái sử dụng lưu lượng HTTPS từ website/ứng dụng mục tiêu.

**Chức năng**:
- Bắt toàn bộ lưu lượng HTTPS từ một website/ứng dụng cụ thể (trên cả PC và mobile) để phân tích và tái sử dụng.
- Phân tích luồng HTTPS nhằm phát hiện các lỗ hổng bảo mật tiềm ẩn trong giao tiếp của mục tiêu.
- Sử dụng dữ liệu HTTPS đã bắt để thực hiện các cuộc tấn công Intruder (tự động hóa payload) và Repeater (lặp lại yêu cầu tùy chỉnh) nhằm kiểm tra điểm yếu.
- Giả lập hành vi của mục tiêu dựa trên dữ liệu HTTPS thu thập được, phục vụ cho việc đánh giá khả năng phòng thủ và mô phỏng tấn công.

---

### Wireless [MODULE]
**Vai trò**: Quản lý và phân tích các mạng không dây (Wi-Fi, Bluetooth, v.v.).

---

### Setting [UI]

#### General [FEATURE]
**Vai trò**: Cài đặt chung cho toàn bộ ứng dụng.

#### Proxy Manager [FEATURE]
**Vai trò**: Quản lý các kết nối proxy, bao gồm: xác thực, chuyển tiếp yêu cầu, và ghi nhật ký hoạt động. Hỗ trợ cấu hình nhiều proxy và chuyển đổi linh hoạt giữa chúng.
