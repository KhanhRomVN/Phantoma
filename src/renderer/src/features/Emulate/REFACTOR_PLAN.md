# Kế Hoạch Tái Cấu Trúc Module Emulate (Giữ Nguyên Cấu Trúc Thư Mục)

## 1. Tổng Quan

Giữ nguyên 8 thư mục gốc: `components`, `utils`, `constants`, `data`, `hooks`, `types`, `services` + file `index.tsx`.

Mục tiêu: **Tổ chức lại nội dung bên trong các thư mục này** để code rõ ràng, dễ bảo trì, tái sử dụng.

---

## 2. Cấu Trúc Sau Tái Cấu Trúc

```
src/renderer/src/features/Emulate/
│
├── index.tsx                          # Container chính (giữ nguyên vị trí)
│
├── components/                        # UI components (không có index.tsx export)
│   │
│   ├── common/                        # Components dùng chung
│   │   ├── ResizableSplit.tsx         # Resizable panel (hiện duplicate)
│   │   ├── ContextMenu.tsx            # Context menu (hiện duplicate)
│   │   ├── CodeViewer.tsx             # CodeBlock wrapper
│   │   ├── StatusBadge.tsx            # HTTP status badge
│   │   ├── MethodBadge.tsx            # HTTP method badge
│   │   ├── SearchInput.tsx            # Search với matchCase/regex
│   │   ├── KeyValueTable.tsx          # Headers/Params table
│   │   ├── Modal.tsx                  # Modal wrapper
│   │   └── Drawer.tsx                 # Drawer từ dưới lên
│   │
│   ├── Target/                        # Quản lý target
│   │   ├── TargetPanel.tsx
│   │   ├── AddTargetModal.tsx
│   │   ├── ConfirmDeleteModal.tsx
│   │   └── ConfirmLaunchModal.tsx
│   │
│   ├── Intruder/                      # Request interceptor
│   │   ├── IntruderPanel.tsx          # Container
│   │   ├── RequestList/
│   │   │   ├── RequestList.tsx
│   │   │   └── RequestTable.tsx
│   │   └── RequestDetails/
│   │       ├── RequestDetailsTabs.tsx
│   │       ├── tabs/
│   │       │   ├── HeadersTab.tsx
│   │       │   ├── BodyTab.tsx
│   │       │   ├── NetworkTab.tsx
│   │       │   ├── CookiesTab.tsx
│   │       │   ├── SecurityTab.tsx
│   │       │   └── ComposerTab.tsx
│   │       └── FilterSidebar.tsx
│   │
│   ├── Wasm/                          # Wasm tool
│   │   ├── WasmPanel.tsx
│   │   └── WasmCard.tsx
│   │
│   ├── Media/                         # Media tool
│   │   ├── MediaPanel.tsx
│   │   ├── MediaGrid.tsx
│   │   ├── MediaCard.tsx
│   │   └── MediaModal.tsx
│   │
│   ├── Payload/                       # Fuzzer tool
│   │   ├── PayloadPanel.tsx
│   │   ├── FuzzerJobCard.tsx
│   │   ├── AddJobDrawer.tsx
│   │   ├── FuzzerRunner.tsx
│   │   └── payloadGenerator.ts
│   │
│   ├── Compare/                       # Compare tool
│   │   ├── ComparePanel.tsx
│   │   ├── DiffView.tsx
│   │   ├── Combobox.tsx
│   │   └── SavedCompareCard.tsx
│   │
│   ├── Composer/                      # Composer tool
│   │   ├── ComposerPanel.tsx
│   │   ├── RequestCard.tsx
│   │   └── DiagramView.tsx
│   │
│   ├── Source/                        # Source tool
│   │   ├── SourcesPanel.tsx
│   │   ├── FileTree.tsx
│   │   └── SourceCodeView.tsx
│   │
│   └── Log/                           # Log tool
│       ├── LogViewer.tsx
│       ├── LogEntry.tsx
│       ├── LogFilterBar.tsx
│       ├── TagFilter.tsx
│       └── logParser.ts
├── hooks/                             # Custom hooks
│   ├── useEmulatorSession.ts          # Quản lý session emulator
│   ├── useTargetManager.ts            # Quản lý target (tabs, persistence)
│   ├── useRequestInterceptor.ts       # Xử lý request interception
│   ├── useFilter.ts                   # Quản lý filter state
│   ├── useWebSocket.ts                # WebSocket connections
│   ├── useLocalStorage.ts             # Local storage wrapper
│   └── useDebouncedSearch.ts          # Debounce search term
│
├── services/                          # Business logic & API calls
│   ├── targetService.ts               # apps:get-all, apps:add, apps:update, apps:delete
│   ├── requestService.ts              # inspector:send-request
│   ├── logcatService.ts               # mobile:start-logcat, mobile:stop-logcat
│   ├── mediaService.ts                # media:get-cache-manifest
│   ├── collectionService.ts           # collection:save-response
│   ├── androidService.ts              # mobile:list-devices, mobile:enable-wireless-adb
│   └── pcAppService.ts                # apps:scan-pc
│
├── utils/                             # Pure helper functions
│   ├── requestHelpers.ts
│   │   ├── applyPayload()
│   │   ├── parseHeaders()
│   │   ├── generatePayloads()
│   │   ├── countPayloads()
│   │   └── getRequestCategory()
│   │
│   ├── urlHelpers.ts
│   │   ├── normalizeUrl()
│   │   ├── extractDomain()
│   │   └── parseQueryParams()
│   │
│   ├── stringHelpers.ts
│   │   ├── formatBytes()
│   │   ├── truncate()
│   │   └── highlightText()
│   │
│   ├── storageHelpers.ts              # localStorage wrapper với type safety
│   ├── logParser.ts                   # parseLogLine()
│   ├── detectionHelpers.ts            # detectWasmModules, getMediaType
│   └── colorHelpers.ts                # getTagColor, getLevelColor, getMethodColor
│
├── constants/                         # Hằng số
│   ├── httpMethods.ts                 # GET, POST, PUT, DELETE, PATCH,...
│   ├── httpStatusCodes.ts             # 200, 201, 301, 302, 400, 401, 403,...
│   ├── platformColors.ts              # Màu cho web/pc/android/cli
│   ├── levelColors.ts                 # Màu cho log levels (V/D/I/W/E/F)
│   ├── storageKeys.ts                 # localStorage keys
│   └── defaultValues.ts               # EMPTY_JOB, initialFilterState
│
├── types/                             # Type definitions
│   ├── emulator.types.ts              # LogEntry, FuzzerJob, FuzzerResult,...
│   ├── target.types.ts                # TargetTab, UserApp, DiscoveredApp,...
│   ├── filter.types.ts                # InspectorFilter
│   ├── security.types.ts              # SecurityIssue, SecuritySeverity (FIX)
│   ├── analysis.ts                    # (giữ nguyên)
│   └── inspector.ts                   # NetworkRequest, WebSocketConnection (giữ nguyên)
│
└── data/                              # Dữ liệu tĩnh / mock
    ├── mockRequests.ts                # Mock data cho development
    └── mockWsConnections.ts
```

---

## 3. Kế Hoạch Di Chuyển Chi Tiết

### Phase 1: Extract Common Components (Tuần 1)
Tạo thư mục `components/common/` và di chuyển code trùng lặp:

| File hiện tại | Vị trí mới |
|---------------|------------|
| `components/Intruder/RequestDetails/index.tsx` (ResizableSplit) | `components/common/ResizableSplit.tsx` |
| `components/Source/index.tsx` (ResizableSplit) | Xóa, import từ common |
| `components/Intruder/RequestList/RequestTable.tsx` (ContextMenu) | `components/common/ContextMenu.tsx` |
| `components/Intruder/RequestDetails/Security/index.tsx` (ContextMenu) | Xóa, import từ common |

### Phase 2: Create Hooks (Tuần 1)
Tạo file mới trong `hooks/` và di chuyển logic:

| Logic hiện tại | Hook mới |
|----------------|----------|
| `components/Target/index.tsx` (fetchApps, handleAddApp, etc.) | `hooks/useTargetManager.ts` |
| `index.tsx` (targetTabs state, persistence) | `hooks/useTargetTabs.ts` |
| `components/Log/index.tsx` (logcat start/stop, buffering) | `hooks/useLogcat.ts` |
| `components/Payload/index.tsx` (jobs localStorage) | `hooks/useFuzzerJobs.ts` |
| `components/Compare/index.tsx` (savedCompares) | `hooks/useSavedCompares.ts` |

### Phase 3: Create Services (Tuần 2)
Tạo file mới trong `services/`:

| API pattern | Service file |
|-------------|--------------|
| `window.api.invoke('apps:*')` | `services/targetService.ts` |
| `window.api.invoke('mobile:*')` | `services/androidService.ts` |
| `window.api.invoke('inspector:send-request')` | `services/requestService.ts` |
| `window.api.invoke('collection:save-response')` | `services/collectionService.ts` |

### Phase 4: Extract Utils (Tuần 2)
Di chuyển các hàm thuần túy vào `utils/`:

| Hàm | Vị trí cũ | Vị trí mới |
|-----|-----------|------------|
| `generatePayloads`, `countPayloads` | `components/Payload/index.tsx` | `utils/requestHelpers.ts` |
| `parseLogLine` | `components/Log/index.tsx` | `utils/logParser.ts` |
| `detectWasmModules` | `components/Wasm/index.tsx` | `utils/detectionHelpers.ts` |
| `getRequestCategory`, `parseSize`, `parseTime` | `components/Intruder/RequestDetails/Filter/index.tsx` | `utils/requestHelpers.ts` |
| `normalizeUrl`, `extractSearchKeywords` | `components/Target/AddTargetModal.tsx` | `utils/urlHelpers.ts` |
| `getTagColor`, `getLevelColor` | `components/Log/index.tsx` | `utils/colorHelpers.ts` |

### Phase 5: Fix Missing Types (Tuần 3)
Sửa lỗi TypeScript hiện tại:

```typescript
// types/security.types.ts
export type SecuritySeverity = 'high' | 'medium' | 'low' | 'info';

export interface SecurityIssue {
  id: string;
  title: string;
  description: string;
  severity: SecuritySeverity;
  evidence?: string;
  recommendation?: string;
}
```

Update `components/Intruder/RequestDetails/Security/index.tsx` để import từ đây.

### Phase 6: Update Imports & Cleanup (Tuần 3)
- Cập nhật tất cả import paths
- Xóa file cũ sau khi đã migrate
- Chạy `npm run tsc` kiểm tra không lỗi
- Chạy dev server kiểm tra UI

---

## 4. Quy Tắc Import Mới

Sau khi tái cấu trúc, imports sẽ theo dạng:

```tsx
// Container components
import { useTargetManager } from '../../hooks/useTargetManager';
import { targetService } from '../../services/targetService';
import { normalizeUrl } from '../../utils/urlHelpers';
import { HTTP_METHODS } from '../../constants/httpMethods';
import { ResizableSplit } from '../../components/common/ResizableSplit';
```

Alias path có thể thêm vào `tsconfig.json` để ngắn gọn hơn:

```json
{
  "compilerOptions": {
    "paths": {
      "@emulate/*": ["./src/renderer/src/features/Emulate/*"],
      "@emulate/components/*": ["./src/renderer/src/features/Emulate/components/*"],
      "@emulate/hooks/*": ["./src/renderer/src/features/Emulate/hooks/*"],
      "@emulate/utils/*": ["./src/renderer/src/features/Emulate/utils/*"],
      "@emulate/types/*": ["./src/renderer/src/features/Emulate/types/*"]
    }
  }
}
```

---

## 5. Lợi Ích So Với Hiện Tại

| Vấn đề hiện tại | Giải pháp |
|----------------|-----------|
| ResizableSplit duplicate trong 2 file | 1 file common |
| ContextMenu duplicate trong 2 file | 1 file common |
| Logic fetch apps nằm trong component | `targetService` + `useTargetManager` |
| Hàm parseLogLine trong component | `logParser.ts` trong utils |
| Thiếu type SecuritySeverity | Thêm `security.types.ts` |
| LocalStorage logic lặp ở nhiều nơi | `useLocalStorage` hook |
| Constants rải rác (màu sắc, methods) | Tập trung trong `constants/` |

---

## 6. Checklist Hoàn Thành

- [ ] Tạo `components/common/ResizableSplit.tsx`
- [ ] Tạo `components/common/ContextMenu.tsx`
- [ ] Tạo `components/common/SearchInput.tsx`
- [ ] Tạo `components/common/StatusBadge.tsx`
- [ ] Tạo `hooks/useTargetManager.ts`
- [ ] Tạo `hooks/useLogcat.ts`
- [ ] Tạo `hooks/useFuzzerJobs.ts`
- [ ] Tạo `hooks/useLocalStorage.ts`
- [ ] Tạo `services/targetService.ts`
- [ ] Tạo `services/androidService.ts`
- [ ] Tạo `utils/requestHelpers.ts`
- [ ] Tạo `utils/logParser.ts`
- [ ] Tạo `utils/detectionHelpers.ts`
- [ ] Tạo `utils/colorHelpers.ts`
- [ ] Tạo `utils/urlHelpers.ts`
- [ ] Tạo `constants/httpMethods.ts`
- [ ] Tạo `constants/httpStatusCodes.ts`
- [ ] Tạo `constants/platformColors.ts`
- [ ] Tạo `types/security.types.ts`
- [ ] Cập nhật imports trong tất cả file
- [ ] Xóa code cũ đã di chuyển
- [ ] Chạy TypeScript kiểm tra lỗi
- [ ] Test UI trong dev server

---

*Tài liệu được tạo vào ngày 15/06/2026 - Giữ nguyên cấu trúc thư mục gốc*