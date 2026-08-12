# 🏗️ Thiết kế kiến trúc module Emulate — Tối ưu Clean Code

> **Trạng thái**: Đề xuất — chưa triển khai
> **Ngày**: 2026-08-12
> **Phạm vi**: `src/renderer/src/modules/Emulate/`

---

## 📁 Cấu trúc thư mục đề xuất

```
Emulate/
├── Emulate.tsx                          # Entry point (đã tối giản ~250 dòng)
│
├── components/                          # UI Components — thuần render, không business logic
│   ├── TargetListPanel/
│   │   ├── TargetListPanel.tsx          # Container chính (đổi tên từ index.tsx)
│   │   ├── TargetList.tsx               # Danh sách target (giữ nguyên)
│   │   ├── TargetItem.tsx               # TÁCH từ TargetList.tsx (hiện đang là memo bên trong)
│   │   ├── RunningOptionTargetModal.tsx # Modal chọn chế độ chạy (giữ nguyên)
│   │   └── AddTargetModal/
│   │       ├── AddTargetModal.tsx       # Container modal (đổi tên từ index.tsx)
│   │       ├── WebsiteForm.tsx          # (đổi tên từ Website.tsx)
│   │       ├── AndroidForm.tsx          # (đổi tên từ Android.tsx)
│   │       ├── PCForm.tsx               # (đổi tên từ PC.tsx)
│   │       └── CLIForm.tsx              # (đổi tên từ CLI.tsx)
│   │
│   └── WorkspacePanel/
│       ├── WorkspacePanel.tsx           # Container chính (đổi tên từ index.tsx)
│       ├── ToolTabBar.tsx               # TÁCH từ WorkspacePanel — thanh tab công cụ
│       │
│       ├── Home/
│       │   ├── HomePanel.tsx            # Container Home (đổi tên từ index.tsx)
│       │   ├── RequestTable.tsx         # Bảng request (đã tối giản)
│       │   ├── RequestTableColumns.tsx  # TÁCH — column definitions (hiện trong RequestTable)
│       │   ├── RequestDetails.tsx       # TÁCH — từ Home/index.tsx (phần tab details)
│       │   ├── FilterPanel.tsx          # (đổi tên từ Filter.tsx)
│       │   ├── HeadersDetails.tsx       # (giữ nguyên)
│       │   ├── BodyDetails.tsx          # (giữ nguyên)
│       │   ├── CookieDetails.tsx        # (giữ nguyên)
│       │   └── InitiatorDetails.tsx     # (giữ nguyên)
│       │
│       ├── Repeater/
│       │   ├── RepeaterPanel.tsx        # Container (đổi tên từ index.tsx)
│       │   ├── RepeaterStorage.ts       # TÁCH — localStorage helpers (hiện trong index.tsx)
│       │   ├── RequestList.tsx          # (giữ nguyên)
│       │   └── WorkspacePanel/
│       │       ├── RequestPanel/
│       │       │   ├── RequestPanel.tsx # (đổi tên từ index.tsx)
│       │       │   ├── RequestBar.tsx   # (giữ nguyên)
│       │       │   ├── TabContent/
│       │       │   │   ├── BodyTab.tsx
│       │       │   │   ├── HeaderTab.tsx
│       │       │   │   ├── HistoryTab.tsx
│       │       │   │   ├── ParamTab.tsx
│       │       │   │   ├── PayloadTab.tsx
│       │       │   │   └── ResultTab.tsx
│       │       │   └── modal/
│       │       │       ├── PayloadValueModal.tsx
│       │       │       └── RunModal.tsx
│       │       └── ResponsePanel/
│       │           ├── ResponsePanel.tsx # (đổi tên từ index.tsx)
│       │           └── modal/
│       │               └── PayloadResultModal.tsx
│       │
│       ├── Resources/
│       │   ├── ResourcesPanel.tsx       # (đổi tên từ index.tsx)
│       │   ├── ResourceList.tsx         # (giữ nguyên)
│       │   └── ResourcePreview.tsx      # (giữ nguyên)
│       │
│       ├── Source/
│       │   ├── SourcePanel.tsx          # (đổi tên từ index.tsx)
│       │   └── SourceTreeView.tsx       # (giữ nguyên)
│       │
│       ├── Device/
│       │   └── DevicePanel.tsx          # (đổi tên từ index.tsx)
│       │
│       ├── Log/
│       │   └── LogViewer.tsx            # (đổi tên từ index.tsx)
│       │
│       └── Intruder/
│           └── IntruderPanel.tsx        # (đổi tên từ index.tsx)
│
├── hooks/                               # Custom React hooks — business logic, không UI
│   ├── useEmulateState.ts               # MỚI — tách state management từ Emulate.tsx
│   ├── useEmulateActions.ts             # MỚI — tách tất cả handlers từ Emulate.tsx
│   │
│   ├── common/
│   │   └── useTimer.ts                  # (giữ nguyên)
│   │
│   ├── network/
│   │   ├── useNetworkEvents.ts          # (đã tối giản — tách IPC listeners)
│   │   ├── useIpcListeners.ts           # MỚI — tách IPC setup từ useNetworkEvents
│   │   ├── usePaginatedRequests.ts      # (giữ nguyên)
│   │   └── useRequestFilter.ts          # (giữ nguyên)
│   │
│   ├── repeater/
│   │   ├── usePayloadStorage.ts         # (giữ nguyên)
│   │   ├── useRepeaterHistory.ts        # (giữ nguyên)
│   │   └── useRepeaterPersistence.ts    # (giữ nguyên)
│   │
│   └── target/
│       └── useTargetManagement.ts       # (giữ nguyên)
│
├── services/                            # Service layer — API calls, storage, external systems
│   ├── emulate-api.service.ts           # (giữ nguyên — đã clean)
│   ├── logcat.service.ts                # (giữ nguyên)
│   └── request-storage.service.ts       # (giữ nguyên)
│
├── handlers/                            # AI Agent handlers — xử lý command từ LLM
│   ├── ApplyFilterHandler.ts            # (giữ nguyên)
│   ├── GetFilterHandler.ts              # (giữ nguyên)
│   ├── GetHttpsDetailHandler.ts         # (giữ nguyên)
│   ├── GetSourceDetailHandler.ts        # (giữ nguyên)
│   ├── GetTrafficSummaryHandler.ts      # (giữ nguyên)
│   ├── ListHostsHandler.ts              # (giữ nguyên)
│   ├── ListHttpHandler.ts               # (giữ nguyên)
│   └── ListSourcesHandler.ts            # (giữ nguyên)
│
├── types/                               # TypeScript type definitions — SINGLE SOURCE OF TRUTH
│   ├── index.ts                         # MỚI — barrel export tất cả types
│   ├── network.types.ts                 # (đổi tên từ inspector.ts — rõ nghĩa hơn)
│   ├── filter.types.ts                  # (giữ nguyên — ĐÃ LÀ single source)
│   ├── target.types.ts                  # (giữ nguyên, bỏ import thừa AppPlatform)
│   ├── repeater.types.ts                # (giữ nguyên)
│   ├── resource.types.ts                # (giữ nguyên)
│   ├── log.types.ts                     # (giữ nguyên)
│   ├── security.types.ts                # (giữ nguyên)
│   ├── apps.ts                          # (giữ nguyên)
│   └── common.types.ts                  # (giữ nguyên)
│
├── constants/                           # Constants & config — data tĩnh, không logic
│   ├── index.ts                         # (sửa — sửa statusCodes → status)
│   ├── methods.ts                       # (giữ nguyên)
│   ├── platforms.ts                     # (giữ nguyên)
│   ├── resource.ts                      # (giữ nguyên)
│   ├── status.ts                        # (giữ nguyên — hoặc đổi tên thành statusCodes.ts)
│   ├── storageKeys.ts                   # (giữ nguyên)
│   ├── tools.ts                         # (giữ nguyên)
│   └── defaults.ts                      # (sửa — xóa DefaultFilterState trùng lặp)
│
├── utils/                               # Pure utility functions — không side effect, không React
│   ├── index.ts                         # MỚI — barrel export
│   ├── prettify.ts                      # (giữ nguyên, xóa dead code)
│   ├── repeaterUtils.ts                 # (giữ nguyên)
│   ├── requestHelpers.ts                # (giữ nguyên)
│   ├── sourceTree.ts                    # (giữ nguyên)
│   └── networkParsers.ts                # MỚI — tách parse logic từ useNetworkEvents
│
├── dto/
│   └── emulate.dto.ts                   # (giữ nguyên)
│
└── ARCHITECTURE.md                      # File này
```

---

## 🎯 Nguyên tắc thiết kế

| Nguyên tắc | Áp dụng |
|------------|---------|
| **Single Source of Truth** | `InspectorFilter` chỉ định nghĩa ở `types/filter.types.ts`. `initialFilterState` chỉ ở `constants/defaults.ts`. Không định nghĩa lại trong component. |
| **Separation of Concerns** | Component = UI render. Hook = business logic + state. Service = API/storage. Utils = pure functions. Handler = LLM command. |
| **No index.tsx for logic** | Mọi file `index.tsx` chỉ đơn thuần re-export. File có logic phải có tên cụ thể (vd: `TargetListPanel.tsx` thay vì `index.tsx`). |
| **Barrel exports** | Mỗi thư mục có `index.ts` export tất cả public API. Import luôn từ barrel, không import sâu. |
| **File < 300 dòng** | Mọi file > 300 dòng phải được xem xét tách. |
| **No dead code** | Không import thừa, không biến không dùng, không param unused. |

---

## 🔴 Danh sách Bug cần sửa

### B1. `constants/index.ts` — Export sai tên file
```diff
- export * from './statusCodes';
+ export * from './status';
```

### B2. `AddTargetModal/index.tsx` — Import path sai (thừa 1 cấp `../`)
```diff
- import type { AppPlatform, AppMode } from '../../../../../../types/apps';
+ import type { AppPlatform, AppMode } from '../../../../../types/apps';
```

### B3. 11 lỗi TypeScript — `ApiService` thiếu method
Các file `Emulate.tsx` (5 lỗi) và `TargetList.tsx` (6 lỗi) gọi method không tồn tại:
- `disconnectCdp()`, `terminateApp()`, `destroyProxySession()`
- `launchApp()`, `getCdpLaunchPort()`, `connectCdp()`, `reloadCdp()`, `createProxySession()`
→ Cần kiểm tra `ApiService` và thêm các method này HOẶC sửa lại cách gọi.

---

## 🟡 Danh sách Refactor (theo độ ưu tiên)

### R1. Xóa trùng lặp `InspectorFilter`
- **Giữ**: `types/filter.types.ts` — định nghĩa type `InspectorFilter`
- **Giữ**: `constants/defaults.ts` — định nghĩa `DEFAULT_FILTER_STATE` (đổi tên từ `DefaultFilterState`)
- **Xóa**: Định nghĩa `InspectorFilter` và `initialFilterState` trong `components/WorkspacePanel/Home/Filter.tsx`
- **Sửa**: Tất cả import trỏ về đúng nguồn

### R2. Tách `Emulate.tsx` (~450 dòng → ~250 dòng)
Tách thành 2 hooks mới:
- **`hooks/useEmulateState.ts`**: Quản lý toàn bộ state (selectedTool, targetTabs, activeTargetId, modal states...)
- **`hooks/useEmulateActions.ts`**: Tất cả handlers (handleAddApp, removeTargetTab, startTarget, stopTarget...)

`Emulate.tsx` sau khi tách chỉ còn:
```
function Emulate() {
  const state = useEmulateState()
  const actions = useEmulateActions(state)
  return <div>...</div>  // JSX layout
}
```

### R3. Tách `useNetworkEvents.ts` (~400 dòng → ~200 dòng)
- **`hooks/network/useIpcListeners.ts`** (MỚI): Tách toàn bộ `useEffect` setup IPC listeners
- **`utils/networkParsers.ts`** (MỚI): Tách `buildRequest()`, `handleProxyRequest()`, `handleProxyResponse()`, `handleProxyResponseBody()` — đây là pure functions

### R4. Tách `RequestTable.tsx` (~650 dòng → ~350 dòng)
- **`components/WorkspacePanel/Home/RequestTableColumns.tsx`** (MỚI): Column definitions
- **`hooks/network/useRequestClipboard.ts`** (MỚI): `formatRequestToMarkdown()`, `formatRequestToJson()`, `handleCopySelectedWithOptions()`, state `copySections`, `copyFormat`

### R5. Tách `Home/index.tsx` (~340 dòng → ~200 dòng)
- **`components/WorkspacePanel/Home/RequestDetails.tsx`** (MỚI): Tách phần render tab content (headers, body, cookies, initiator, security)
- Giữ `HomePanel.tsx` chỉ làm container + tab bar

### R6. Tách `Repeater/index.tsx`
- **`components/WorkspacePanel/Repeater/RepeaterStorage.ts`** (MỚI): `loadRepeaterIds()`, `saveRepeaterIds()`, `addToRepeater()`, `isInRepeater()`, `getRepeaterIds()`, `removeFromRepeater()`, `clearRepeater()`

---

## 🟢 Danh sách Cleanup nhỏ

| # | File | Hành động |
|---|------|-----------|
| C1 | `types/target.types.ts:2` | Xóa `import { AppPlatform }` không dùng |
| C2 | `hooks/network/useNetworkEvents.ts:83` | Xóa param `initialRequests` không dùng |
| C3 | `utils/prettify.ts:20` | Xóa `const startTime` không dùng |
| C4 | `utils/prettify.ts:165` | Xóa `const prettierOptions` không dùng |
| C5 | `Repeater/index.tsx:97` | Xóa param `onClose` không dùng |
| C6 | `constants/status.ts` | Cân nhắc đổi tên thành `statusCodes.ts` để khớp barrel export |

---

## 📊 Tổng kết khối lượng

| Loại | Số lượng |
|------|----------|
| File MỚI cần tạo | **12 files** (6 hooks, 3 utils, 1 component, 1 type barrel, 1 storage helper) |
| File cần SỬA | **9 files** (sửa bug + xóa dead code + cập nhật import) |
| File cần ĐỔI TÊN | **14 files** (index.tsx → tên cụ thể) |
| File GIỮ NGUYÊN | **32 files** |
| **Tổng files bị ảnh hưởng** | **~35 files** |

---

## 🚀 Lộ trình triển khai đề xuất

1. **Phase 1 — Sửa bug** (3 files, 30 phút): B1, B2, C1-C5
2. **Phase 2 — Xóa trùng lặp** (5 files, 1 giờ): R1
3. **Phase 3 — Tách file lớn** (12 files mới + sửa 6 files, 3-4 giờ): R2-R6
4. **Phase 4 — Đổi tên file** (14 files, 1 giờ): Đổi `index.tsx` → tên cụ thể + cập nhật import
5. **Phase 5 — Kiểm tra + test** (1 giờ): Build, type-check, test thủ công