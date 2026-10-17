# Template Prompt: Đồng bộ Component từ Zen (Gốc) sang Phantoma (Target)

Dưới đây là mẫu prompt chuẩn để yêu cầu AI thực hiện việc phân tích và đồng bộ hóa một component bất kỳ giữa hai phiên bản dự án.

## Bối cảnh thực tế — KHÁC với giả định ban đầu

> ⚠ **Đồng bộ là 2 CHIỀU, không phải 1 chiều.** Zen không phải là "Source of Truth" duy nhất.

Phân tích cấu trúc `feature/Chat` của 2 bên cho thấy:

| Mảng | Source of Truth | Ghi chú |
|---|---|---|
| Code tools (read_file, write_to_file, ...) | **Zen** | Ổn định, đầy đủ |
| Emulate tools (list_https, repeater, report...) | **Phantoma** | Zen gốc CHƯA có |
| Recon tools (browser automation) | **Phantoma** | Zen gốc CHƯA có |
| Memory / Skill / ConversationTitle | **Zen** (đã port sang Phantoma) | Phantoma đã có sau session port |
| Question parsing | **Cả 2** | Phantoma đã tách thành QuestionParser riêng |
| JSON tool format | **Zen** | Phantoma chỉ hỗ trợ XML |
| PromptLengthMode (short/medium/long/none) | **Zen** | Phantoma chỉ có full prompt |
| Prompt caching section ordering | **Zen** | Phantoma chưa optimize |
| Kiến trúc parser | **Phantoma** (gộp theo mode) | vs Zen tách từng tool |
| Kiến trúc executor | **Phantoma** (function-style) | vs Zen class-style |
| Constants registry | **Phantoma** (tách theo mode) | vs Zen 1 file gộp |

**Nguyên tắc khi đồng bộ:**
- Với code tools: Zen là gốc, port logic sang Phantoma theo phong cách Phantoma.
- Với emulate/recon: Phantoma là gốc, KHÔNG port ngược về Zen trừ khi được yêu cầu.
- Với memory/skill/title: Zen là gốc, Phantoma đã port xong.
- **Không copy-paste kiến trúc** — mỗi bên giữ nguyên pattern riêng (Phantoma gộp theo mode, Zen tách theo tool).

## Cách sử dụng
1. Copy toàn bộ nội dung bên dưới.
2. Thay thế `{{TARGET_FOLDER_PATH}}` bằng đường dẫn folder component trong dự án **Phantoma** (nơi cần được cập nhật).
3. Thay thế `{{ROOT_FOLDER_PATH}}` bằng đường dẫn folder component tương ứng trong dự án **Zen/temp/Zen** (nguồn tham chiếu/gốc).
4. Gửi prompt cho AI.

---

## PROMPT TEMPLATE

```text
# NHIỆM VỤ: PHÂN TÍCH VÀ ĐỒNG BỘ CHỨC NĂNG & GIAO DIỆN COMPONENT

Hãy phân tích sâu sự khác biệt giữa hai thành phần sau và tiến hành đồng bộ hóa chúng theo nguyên tắc "Tương đồng về hành vi và trải nghiệm", không nhất thiết phải giống nhau 100% về mã nguồn hay phong cách CSS.

1. **Nguồn tham chiếu (Root/Gốc - Zen)**: 
   Đường dẫn: `{{ROOT_FOLDER_PATH}}`
   
2. **Thành phần đích (Target - Phantoma)**: 
   Đường dẫn: `{{TARGET_FOLDER_PATH}}`

## BỐI CẢNH KỸ THUẬT & TRIẾT LÝ ĐỒNG BỘ HÓA

- **Phiên bản Gốc (Zen)**: React + Inline Styles/CSS Modules + VSCode Theme Variables (`--vscode-*`). Đây là "Source of Truth" về mặt tính năng và UX.
- **Phiên bản Đích (Phantoma)**: React + Tailwind CSS + Custom Theme System. Đây là nơi cần áp dụng các tính năng đó nhưng phải tuân thủ quy ước code của Phantoma.
- **Nguyên tắc cốt lõi**:
    1. **Không copy-paste mù quáng**: Đừng cố gắng sao chép từng dòng code hay class name. Hãy hiểu *tại sao* nó làm vậy.
    2. **Tập trung vào Logic & Interaction**: So sánh kỹ các hook, state management, event handlers, điều kiện hiển thị (conditional rendering), và luồng xử lý dữ liệu. Nếu Gốc có tính năng A, Đích cũng phải có tính năng A hoạt động tương tự.
    3. **UI/UX Tương đồng, không Giống hệt**: Giao diện cuối cùng phải mang lại cảm giác sử dụng giống nhau (vị trí nút, thông tin hiển thị, feedback khi thao tác). Tuy nhiên, hãy chấp nhận khác biệt nhỏ về spacing, font-weight, hoặc màu sắc chi tiết nếu chúng phù hợp với Design System của Phantoma (Tailwind theme).
    4. **Xử lý Dependency**: Nếu Gốc dùng một utility/hook/component con mà Đích chưa có, hãy đánh giá xem nên Port sang Đích hay viết lại đơn giản hơn dựa trên khả năng sẵn có của Đích.
    5. **KHÔNG BỎ QUA BẤT KỲ FILE/FOLDER NÀO**: Khi đồng bộ, phải xem xét TẤT CẢ các files trong folder gốc, bao gồm cả các files nhỏ như constants, types, utils. Không được bỏ qua bất kỳ file nào mà không giải thích lý do.
    6. **KHÔNG ĐỒNG BỘ RESPONSIVE**: Bỏ qua toàn bộ logic responsive (useContainerWidth, @container queries, width breakpoints, wireframe wide variants). Phantoma mặc định luôn sử dụng layout hẹp (narrow) cố định cho desktop, không cần các biến thể responsive như Zen. Chỉ giữ layout cố định duy nhất.

## CÁC BƯỚC THỰC HIỆN CHI TIẾT

### Bước 1: Khám phá & Phân tích Toàn diện (Deep Dive Analysis)
- Liệt kê tất cả các file trong cả hai folder (bao gồm cả files nhỏ như constants.ts, types.ts, utils/).
- KHÔNG BỎ QUA bất kỳ file nào. Nếu file nhỏ hoặc có vẻ không quan trọng, vẫn phải liệt kê và phân tích.
- **SO SÁNH TÊN FILE giữa Root và Target**:
    - **Files THIẾU ở Target**: Liệt kê rõ ràng các file có trong Root nhưng không có trong Target (cần port sang).
    - **Files THỪA ở Target**: Liệt kê rõ ràng các file có trong Target nhưng không có trong Root (cần xem xét xóa hoặc giữ lại với lý do).
    - **Files TÊN KHÁC NHAU**: Nếu Target có file tên khác với Root nhưng chức năng tương tự (ví dụ: `ModelAccountDrawer.tsx` trong Target vs `ProviderModelDrawer.tsx` trong Root), phải đổi tên file Target cho khớp với Root để giữ đồng nhất naming convention.
    - Đối với mỗi file thiếu/thừa/tên khác, phải đưa ra quyết định cụ thể: port, skip (kèm lý do), delete, hoặc rename.
- Đọc nội dung chi tiết các file chính (`index.tsx`, `types.ts`) và các component con/hook quan trọng.
- Tạo bảng so sánh đa chiều:
    - **Chức năng (Functionality)**: Các feature flags, chế độ hoạt động (modes), khả năng tương tác (drag-drop, paste, keyboard shortcuts).
    - **Trạng thái (State Management)**: Local state, global context usage, persistence (localStorage/sessionStorage).
    - **Luồng dữ liệu (Data Flow)**: Input props -> Processing -> Output events/callbacks.
    - **Giao diện (UI Layout)**: Cấu trúc DOM tree, thứ tự render, các badge/icon cảnh báo, dropdown menus.
    - **Khác biệt công nghệ**: Ghi chú rõ chỗ nào là do khác biệt CSS framework (VSCode var vs Tailwind class) để bỏ qua việc so sánh khắt khe.

### Bước 2: Lập kế hoạch Chiến lược (Strategic Planning)
- Xác định danh sách hành động cho từng file:
    - **Delete**: File/component thừa thãi hoặc đã bị deprecated ở bản Gốc.
    - **Create New**: Component/Hook/Util mới cần thiết để hỗ trợ tính năng từ bản Gốc.
    - **Refactor/Edit**: Cập nhật logic hiện có để khớp với hành vi của bản Gốc.
- Đề xuất giải pháp cho các vấn đề kỹ thuật:
    - Làm thế nào để map VSCode theme variables sang Tailwind classes?
    - Xử lý các import thiếu bằng cách tạo stub tạm thời hay port hoàn chỉnh?

### Bước 3: Thực thi Code Changes (Implementation)
Thực hiện theo thứ tự ưu tiên sau (batch operations):

1. **Cleanup**: Xóa các file thừa thãi (`delete_file`).
2. **Foundation**: Cập nhật `types.ts` và interfaces để mở khóa các props/state mới.
3. **Core Components**: 
    - Tạo mới các component phụ trợ cần thiết (`write_to_file`).
    - Chỉnh sửa các component hiện có để hỗ trợ logic mới (`replace_in_file`).
4. **Main Integration**: Viết lại hoặc chỉnh sửa nặng `index.tsx` để ghép nối toàn bộ layout và logic (`write_to_file` hoặc nhiều `replace_in_file`). Đảm bảo mọi tính năng từ bản Gốc đều được kích hoạt trong bản Đích.
5. **Polish & Fix**: Xử lý lỗi biên dịch TypeScript. Ưu tiên fix lỗi logic/type trước, lỗi style/theming sau. Dùng `as any` hoặc cast an toàn nếu cần thiết để đảm bảo build pass nhanh chóng, sau đó refactor sạch sẽ nếu còn thời gian.

### Bước 4: Kiểm tra & Verify (Validation)
- Chạy lệnh kiểm tra TypeScript: `npx tsc --noEmit --project tsconfig.web.json`.
- Lọc lỗi liên quan đến folder `{{TARGET_FOLDER_PATH}}`.
- Nếu có lỗi, quay lại Bước 3 để fix.
- Báo cáo kết quả cuối cùng:
    - Danh sách file đã thay đổi.
    - Tóm tắt các tính năng/chức năng đã được đồng bộ.
    - Liệt kê các điểm khác biệt còn tồn tại (và lý do chấp nhận chúng).
    - Hướng dẫn test thủ công cho người dùng.

## YÊU CẦU ĐẦU RA CUỐI CÙNG
- Mã nguồn sạch, không lỗi biên dịch nghiêm trọng.
- Hành vi (Behavior) và Trải nghiệm người dùng (UX) của `{{TARGET_FOLDER_PATH}}` phải tương đương với `{{ROOT_FOLDER_PATH}}`.
- Code phải tuân thủ quy ước của Phantoma (Tailwind, Project Structure) thay vì ép buộc theo kiểu Zen.
- Cung cấp tóm tắt ngắn gọn về những gì đã làm và những gì người dùng cần lưu ý/test.
- **KHÔNG BỎ QUA FILE NÀO**: Mọi file trong folder gốc đều phải được xem xét và xử lý (port, skip với lý do, hoặc adapt).
- **BỎ QUA RESPONSIVE**: Không port logic responsive (useContainerWidth, @container, breakpoints). Chỉ giữ layout desktop cố định.

---

## NHỮNG GÌ ĐÃ PORT (tính đến session đồng bộ gần nhất)

### Từ Zen → Phantoma (đã hoàn thành)

**Phase 1 — Memory / Skill / ConversationTitle:**
- `main/storage/MemoryStorage.ts`, `SkillStorage.ts`
- `main/ipc/memory.handlers.ts`, `skill.handlers.ts`, `title.handlers.ts`
- `controller/MemoryController.ts`, `SkillController.ts`, `TitleController.ts`
- `services/parsers/ConversationTitleParser.ts`, `ReadMemoryParser.ts`, `ReadSkillParser.ts`, `UpdateMemoryParser.ts`
- `services/tool-executors/MemoryExecutor.ts`, `SkillExecutor.ts`, `TitleExecutor.ts`
- `components/ChatBody/AIMessageBox/renderers/other/ReadMemoryRenderer.tsx`, `UpdateMemoryRenderer.tsx`, `ReadSkillRenderer.tsx`
- Update `constants/code.ts` (thêm 4 tool), `ResponseParser.ts`, `tool-executors/index.ts`, `TagRouter.tsx`, `executor-types.ts`

**Phase 2 — Hooks / Components / Stores:**
- `utils/questionUtils.ts`
- `hooks/messages/useConversationInsights.ts`
- `hooks/messages/useMessageActions.ts`
- `hooks/llm/useSessionCleanup.ts`
- `stores/streamingPreviewStore.ts`
- `components/ChatBody/AIMessageBox/ThinkingBlock.tsx`
- `services/parsers/QuestionParser.ts`

**Phase 2 — Wiring:**
- `Chat/index.tsx` gọi `useSessionCleanup`
- `AIMessageBox/index.tsx` + `TagRouter.tsx` render `ThinkingBlock`
- `UserMessageBox.tsx` wire `useMessageActions` cho nút Regenerate

### Bỏ qua có chủ đích

- **`ClaudeContentProcessor.ts`**: Backend Phantoma chưa emit marker `__CLAUDE_TOOL__` → port sẽ là dead code.
- **`ContinueTaskButton.tsx`**: ChatBody Phantoma chưa có cơ chế "interrupted task".
- **`MessageBox.tsx`**: ChatBody Phantoma xử lý route User/AI trực tiếp, wrapper không cần.

### Chưa port (để dành)

- **`useConversationInsights`**: Đã tạo file nhưng chưa có UI sidebar dùng.
- **`streamingPreviewStore`**: Đã tạo store nhưng chưa wire vào StreamingService.
- **JSON tool format**: Zen hỗ trợ, Phantoma chưa.
- **PromptLengthMode**: Zen có 4 chế độ, Phantoma chỉ full prompt.
- **Prompt caching section ordering**: Zen optimize cho provider cache, Phantoma chưa.

### Khác biệt kiến trúc (chấp nhận, không cần đồng bộ)

- Phantoma gộp parser/executor theo mode (CodeParser, EmulateParser, ReconParser); Zen tách từng tool.
- Phantoma dùng function-style executor; Zen dùng class-style.
- Phantoma dùng Electron IPC (`ipcRenderer.invoke`); Zen dùng VSCode webview messaging (`extensionService.postMessage`).
- Phantoma lưu conversation ở `~/.phantoma/{moduleId}/conversations/{conversationId}.json`; Zen lưu ở hệ thống riêng.
- Phantoma dùng `moduleId` (code:projectId, emulate:targetId); Zen dùng `chatUuid` + extension host.
```

---

## VÍ DỤ ÁP DỤNG

Nếu bạn muốn đồng bộ Home feature:

- `{{ROOT_FOLDER_PATH}}`: `Phantoma/temp/Zen/src/webview-ui/src/features/home`
- `{{TARGET_FOLDER_PATH}}`: `Phantoma/src/renderer/src/components/RightPanel/Agent/feature/Home`

Gửi prompt trên cho AI và đảm bảo AI sẽ:
1. Liệt kê TẤT CẢ files trong cả 2 folders (không bỏ sót)
2. Phân tích từng file một
3. Port hoặc giải thích tại sao skip
4. Không port responsive logic