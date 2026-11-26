# Báo cáo refactor Profile module

## Kết quả
- Cấu trúc mới: `app/` (compose trang), `features/{profiles,services,security,sources,browser,activity,queries}`, `shared/{api,types,components,constants,utils}`.
- `app/ProfilePage.tsx`: 764 → 329 dòng, chỉ compose 6 hook (`useProfilePageData/Filters/Dialogs/Actions`, `useProfileViewPersistence`, `useRunningBrowsers`) + hook feature (`useProfileSelection`, `useProfileMutations`, `useSourceMutations`).
- `profile-api.service.ts` (422 dòng) tách thành `shared/api/client.ts` + 9 module endpoint + facade `profile.api.ts` (giữ nguyên shape `profileApi`, gồm `system.passwordReuse`).
- Type DTO trong API service chuyển về `shared/types/*.types.ts` (thêm `query.types.ts`).
- `constants/status.ts` và `StatusBadge.tsx` tách theo domain; `Pill/TagChip/SyncBadge` ở shared.
- Tách file lớn: ProfileTable, BackupCode, TOTP, SourceTransferModal, ConfirmTransferModal, ImportProfilesModal, SourceModal, LinkServiceForm, CreateProfileModal, ServiceDetail, TemplateForm, ProfileToolPanel, OverviewTab, ProfileDrawer (chỉ di chuyển nguyên văn declaration, không đổi logic).

## Kiểm chứng
- `tsc --noEmit` (strict) với stub cho dependency ngoài module: tập lỗi **giống hệt baseline** trước refactor (36 lỗi do stub `any`/`window.api`, không phải lỗi mã nguồn).
- Không import vòng giữa các feature; `shared` không import feature; feature chỉ import feature khác qua `index.ts`.
- Không thể chạy app/test thật và không grep được repo ngoài module → xem mục "Cần bạn xác nhận".

## Lệch so với plan (có lý do)
1. `profile-view.store.ts` đặt ở `features/profiles/stores/` (không phải `app/stores/`) vì ProfileDrawer/ProfileToolPanel dùng nó; để feature không import `app`.
2. `SyncBadge` + `SYNC_STATUS` đặt ở `shared/` (profiles, sources, import đều dùng).
3. `useEscapeKey` ở `features/browser/hooks/` (chỉ LaunchBrowserModal dùng) – theo task 5.7.
4. `splitBackup/normalizeBase32/isBase32` chuyển sang `security/utils/secret.util.ts` để tránh vòng services↔security.
5. `query.util.ts` giữ một file (tokenizer/parser/evaluator gắn chặt, không tách để tránh rủi ro).
6. Không tạo `security.types.ts` (không có type security dùng liên feature).
7. `ImportModal` → `ImportProfilesModal`, `StatSection` → `ProfileStats` (chỉ dùng nội bộ).

## Chưa làm / cần bạn xác nhận
- **Shim tương thích còn giữ** (chưa thể grep toàn repo): `Profile.tsx`, `index.tsx`, `services/profile-api.service.ts`, `services/profile-base-url.ts`, `types/index.ts`, `stores/useProfileViewStore.ts`, `stores/useServiceStore.ts`, `hooks/useRunningBrowsers.ts`. Nếu repo ngoài không import các path cũ này thì xóa (Phase 6).
- Thân component lớn (ProfileTable 620, SourceTransferModal 561, ServiceDetail 517, LinkServiceForm 501 dòng…) **chưa** tách thành hook/row component vì state gắn chặt; cần đọc/test hành vi kỹ hơn. Chưa tạo `useSourceTransfer`.
- Component trùng lặp chưa gộp (Section, CopyText/CopyButton, FolderCell, BADGE…): cần xác minh giống hệt.
- Mã có vẻ không dùng (giữ nguyên): `saveQuery/deleteQuery/editingQuery/setPreviewQuery` trong `useProfilePageFilters` (không nơi nào gọi/đọc), `utils/prefix` (không importer trong module), field `parent` của `childApi`, API `footprints/activity/scripts/devices` (không gọi trong module).
- Chưa chạy lint/build/test thật của dự án (không có trong zip).
