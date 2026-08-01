# Code Comment Convention — Phantoma

Quy ước viết comment đầu file và phân nhóm import, áp dụng cho toàn bộ dự án TypeScript.

---

## 1. Comment đầu file (File Header)

Mỗi file `.ts` / `.tsx` mới phải có block comment mô tả ngay đầu file, trước tất cả import.

### Cấu trúc

```
/**
 * TênClass/TênModule — mô tả ngắn 1 dòng về trách nhiệm chính.
 *
 *    methodName1() : Mô tả ngắn method/public API chính.
 *    methodName2() : Mô tả ngắn method/public API chính.
 */
```

### Quy tắc

- **Dòng 1**: Tên class/module chính + `—` + mô tả 1 dòng.
- **Dòng 3+**: Mỗi method/public API quan trọng được liệt kê với indent 4 spaces, format `methodName() : Mô tả`.
- Chỉ liệt kê method **public** hoặc method **quan trọng** (3-8 method chính).
- Không liệt kê method private, getter/setter tầm thường, constructor.
- Kết thúc block bằng `*/` trên dòng riêng.
- Sau block comment là 1 dòng trống, rồi đến import đầu tiên.

### Ví dụ

```ts
/**
 * ChatController - trung tâm nhận message từ webview, điều phối đến các handler tương ứng.
 *
 *    handleMessage() : Routing chính, phân phối message theo command.
 *    updateTheme()   : Gửi theme hiện tại cho webview.
 */

import * as vscode from 'vscode';
```

### Trường hợp đặc biệt

- **File chỉ export 1 function**: Mô tả function đó.
- **File type definition (`.d.ts`, `types.ts`)**: Có thể bỏ qua nếu chỉ chứa interface/type đơn giản.
- **File test (`*.spec.ts`, `*.test.ts`)**: Format `TênClass — mô tả ngắn về phạm vi test.`
- **File config/constants**: Mô tả mục đích của config.

---

## 2. Phân nhóm import (Import Grouping)

Tất cả import phải được nhóm theo **category**, mỗi nhóm cách nhau bởi 1 dòng trống và có comment `// CATEGORY_NAME` ở trên cùng.

### Thứ tự nhóm (từ trên xuống)

| Thứ tự | Category | Mô tả | Ví dụ |
|--------|----------|-------|-------|
| 1 | Third-party / Framework | Thư viện ngoài, framework | `import * as vscode from 'vscode';`<br>`import React from 'react';` |
| 2 | `// CONTROLLERS` | Controller classes điều phối logic | `import { ChatController } from '../controllers/ChatController';` |
| 3 | `// HANDLERS` | Handler xử lý từng command/action cụ thể | `import { FileOpenHandler } from '../handlers/system/FileOpenHandler';` |
| 4 | `// MANAGERS` | Manager quản lý tài nguyên (terminal, file lock, state...) | `import { TerminalManager } from '../managers/TerminalManager';` |
| 5 | `// SERVICES` | Service layer (API client, storage, auth...) | `import { IndexedDBStorage } from '../services/IndexedDBStorage';` |
| 6 | `// STORAGE` | Storage / persistence | `import { GlobalStorageManager } from '../storage/GlobalStorageManager';` |
| 7 | `// STORES` | Zustand / state management stores | `import { useNetworkStore } from '../stores/networkStore';` |
| 8 | `// HOOKS` | React hooks | `import { useModulePersistence } from '../hooks/useModulePersistence';` |
| 9 | `// COMPONENTS` | React components | `import { RequestTable } from './components/Home';` |
| 10 | `// TYPES` | Type/interface imports | `import { NetworkRequest } from './types/inspector';` |
| 11 | `// UTILS` | Utility functions, helpers | `import { cn } from '../shared/lib/utils';` |
| 12 | `// CONSTANTS` | Constants, config values | `import { TOOLS, DEFAULT_TOOL } from './constants/tools';` |

### Quy tắc

- **Chỉ dùng category TỒN TẠI** — nếu file không có import thuộc category nào thì bỏ qua category đó.
- Nếu category có 0 import nhưng dự kiến sẽ có trong tương lai, để comment + dòng trống (xem ví dụ TYPES bên dưới).
- Trong cùng 1 nhóm: sắp xếp **alphabetically** theo path.
- Import từ cùng 1 folder gần nhau, không cần cách dòng.
- Không dùng `//` comment inline sau từng dòng import.

### Ví dụ

```ts
/**
 * ChatViewProvider — cung cấp webview chat chính, khởi tạo ChatController và lắng nghe message.
 *
 *    resolveWebviewView() : Thiết lập webview, tạo ChatController, đăng ký listener.
 *    getTerminalManager() : Trả về TerminalManager instance.
 */

import * as vscode from 'vscode';

// CONTROLLERS
import { ChatController } from '../controllers/ChatController';

// HANDLERS
import { FileOpenHandler } from '../handlers/system/FileOpenHandler';
import { GitCommitHandler } from '../handlers/tool/GitCommitHandler';
import { GrepHandler } from '../handlers/tool/GrepHandler';

// MANAGERS
import { CheckpointManager } from '../managers/CheckpointManager';
import { FileLockManager } from '../managers/FileLockManager';
import { TerminalManager } from '../managers/TerminalManager';

// STORAGE
import { GlobalStorageManager } from '../storage/GlobalStorageManager';

// TYPES
// (none currently needed)
```

---

## 3. Các quy tắc chung khác

- **Không comment vô nghĩa**: Không viết `// Khai báo biến x`, `// Gán giá trị`.
- **Comment giải thích "tại sao"**: Chỉ comment khi code không tự giải thích được lý do.
- **TODO/FIXME/HACK**: Dùng tag rõ ràng:
  ```ts
  // TODO(khanhromvn): Thêm retry khi API fail — sẽ làm sau khi có error handling chung.
  // HACK: Tạm dùng any vì type từ thư viện chưa export — upgrade sau.
  // FIXME: Có race condition khi 2 target cùng start — cần mutex.
  ```
- **`// <ceiling> — upgrade path:`**: Đánh dấu giới hạn đã biết và cách nâng cấp khi cần (theo DELIBERATE-SIMPLIFICATION).
- **Comment tiếng Việt**: Tất cả comment mô tả viết bằng tiếng Việt. Code, identifier, error message giữ nguyên ngôn ngữ gốc.

---

## Tham khảo

- `temp/Zen/controllers/ChatController.ts` — mẫu comment đầu file + phân nhóm import đầy đủ.
- `temp/Zen/providers/ChatViewProvider.ts` — mẫu phân nhóm import ngắn gọn.