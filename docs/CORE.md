⚙️ Phantoma CORE — Tài Liệu Module Lõi
Phiên bản: 1.0.0
Module: Core Utilities & Infrastructure
Nền tảng: Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa

📑 Mục Lục
1. Tổng Quan Kiến Trúc

2. Quản Lý Cấu Hình (Config)

3. Quản Lý Workspace & Dự Án

4. Logging & Audit

5. Quản Lý API Keys & Secrets

6. Thông Báo & Callback

7. Tiện Ích Hệ Thống

8. API & Mở Rộng

9. Hướng Dẫn Phát Triển

1. Tổng Quan Kiến Trúc
Module CORE không hiển thị giao diện chính cho người dùng (hoặc chỉ một panel cài đặt nhỏ). Nó cung cấp các service và context cho toàn bộ các module khác (INTEL, SCAN, ATTACK...). Mọi module đều gọi đến CORE để lấy cấu hình, ghi log, quản lý workspace, v.v.

text
CORE/
├── CORE.md                      ← Tài liệu này
├── index.tsx                    ← (Có thể export các hooks/provider)
├── config/
│   ├── default.ts               ← Cấu hình mặc định
│   ├── schema.ts                ← Zod schema cho config
│   └── ConfigManager.tsx        ← React context + methods
├── workspace/
│   ├── WorkspaceManager.tsx     ← Tạo/xóa/đổi tên workspace
│   ├── storage.ts               ← Lưu trữ dữ liệu (IndexedDB, file)
│   └── WorkspaceSelector.tsx    ← UI nhỏ để chọn workspace
├── logging/
│   ├── logger.ts                ← Winston/pino wrapper
│   ├── auditLogger.ts           ← Ghi lại hành động nhạy cảm
│   └── LogViewer.tsx            ← Component xem log (chỉ admin)
├── secrets/
│   ├── vault.ts                 ← Mã hóa và lưu API keys
│   └── SecretManager.tsx
├── notifications/
│   ├── notifier.ts              ← Gửi email, Slack, Telegram
│   └── NotificationCenter.tsx   ← UI thông báo nội bộ
├── utils/
│   ├── crypto.ts                ← Hàm mã hóa/giải mã
│   ├── validator.ts             ← Validate IP, domain, ...
│   └── formatter.ts             ← Format ngày, bytes, ...
└── hooks/                       ← useCoreConfig, useWorkspace, ...
2. Quản Lý Cấu Hình (Config)
2.1 Cấu trúc config
typescript
interface CoreConfig {
  // Giới hạn chung
  general: {
    maxConcurrentTasks: number;     // Mặc định 5
    defaultTimeout: number;         // 300 giây
    allowInternalScan: boolean;     // false
    userAgent: string;
  };
  // API keys cho các service bên ngoài
  apiKeys: {
    shodan?: string;
    securitytrails?: string;
    haveibeenpwned?: string;
    github?: string;
    builtwith?: string;
    alienvault?: string;
    censys?: string;
    hybridAnalysis?: string;
    // ...
  };
  // Cấu hình từng module
  modules: {
    intel: { ... };
    scan: { nmapPath: string; masscanPath: string; rateLimit: number; };
    wireless: { interface: string; monitorMode: boolean; };
    attack: { enableDangerous: boolean; maxRetries: number; };
    cloud: { awsProfile?: string; azureTenantId?: string; };
    // ...
  };
  // Logging & audit
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    auditEnabled: boolean;
    logRetentionDays: number;
  };
  // Workspace
  workspace: {
    autoSave: boolean;
    storageType: 'indexeddb' | 'file';
    basePath?: string;
  };
}
2.2 ConfigManager
Lưu config dưới dạng JSON trong localStorage (cho UI) và file trên server (cho backend).

Hỗ trợ nhập/xuất config (JSON file).

Có UI panel để người dùng sửa các thông số (chỉ những phần được phép).

Component: config/ConfigPanel.tsx – dạng form, chia tabs (General, API Keys, Modules, Logging, Workspace).

3. Quản Lý Workspace & Dự Án
3.1 Khái niệm
Workspace là một không gian lưu trữ riêng biệt, chứa: danh sách targets, kết quả của các module, log, báo cáo tạm.

Người dùng có thể tạo nhiều workspace (ví dụ: "Client A audit", "Internal pentest", "Lab").

3.2 Cấu trúc dữ liệu workspace
typescript
interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  targets: {
    domain: string[];
    ip: string[];
    person: string[];
    organization: string[];
  };
  results: {
    intel?: any;
    scan?: any;
    attack?: any;
    // ...
  };
  logs: string[];          // tham chiếu đến file log
  metadata: Record<string, any>;
}
3.3 WorkspaceManager
Tạo workspace: tạo thư mục (nếu dùng file storage) hoặc bản ghi IndexedDB.

Lưu kết quả: mỗi module sau khi chạy xong gọi saveResult(workspaceId, module, data).

Tải workspace: load toàn bộ dữ liệu về UI, cho phép tiếp tục từ lần trước.

Xóa/đổi tên/export workspace.

Component: WorkspaceSelector.tsx – dropdown chọn workspace, nút "New Workspace", "Import".

4. Logging & Audit
4.1 Logger hệ thống
Dùng winston hoặc pino để ghi log ra console + file.

Mỗi module có logger riêng nhưng đều gửi về CORE.

Log được phân cấp: error, warn, info, debug.

4.2 Audit Log
Ghi lại các hành động nhạy cảm, không thể xóa hoặc sửa:

Hành động	Thông tin ghi
Chạy active scan	user, target, thời gian, IP nguồn
Thực thi exploit	user, target, exploit name, kết quả
Thay đổi cấu hình module	user, module, tham số cũ/mới
Export/import workspace	user, workspace name
Đăng nhập/đăng xuất	user, IP, thời gian
Audit log được lưu trong file riêng, có thể xuất ra JSON để phân tích.

Component: LogViewer.tsx – chỉ hiển thị cho admin, có bộ lọc theo module, mức độ, thời gian.

4.3 Storage & Retention
Log thường: giữ 30 ngày (có thể cấu hình).

Audit log: giữ 1 năm hoặc vĩnh viễn.

Có cơ chế tự động xóa log cũ.

5. Quản Lý API Keys & Secrets
5.1 Nguyên tắc bảo mật
Không lưu API keys trong source code hoặc localStorage dưới dạng plaintext.

Dùng mã hóa đối xứng (AES‑256‑GCM) với key được tạo từ mật khẩu người dùng hoặc từ biến môi trường (backend).

Chỉ giải mã khi cần sử dụng, không giữ trong RAM lâu.

5.2 Secret Vault
Backend: lưu keys trong database đã mã hóa, dùng vault như HashiCorp Vault hoặc tự implement.

Frontend: người dùng nhập key vào form, key được gửi thẳng đến backend (không lưu trên client).

5.3 UI để quản lý API keys
Hiển thị danh sách các service (Shodan, SecurityTrails, ...).

Người dùng nhập key, backend lưu (mã hóa).

Có thể test key (gửi request thử) để xác nhận hợp lệ.

Cho phép xóa key.

Component: secrets/APIKeyManager.tsx.

6. Thông Báo & Callback
6.1 Notification channels
In‑app: hiển thị toast hoặc notification center.

Email: gửi qua SMTP (cấu hình riêng).

Slack / Discord / Telegram: webhook.

Webhook: gọi HTTP callback đến URL tùy chỉnh.

6.2 Sự kiện gửi thông báo
Khi một module dài (scan, attack) hoàn thành.

Khi phát hiện lỗ hổng nghiêm trọng (critical).

Khi có lỗi không thể khắc phục.

Component: notifications/NotificationCenter.tsx – danh sách thông báo trong app.

7. Tiện Ích Hệ Thống
7.1 Crypto helpers
Mã hóa/giải mã AES‑256‑GCM.

Tạo hash (SHA‑256, SHA‑512).

Tạo random token.

7.2 Validators
Kiểm tra IP, domain, email, CIDR range.

Kiểm tra URL hợp lệ, phát hiện IP private.

7.3 Formatters
Định dạng bytes (KB, MB, GB).

Định dạng thời gian tương đối (2 phút trước).

Escape HTML, JSON.

7.4 System Info
Lấy thông tin về hệ điều hành, CPU, RAM (cho desktop app).

Kiểm tra kết nối Internet.

8. API & Mở Rộng
CORE cung cấp các endpoint REST (cho backend) và hooks (cho frontend) để các module khác sử dụng.

8.1 Backend endpoints (gợi ý)
Method	Endpoint	Mô tả
GET	/api/core/config	Lấy cấu hình hiện tại
PUT	/api/core/config	Cập nhật cấu hình (yêu cầu quyền admin)
POST	/api/core/workspace	Tạo workspace mới
GET	/api/core/workspace/:id	Lấy dữ liệu workspace
POST	/api/core/workspace/:id/result	Lưu kết quả module
GET	/api/core/logs	Lấy log (có phân trang, filter)
POST	/api/core/secrets	Lưu API key
DELETE	/api/core/secrets/:service	Xóa API key
POST	/api/core/notify	Gửi thông báo (cho module gọi)
8.2 Frontend context/hooks
typescript
// Sử dụng trong module
const { config, updateConfig } = useCoreConfig();
const { currentWorkspace, saveResult } = useWorkspace();
const { log, audit } = useLogger('INTEL');
const { getApiKey } = useSecrets();
const { notify } = useNotifier();
9. Hướng Dẫn Phát Triển
9.1 Tích hợp với module khác
Mỗi module mới phải:

Import useWorkspace để lưu kết quả.

Gọi audit cho hành động nhạy cảm.

Dùng getApiKey để lấy key (nếu cần).

9.2 Mở rộng cấu hình
Khi thêm module mới, cập nhật CoreConfig.modules với default config.

Tạo UI riêng trong ConfigPanel (tabs động).

9.3 Storage backend
Electron: sử dụng fs để lưu workspace dạng file JSON.

Web: dùng IndexedDB (via idb library) hoặc LocalStorage (cho dữ liệu nhỏ).

Backend server: dùng database (SQLite/PostgreSQL) cho workspace và logs.

📊 Tổng Kết
Chức năng	Phạm vi
Config	Quản lý mọi cấu hình, API keys, module settings
Workspace	Lưu trữ dữ liệu dự án, cho phép tiếp tục sau
Logging	Log thường + audit log bất khả xâm phạm
Secrets	Lưu API keys an toàn (mã hóa)
Notifications	Gửi cảnh báo qua nhiều kênh
Utilities	Crypto, validators, formatters dùng chung
Phantoma CORE v1.0.0 — "Nền móng vững chắc cho mọi chiến dịch" 🧱
