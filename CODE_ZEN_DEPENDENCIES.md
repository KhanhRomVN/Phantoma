# Phụ thuộc của module Code vào Zen

Nguồn: grep `@renderer/components/RightPanel/Zen` trong `src/renderer/src/modules/Code` (174 match / 61 file) và toàn bộ `src/renderer/src/modules` (186 match / 90 file).

Lưu ý:
- Kết quả grep toàn `modules` bị cắt bớt nên số liệu Emulate/Recon chỉ mang tính tham khảo.
- Một số đường dẫn trong grep bị cắt (`...`), ví dụ `AIMessageBox/r...` (MarkdownRenderer), nên được suy ra theo ngữ cảnh.

Ký hiệu: `Z` = `@renderer/components/RightPanel/Zen`, `ZC` = `Z/feature/Chat`.

Thứ tự: **trên cùng = dễ gỡ nhất, dưới cùng = khó gỡ nhất**.

---

## Mức 1: Dễ gỡ (1-4 file Code dùng, module khác không dùng)

| # | Phần tử | Nguồn | File Code đang dùng | Hướng xử lý |
|---|---------|-------|---------------------|-------------|
| 1 | `parseDiff`, `DiffHighlight` | `Z/utils/diffUtils` | `renderers/ReplaceInFileRenderer.tsx` | Chuyển vào `Code/utils` (hoặc shared nếu Zen cũng dùng) |
| 2 | `ZEN_INSERT_TEXT_EVENT` | `Z/components/MessageInput/mentionEditor` | `components/ContentPanel/Workspace/sendToZen.ts` | Đưa hằng số sang `shared/events` |
| 3 | `useProject` | `Z/context/ProjectContext` | `renderers/RunCommandRenderer.tsx` | Dùng store/context của Code hoặc truyền qua props |
| 4 | `parseGitStatusOutput`, `GitStatusItem` | `ZC/utils/git-status-parser`, `ZC/types/tool-types` | `renderers/GitStatusRenderer.tsx` | Chuyển vào Code (chỉ git tool dùng) |
| 5 | `UserMessageBox` | `ZC/components/ChatBody/UserMessageBox` | `components/ContentPanel/AgentWorkflow/index.tsx` | Đưa ra shared hoặc chấp nhận |
| 6 | `Message` (type) | `ZC/types/message` | `AgentWorkflow/index.tsx`, `renderers/RunCommandRenderer.tsx` | Đưa type sang shared |
| 7 | `splitModelAndEffort`, `SelectModelAccountModal`, `providerModelCache` | `Z/components/MessageInput/*` | `renderers/CreateAgentRenderer.tsx` | Đưa sang shared/model-picker |
| 8 | `buildTreeFromPaths` | `ZC/utils/tree-builder` | `ListFilesRenderer.tsx`, `FindFilesRenderer.tsx` | Chuyển vào `Code/utils` |
| 9 | `MarkdownRenderer` | `ZC/components/ChatBody/AIMessageBox/r...` | `AgentWorkflow/index.tsx`, `SendMessageRenderer.tsx`, `AgentMessageBox.tsx` | Đưa ra shared/markdown |
| 10 | `ToolAction` (type) | `ZC/services/ResponseParser` | `RunCommandRenderer.tsx`, `CommitMessageRenderer.tsx`, `GitStatusRenderer.tsx`, `GitDiffRenderer.tsx` | Type-only. CHÚ Ý: `RunCommandRenderer` import `.../services/responseParser` (chữ thường) trong khi 3 file kia dùng `ResponseParser` (chữ hoa), dễ lỗi trên Linux/case-sensitive |
| 11 | `ExecutorContext`, `DISPLAY_ONLY_RESULT`, `ExecutorOptions` | `ZC/types/executor-types` | `RunCommandExecutor.ts`, `GitStatusExecutor.ts`, `CommitMessageExecutor.ts`, `CodeModule.ts` | Đưa sang shared hoặc định nghĩa lại trong Code |
| 12 | `extensionService` | `Z/services/ExtensionService` | `RunCommand`, `ReplaceInFile`, `ReadFile`, `Grep`, `ListFiles`, `FindFiles`, `WriteToFile` (renderers) | Theo AGENTS.md chỉ `Code/handler/**` được gọi IPC, nên bọc lại thành handler trong Code |

---

## Mức 2: Trung bình (chỉ Code dùng nhưng nhiều file, hoặc là hợp đồng plugin của Zen)

| # | Phần tử | Nguồn | File Code đang dùng | Hướng xử lý |
|---|---------|-------|---------------------|-------------|
| 13 | Type `tool-*` | `ZC/types/tool-behaviors`, `tool-status`, `tool-output`, `tool-display`, `tool-mutation` | `services/tool-behaviors.ts`, `tool-output-transformer.ts`, `tool-status-checker.ts`, `tool-output-formatter.ts`, `tool-display-formatters.ts`, `tool-mutations.ts`, `raw-content-diff.ts` (7 file) | Dời cả cụm type sang shared |
| 14 | 7 hàm register | `ZC/utils/action-display...`, `completed-tooltip...`, `tool-status-registry`, `tool-behavior-registry`, `tool-output-registry`, `tool-streaming-registry`, `tool-mutation-registry` | `CodeModule.ts` (chỉ 1 file, nhưng 7 import) | Đảo chiều: `CodeModule` khai báo object formatter, Zen tự đăng ký |
| 15 | `TERMINAL_STATUS`, `TOOL_ACTION_TYPES` | `ZC/constants/tag-registry` | `tool-status-checker.ts`, `GitDiffRenderer.tsx`, import nhiều dòng ở `RunCommandRenderer`, `CommitMessageRenderer`, `GitStatusRenderer` | Dời hằng số sang shared |
| 16 | Contexts | `Z/context/SettingsContext` (`useSettings`: RunCommand, CreateAgent, WriteToFile; `SettingsProvider`: Zen.tsx, Account.tsx), `FeatureContext` (Zen.tsx, CreateAgentRenderer), `AgentRootContext` (Zen.tsx, Account.tsx, CreateAgentRenderer), `WorkflowAgentContext` (Zen.tsx, SendMessageRenderer, AgentMessageBox), `MultiAgentContext` (Zen.tsx) | xem cột Nguồn | Phần renderer: truyền qua props. Phần Zen.tsx/Account.tsx: giữ |
| 17 | `AgentPanel`, `AccountPanel` | `Z` (index), `Z/feature/Account` | `components/ContentPanel/Workspace/Zen.tsx`, `components/ActivityPanel/Account.tsx` | Đây là file cầu nối, bản chất phải import Zen. Nên giữ, và coi 2 file này là điểm duy nhất được phép |

---

## Mức 3: Khó gỡ (nhiều file Code + dùng chung Emulate/Recon)

| # | Phần tử | Nguồn | Số file Code | Module khác cũng dùng |
|---|---------|-------|--------------|------------------------|
| 18 | `getNextUserMessage` | `ZC/utils/message-navigator` | 12 renderers | Emulate (`GetResourceContentRenderer`) |
| 19 | `ErrorBlock` | `ZC/components/ChatBody/AIMessageBox/ErrorBlock` | 13 renderers | Emulate (~17 renderer) |
| 20 | `ActionBar` | `ZC/components/ChatBody/AIMessageBox/ActionBar` | 4 renderers | Recon (~25 renderer) |
| 21 | `TagHeader` | `ZC/components/ChatBody/AIMessageBox/TagHeader` | 20 renderers | Emulate (~17 renderer) |
| 22 | `extractParamValue` | `ZC/utils/toolParser` | 11 parsers | Emulate (~15 parser) |
| 23 | `getToolLabel` | `ZC/constants/tag-registry` | ~17 file (renderers + `tool-display-formatters.ts`) | Emulate (~17 renderer) |
| 24 | `BaseRendererProps`, `MergedRendererProps` | `ZC/types/renderer-types` | 23 renderers | Emulate, Recon (tất cả renderer) |
| 25 | `TagDefinition` | `ZC/types/tag-types` | `constants/tag-registry.ts` | Emulate, Recon (tag-registry.ts) |
| 26 | `ZenModule`, `ZenModuleCapabilities` | `ZC/services/moduleRegistry` | `CodeModule.ts` + 6 file `prompts/**/config.ts` (code, planner, reviewer, orchestrator, executor, tester) | Emulate, Recon (module + prompts config) |

Ghi chú: `rendererMapFromGlob` (`ZC/utils/renderer-helpers`) và `chromeProfiles` (`Z/services/chromeProfiles`) chỉ Emulate/Recon dùng, Code không dùng.

---

## Đề xuất chiến lược

1. Tạo thư mục trung lập, ví dụ `src/renderer/src/shared/chat-core/`, chứa: `renderer-types`, `tag-types`, type của `moduleRegistry`, `tag-registry` (`getToolLabel` + hằng số), `toolParser`, `message-navigator`, `TagHeader`, `ErrorBlock`, `ActionBar`, `MarkdownRenderer`, type `Message`.
2. Ở vị trí cũ trong Zen chỉ để lại file re-export, nên Emulate/Recon không bị vỡ trong lúc chuyển.
3. Làm theo thứ tự Mức 1 → Mức 2 → Mức 3. Mức 3 làm cuối vì ảnh hưởng đồng thời 3 module.
4. Đích cuối: trong `modules/Code` chỉ còn `Zen.tsx` và `Account.tsx` import trực tiếp từ Zen.