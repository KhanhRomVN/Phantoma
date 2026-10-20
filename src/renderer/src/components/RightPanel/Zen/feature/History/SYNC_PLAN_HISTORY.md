# SYNC PLAN: History Feature (Zen -> Phantoma)

> **Nguồn (Source of Truth):** `Phantoma/temp/Zen/src/webview-ui/src/features/history`
> **Đích (Target):** `Phantoma/src/renderer/src/components/RightPanel/Agent/feature/History`
> **Quy tắc:** Áp dụng nghiêm ngặt 4 quy tắc trong `SYNC_RULES.md`. Zen là chuẩn tuyệt đối.

---

## TỔNG QUAN KHÁC BIỆT

| Hạng mục | Chi tiết |
|----------|----------|
| **Kiến trúc giao tiếp** | Zen dùng `window.postMessage` / `MessageEvent`. Phantoma dùng `extensionService.postMessage` + IPC handler riêng (`ConversationService`). Cần map tương đương. |
| **Styling** | Zen dùng Inline Styles + CSS Variables (`--vscode-*`, custom vars). Phantoma dùng Tailwind Classes + `$()` helper. Chuyển đổi sang Tailwind khi sync UI. |
| **Components mới** | Zen có `ConfirmClearHistoryDrawer.tsx`. Phantoma chưa có (đang dùng modal inline thô sơ). |
| **Types** | Zen bổ sung `providerId`, `modelId`, `useSkillEnabled`. Phantoma thiếu. |
| **Logic Hook** | Zen gửi lệnh `getHistory` một lần nhận toàn bộ mảng. Phantoma gọi `list()` rồi loop `get()` từng cái (kém hiệu quả hơn, khác luồng). |
| **UI Card** | Zen có Tooltip portal bám chuột, Accent bar selected state, Avatar fallback logic phức tạp hơn. Phantoma đơn giản hơn nhiều. |

---

## PHASE 1: DELETE (Xóa những gì Phantoma có mà Zen không có)

*Không có file nào thuộc nhóm này. Tất cả file/folder hiện tại của Phantoma đều có bản tương ứng hoặc phiên bản nâng cấp ở Zen.*

- [ ] *(Skip)* Không xóa file nào.

---

## PHASE 2: CREATE (Thêm những gì Zen có mà Phantoma thiếu)

### 2.1. Tạo component xác nhận xóa tập trung
- **File nguồn:** `temp/Zen/.../components/ConfirmClearHistoryDrawer.tsx`
- **File đích:** `src/renderer/.../feature/History/components/ConfirmClearHistoryDrawer.tsx`
- **Hành động:**
  - Copy nội dung từ Zen.
  - **Map Tech Stack:** Thay thế Inline Style bằng Tailwind classes của Phantoma.
    - Background/Borders: Dùng `$('--card-background')`, `$('--border')`, `$('--error')`.
    - Layout: Dùng `flex`, `gap`, `rounded-xl`, `shadow-lg`.
    - Animation: Giữ nguyên keyframes nhưng đảm bảo class name không conflict.
  - Import `Trash2` từ `lucide-react`.

### 2.2. Cập nhật Types (Bổ sung field)
- **File nguồn:** `temp/Zen/.../types/index.ts`
- **File đích:** `src/renderer/.../feature/History/types/index.ts`
- **Hành động:** Thêm các interface fields sau vào `ConversationItem`:
  ```typescript
  providerId?: string;
  modelId?: string;

  /** Per-conversation override: bật/tắt SKILL trong system prompt */
  useSkillEnabled?: boolean;
  ```

---

## PHASE 3: UPDATE (Đồng bộ hóa Logic & UI cho các file chung)

### 3.1. Update `index.tsx` (Main Panel)
- **Thay đổi chính:**
  1. **Import:** Thêm `ConfirmClearHistoryDrawer`. Loại bỏ import `Button`, `DrawerHeader` nếu không còn dùng trực tiếp cho confirm dialog (thay bằng drawer).
  2. **State:** Bổ sung `totalCount` từ hook (nếu hook trả về) để hiển thị số lượng trong drawer.
  3. **Render Confirm Dialog:**
     - Xóa block `{/* Confirm modal */}` cũ (inline div overlay).
     - Thay bằng `<ConfirmClearHistoryDrawer open={showConfirm} onOpenChange={setShowConfirm} onConfirm={clearAllHistory} totalCount={totalCount} />`.
  4. **Layout Container:**
     - Zen dùng `div` absolute với inline style làm container gốc.
     - Phantoma đang dùng `<Drawer>` component wrapper.
     - **Quyết định:** GIỮ NGUYÊN `<Drawer>` wrapper của Phantoma vì đây là kiến trúc Electron/Ribbon đặc thù. Chỉ cập nhật nội dung bên trong `DrawerBody`.
  5. **Empty State & Loading:** Đồng bộ text/icon chi tiết từ Zen (ví dụ: "Start a new conversation to see it here" thay vì "Start a new chat to begin").

### 3.2. Update `hooks/useConversationHistory.ts`
- **Vấn đề lớn nhất:** Luồng dữ liệu khác nhau hoàn toàn.
  - *Zen:* Gửi `command: 'getHistory'` -> Nhận `historyResult` (mảng đầy đủ metadata).
  - *Phantoma:* Gọi `ConversationService.list(moduleId)` -> Loop `ConversationService.get(id)`.
- **Chiến lược Sync:**
  - Vì Phantoma chạy trên Electron Main Process context khác Webview, ta KHÔNG thể copy nguyên code postMessage của Zen.
  - Tuy nhiên, **Output Interface** phải giống Zen.
  - **Hành động:**
    1. Giữ nguyên cơ chế gọi `ConversationService` (IPC) của Phantoma.
    2. Nhưng đảm bảo hàm `loadHistory` trả về cấu trúc data khớp với `ConversationItem` đã update ở Phase 2.2 (có `providerId`, `modelId`, v.v.).
    3. Nếu Backend Phantoma chưa cung cấp sẵn `providerId/modelId` trong response `get()`, cần đánh dấu TODO backend hoặc extract tạm từ message content (giống cách Zen card làm lazy-load).
    4. Đồng bộ biến `filteredConversations` và return object cuối cùng (thêm `totalCount`, `refreshHistory` nếu chưa có).

### 3.3. Update `components/HistoryCard.tsx`
- **Thay đổi chính:**
  1. **Imports:** Thêm `createPortal` from `react-dom`, `Clock` from `lucide-react`.
  2. **Constants & Helpers:**
     - Copy khối `FAVICON_DOMAINS`, `CARD_CSS` (chuyển thành Tailwind classes hoặc styled-components tùy project setup, ưu tiên Tailwind utility classes như `.hc-card:hover` -> `hover:bg-[var(--hover-bg)]`).
     - Copy helpers: `getTokenTone`, `formatTokens`, `parseUserContent`, `formatTimeText`, `getFaviconUrlSync`, `getTooltipStyle`.
  3. **State Management:**
     - Thêm states: `tooltip`, `failedFavicon`.
     - Refs: `cardRef`.
  4. **Derived Values:**
     - Implement `userContent` useMemo (scan ngược messages tìm user msg cuối).
     - Implement `totalMsgs` calculation.
     - Implement `messagesModel` extraction (lấy providerId/modelId từ assistant msg).
     - Update `providerId` resolution logic: `item.providerId || item.provider || messagesModel.providerId`.
  5. **Effects:**
     - Add `ensureStyles()` layout effect (hoặc inject global CSS nếu dùng Tailwind config).
     - Update fetch listener: Phantoma dùng `extensionService.onMessage('messageResponse', ...)`. Adapt Zen's `window.addEventListener('message', ...)` logic into Phantoma's service pattern but keep the parsing logic identical.
     - Add scroll listener to hide tooltip.
  6. **Handlers:**
     - `handleOpen`: Trigger load + close tooltip.
     - `handleCopyContent`: Use `parseUserContent` for cleaner output.
     - Mouse events: `onMouseMove` to update tooltip position.
  7. **JSX Structure:**
     - Replace simple div structure with Zen's complex layout:
       - Root `.hc-root` > Card `.hc-card`.
       - Inside Card: Accent bar `<span className='hc-accent'/>`, Avatar `<div className='hc-avatar'>`, Body `<div className='hc-body'>`.
       - Row 1: Title + Side (Time/Actions).
       - Row 2: Meta (Model badge, Stats, Token pill).
     - Add Portal Tooltip rendering at bottom.
     - Add Portal Context Menu rendering (replace old fixed div menu).
  8. **Styling Mapping (Crucial):**
     - Convert all `style={{ ... }}` objects from Zen into Tailwind classes or Phantoma's `$()` color helper usage.
     - Example: `backgroundColor: 'var(--hover-bg)'` -> `bg-[var(--hover-bg)]` or `style={{ backgroundColor: $('--hover-bg') }}` depending on dynamic needs.

---

## PHASE 4: VERIFY & CLEANUP

- [ ] **Type Check:** Chạy `npx tsc --noEmit` hoặc build renderer để đảm bảo không lỗi type sau khi thêm fields mới và sửa imports.
- [ ] **Unused Imports:** Xóa các import thừa trong `index.tsx` (ví dụ: `Button`, `DrawerHeader` nếu đã chuyển hết sang Drawer component riêng).
- [ ] **Runtime Test:**
  - Mở History panel.
  - Hover lên card -> Kiểm tra Tooltip xuất hiện, bám theo chuột, skeleton loading khi fetch messages.
  - Click Right-click -> Context menu hoạt động.
  - Click Trash icon -> `ConfirmClearHistoryDrawer` trượt lên từ dưới.
  - Xác nhận xóa -> Danh sách cập nhật realtime.

---

## GHI CHÚ KỸ THUẬT CHO AGENT

1. **Về Communication Layer:** Đừng cố gắng ép Phantoma dùng `window.postMessage` raw như Zen. Hãy giữ lớp abstraction `extensionService` / `ConversationService` của Phantoma, nhưng sao chép **logic xử lý dữ liệu đầu ra** (data transformation, filtering, sorting) y hệt Zen.
2. **Về Styling:** File Zen sử dụng rất nhiều CSS-in-JS và Variable names lạ (`--tone`, `color-mix`). Khi chuyển sang Phantoma (Tailwind/CSS Modules), hãy ưu tiên sự sạch sẽ. Nếu `color-mix` hỗ trợ kém trên trình duyệt cũ của Electron, hãy tính toán RGBA thủ công hoặc dùng helper function.
3. **Về Performance:** Zen card có lazy-load messages. Đảm bảo Phantoma cũng implement caching mechanism (`ConversationCache`) giống Zen để tránh spam IPC calls khi hover qua lại nhiều cards.