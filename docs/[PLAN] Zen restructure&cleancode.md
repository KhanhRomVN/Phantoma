# ZEN — PLAN RESTRUCTURE NHẸ + CLEAN CODE

> **Ngày phân tích:** 2026-11-28  
> **Source:** `Zen(2).zip`  
> **Phạm vi archive:** 275 file, gồm 273 file TypeScript/TSX và các file phụ trợ; khoảng 50.316 dòng TypeScript/TSX.  
> **Mục tiêu:** Giữ nguyên kiến trúc cấp cao `context / features / shared`, không viết lại toàn bộ Zen, nhưng sửa ownership, dependency direction, duplicate logic và các điểm điều phối đang quá tải.

---

## 1. Kết luận điều hành

Không cần tạo thêm layer cấp cao. Giữ đúng ba khu vực hiện tại:

- `context`: giữ vai trò cung cấp state/context ở phạm vi ứng dụng.
- `features`: giữ ownership của từng tính năng. Các feature hiện tại nhìn chung đã được chia tương đối rõ; chỉ chỉnh các điểm sai ownership và các cụm logic trùng.
- `shared`: chỉ chứa capability thực sự được nhiều feature sử dụng, contract dùng chung hoặc adapter cấp ứng dụng. Không dùng `shared` làm nơi cất code chưa biết đặt đâu.

**Trọng tâm restructure**:

1. Chuẩn hóa `shared` theo capability thật: `conversations`, `files`, `platform`, `components` và một số hook dùng chung còn lại.
2. Chuyển code của Chat đang đặt nhầm trong Shared về đúng feature Chat.
3. Hợp nhất xử lý conversation summary và file upload bị lặp ở nhiều feature.
4. Đổi tên `ExtensionService` thành tên phản ánh đúng Electron preload/IPC bridge; đồng thời tách các command chỉ thuộc Code module khỏi bridge dùng chung.
5. Giảm trách nhiệm của `useChatLLM`, `ChatPanel`, `ChatBody` bằng các seam có ý nghĩa, không tách file theo số dòng.
6. Xử lý cache parsing, lookup message và keep-alive view trước khi đẩy thêm công việc sang worker.

Không đề xuất thay đổi business behavior trong giai đoạn di chuyển file. Mỗi thay đổi logic phải là patch riêng, có kiểm thử/regression tương ứng.

## 2. Giới hạn dữ liệu và mức độ chắc chắn

ZIP cung cấp source renderer/widget và các module được import trong phạm vi archive. ZIP **không có** `package.json`, `tsconfig`, cấu hình bundler, Electron `main`, preload implementation đầy đủ, package worker/server hoặc toàn bộ repository. Vì vậy:

- Đã xác minh: nội dung implementation và các consumer xuất hiện trong ZIP.
- Có dấu hiệu: thành phần không có consumer trong archive, nhưng có thể được dùng bởi phần repository bị lược bỏ, dynamic import, reflection hoặc public export.
- Đề xuất: cấu trúc/ranh giới mới cần xác nhận với Electron main/preload và toàn repository trước khi merge.
- Chưa xác minh: build, lint, typecheck, test, runtime FPS và mức tiêu thụ RAM thực tế.

Không được xóa một file chỉ vì `rg` không tìm thấy consumer trong ZIP này.

## 3. Structure đích đề xuất

Đây là preview sau restructure nhẹ. Những folder hiện hữu không xuất hiện trong phần rút gọn dưới đây vẫn được giữ nguyên. Không tạo folder rỗng hoặc folder chỉ chứa một file nếu không có lý do ownership/contract rõ ràng.

```text
Zen/
├── context/
│   ├── AgentRootContext.ts
│   ├── AgentTabsContext.ts
│   ├── FeatureContext.tsx
│   ├── MultiAgentContext.ts
│   ├── ProjectContext.tsx
│   ├── SettingsContext.tsx
│   └── WorkflowAgentContext.ts
│
├── features/
│   ├── account/
│   │   ├── components/                 # Giữ
│   │   ├── hooks/
│   │   │   └── useAccountDbFetch.ts    # MOVE từ shared/services/useDbFetch.ts
│   │   ├── services/
│   │   │   └── chromium-profile.service.ts
│   │   │                                  # MOVE từ shared/services/chromeProfiles.ts
│   │   ├── types/                      # Giữ
│   │   └── ...
│   │
│   ├── chat/
│   │   ├── components/                 # Giữ cấu trúc hiện tại
│   │   ├── constants/                  # Giữ constant đặc thù Chat
│   │   ├── executors/                  # Giữ
│   │   ├── formatters/                 # Giữ
│   │   ├── hooks/
│   │   │   ├── api/
│   │   │   ├── conversation/
│   │   │   ├── events/
│   │   │   ├── handlers/
│   │   │   ├── llm/
│   │   │   ├── messages/
│   │   │   ├── tools/
│   │   │   ├── ui/
│   │   │   └── workspace/
│   │   ├── processing/
│   │   │   ├── normalizers/
│   │   │   ├── parsers/
│   │   │   ├── transformers/
│   │   │   └── validators/
│   │   ├── prompts/
│   │   ├── registries/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   │   ├── tool-behaviors.ts       # MOVE từ shared/types/tool-behaviors.ts
│   │   │   ├── tool-display.ts         # MOVE từ shared/types/tool-display.ts
│   │   │   ├── tool-mutation.ts        # MOVE từ shared/types/tool-mutation.ts
│   │   │   ├── tool-output.ts          # MOVE từ shared/types/tool-output.ts
│   │   │   ├── tool-status.ts          # MOVE từ shared/types/tool-status.ts
│   │   │   └── ...
│   │   ├── utils/
│   │   │   ├── git-status-output.parser.ts
│   │   │                                    # MOVE + RENAME shared/types/git-status-parser.ts
│   │   │   └── ...
│   │   └── ChatPanel.tsx                # Entry UI của feature; giữ ở root Chat
│   │
│   ├── composer/
│   │   ├── components/                 # Giữ
│   │   ├── hooks/                      # Giữ
│   │   ├── stores/                     # Giữ
│   │   ├── types/                      # Giữ contract riêng của Composer
│   │   ├── utils/
│   │   │   └── tokenizer.ts            # MOVE từ shared/utils/tokenizer.ts
│   │   └── Composer.tsx                # Giữ ở root Composer
│   │
│   ├── home/                           # Giữ feature; dùng shared conversation capability
│   ├── history/                        # Giữ feature; dùng shared conversation capability
│   ├── marketplace/                    # Giữ
│   ├── setting/                        # Giữ
│   └── welcome/                        # Giữ
│
├── shared/
│   ├── components/
│   │   ├── AgentNavBadge.tsx
│   │   ├── AgentOverlay.tsx
│   │   └── NavPanelHeader.tsx
│   │
│   ├── conversations/
│   │   ├── conversation-storage.service.ts
│   │   │                                  # MOVE + RENAME ConversationService.ts
│   │   ├── conversation-summary.ts       # NEW: summary mapper dùng chung
│   │   ├── conversation.types.ts         # NEW/EXTRACT: contract thực sự dùng chung
│   │   └── conversation-scope.ts         # NEW nếu cần: scope resolver qua dependency
│   │
│   ├── files/
│   │   ├── useFileHandling.ts            # MOVE từ shared/hooks, giữ vì Home + Chat dùng
│   │   ├── file-upload.service.ts        # NEW: upload transport dùng chung
│   │   ├── file.types.ts                 # NEW/MERGE: UploadedFile và ExternalFile chuẩn
│   │   └── file-validation.ts            # MOVE phần validation thuần nếu nhiều consumer
│   │
│   ├── platform/
│   │   ├── electron-widget-bridge.service.ts
│   │   │                                  # RENAME ExtensionService.ts
│   │   ├── ipc-message-dispatcher.ts     # EXTRACT: requestId/timeout correlation
│   │   └── local-storage.adapter.ts      # EXTRACT nếu storage lifecycle được test riêng
│   │
│   ├── hooks/
│   │   ├── useModelAccount.ts            # Giữ nếu consumer thuộc nhiều feature
│   │   └── useToolFormatSettings.ts      # Giữ nếu vẫn có nhiều consumer
│   │
│   ├── utils/
│   │   └── accountSort.ts                # Giữ nếu thực sự dùng chung
│   │
│   └── constants/                        # Chỉ giữ constant dùng qua nhiều feature
│
└── index.tsx
```

### Quy tắc cho structure này

- `context`, `features`, `shared` vẫn là ba folder cấp cao duy nhất.
- `features/chat` giữ các folder nghiệp vụ/kỹ thuật đang có; không dựng thêm một kiến trúc layer mới.
- `shared/conversations`, `shared/files`, `shared/platform` là các capability có nhiều consumer hoặc ranh giới tích hợp riêng, không phải architectural layer tổng quát.
- Nếu `ipc-message-dispatcher.ts` sau khi tách chỉ là một đoạn wrapper không có lifecycle/test/consumer độc lập, giữ nó cùng `electron-widget-bridge.service.ts` thay vì tạo file riêng.
- Không tạo `shared/types`, `shared/services`, `shared/utils` như các thùng chứa cho mọi file không biết đặt đâu. Chỉ giữ folder nào còn ownership rõ.

## 4. Những phát hiện cần xử lý

### 4.1. `ExtensionService` — đổi tên và sửa ranh giới đúng với Electron Widget

**Tên đích đề xuất:**

```text
shared/platform/electron-widget-bridge.service.ts
```

**Lý do:**

- Trong ZIP, implementation dùng `window.api.invoke` và `window.api.on` từ Electron preload, cộng với `localStorage`.
- File có `MessageDispatcher` quản lý `requestId`/timeout.
- Nó không phải VS Code Extension API service. Phần lớn các consumer import `extensionService`, trong khi một số module khác vẫn gọi trực tiếp `window.vscodeApi?.postMessage`.
- Tên `ExtensionService` gây hiểu nhầm với VS Code Extension hoặc extension host, không phản ánh runtime hiện tại là Electron widget renderer.

**Phạm vi đổi tên:**

1. Đổi file thành `electron-widget-bridge.service.ts`.
2. Đổi class/singleton thành `ElectronWidgetBridge` / `electronWidgetBridge`.
3. Cập nhật tất cả import và log prefix.
4. Có thể export alias `extensionService` tạm thời trong một migration commit để tránh đổi tất cả consumer cùng lúc; xóa alias sau khi toàn repository đã cập nhật.
5. Không để tên `vscodeApi` trong các module renderer mới. Thay bằng API có type rõ qua preload bridge, sau khi từng command đã được ánh xạ đúng sang IPC channel.

**Vấn đề cần tách khỏi bridge dùng chung:**

`ExtensionService.ts` hiện import trực tiếp:

- `run-command.executor` của Code module;
- `useCodeStore`;
- danh sách UI command như `openFile`, `openFileDiff`, `openTempImage`.

Như vậy, một bridge được đặt trong `shared` lại chứa implementation riêng của Code. Cách sửa:

- Bridge chỉ làm transport và API IPC có contract chung.
- Tách request/response correlation thành `ipc-message-dispatcher.ts` nếu nó cần được dùng/test độc lập.
- Tách `localStorage` operations thành adapter riêng chỉ khi storage semantics/lifecycle cần kiểm thử độc lập; nếu không, giữ trong bridge để tránh abstraction thừa.
- Các command UI/terminal thuộc Code chuyển thành handler/adapter do Code module cung cấp và đăng ký lúc khởi tạo.
- Nếu Electron main chịu trách nhiệm mở file/folder, chuyển command đó qua typed `window.api`/IPC; nếu là thao tác cập nhật Code UI state thì giữ ở Code module.
- Không để `shared/platform` import ngược từ `features/chat` hoặc `modules/Code`.

**Không thay thế hàng loạt `vscodeApi` bằng `window.api` một cách máy móc.** Trước tiên lập bảng mapping từng `command` cũ → IPC channel/preload API mới → consumer → response event. Các command phải giữ nguyên semantics: `openWorkspaceFile`, `openWorkspaceFolder`, `focusTerminal`, `validateFuzzyMatch`, `getFileStats`, `loadProjectContext`, Git commands và file operations.

### 4.2. Shared code đang sai ownership hoặc sai chiều phụ thuộc

| Hiện tại | Consumer / dấu hiệu | Đề xuất |
|---|---|---|
| `shared/services/useDbFetch.ts` | Chỉ được dùng trong các modal của Account | Chuyển thành `features/account/hooks/useAccountDbFetch.ts` |
| `shared/services/chromeProfiles.ts` | Consumer chỉ trong Add Account của Account | Chuyển thành `features/account/services/chromium-profile.service.ts` |
| `shared/types/tool-behaviors.ts` | Import `ToolAction` từ Chat; logic chỉ phục vụ tool registry của Chat | Chuyển về `features/chat/types` |
| `shared/types/tool-display.ts` | Import type nội bộ Chat; phục vụ display metadata | Chuyển về `features/chat/types` |
| `shared/types/tool-mutation.ts` | Phục vụ mutation registry và phân tích file của Chat | Chuyển về `features/chat/types` hoặc để gần registry nếu chỉ là internal contract |
| `shared/types/tool-output.ts` | Phục vụ tool output của Chat | Chuyển về `features/chat/types` |
| `shared/types/tool-status.ts` | Phục vụ trạng thái tool của Chat | Chuyển về `features/chat/types` |
| `shared/types/git-status-parser.ts` | File implementation/parser nằm trong folder types, chỉ phục vụ Git hook của Chat | Chuyển về `features/chat/utils/git-status-output.parser.ts` |
| `shared/utils/tokenizer.ts` | Consumer trong Composer | Chuyển về `features/composer/utils/tokenizer.ts` |
| `shared/hooks/useFileHandling.ts` | Home và Chat cùng dùng, nhưng import validation/constants từ Chat | Giữ shared nhưng chuyển sang `shared/files`, loại dependency ngược về Chat |
| `shared/services/ConversationService.ts` | Home, History, Chat cùng dùng; service đọc `useCodeStore` và import `WorkflowAgentId` từ Chat | Chuyển sang `shared/conversations`, bỏ phụ thuộc trực tiếp vào Code store và Chat types |

#### Lưu ý riêng cho `useDbFetch.ts`

File được đặt trong `services` nhưng export hook. Ngoài ra có `DB_MANAGER_HEADER` và phần mô tả nói tự gắn header `x-database-manager-id`; implementation trong archive không thực sự gắn header này vào request. Cần xác minh yêu cầu hiện hành:

- Nếu header là bắt buộc: bổ sung đúng nguồn ID và kiểm thử request.
- Nếu không còn dùng: bỏ constant/comment gây hiểu nhầm.

Không nên giữ một contract mô tả sai hành vi.

#### Lưu ý riêng cho File Attachment types

`shared/types/file-uploader.ts` và `features/composer/types/composer.types.ts` có `UploadedFile` với các trường tương đồng (`id`, `name`, `size`, `type`, `content`, `file_id`, `isUploading`, `error`). Nên có một định nghĩa chuẩn trong `shared/files/file.types.ts` nếu cả Chat và Composer cùng dùng.

Không gộp `AttachedItem` hiện có thành một union lớn ngay. Những loại như `external`, `folder`, `snippet` có semantics khác nhau. Chỉ tạo shared attachment contract khi consumer thực tế có cùng ý nghĩa và cùng vòng đời; nếu không, giữ `ChatAttachment`/`ComposerAttachment` riêng nhưng tái sử dụng các primitive file type chung.

### 4.3. Shared capability thực sự dùng chung

#### File upload

`shared/hooks/useFileHandling.ts` được Chat và Home sử dụng nên không chuyển toàn bộ hook về một feature. Tuy nhiên implementation hiện import `isFileAllowed`, `readFileAsText` và `ALLOWED_FILE_EXTENSIONS` từ Chat, tạo dependency sai chiều.

`features/chat/hooks/workspace/useFileUpload.ts` lại tự chuyển Base64 thành Blob, tạo FormData, gọi endpoint:

```text
POST /v1/uploads/accounts/{accountId}/uploads
```

**Đề xuất:**

- Đưa upload transport/response parsing vào `shared/files/file-upload.service.ts`.
- Đưa `UploadedFile` canonical và `ExternalFile` vào `shared/files/file.types.ts`.
- Chuyển phần validation thật sự độc lập với Chat sang `shared/files/file-validation.ts`.
- `useFileHandling` vẫn quản lý UI lifecycle: paste, file input, drag/drop, external attachment và upload progress.
- `useFileUpload` của Chat vẫn quản lý trạng thái/contract riêng của Chat, nhưng gọi cùng upload service.
- Không chuyển `FileReader`, DOM input, clipboard event hoặc React state vào worker-server. Nếu cần tối ưu encode/upload, đo memory copy trước; ưu tiên `Blob`/`File` native và streaming upload nếu API hỗ trợ.

#### Conversation summary

Home và History có hai implementation gần giống nhau:

- Home: `features/home/hooks/useRecentConversations.ts` — `toSummary()` + `mapWithLimit()`.
- History: `features/history/services/conversation-history.service.ts` — `loadSummary()` + `mapWithConcurrency()`.

Cùng tạo title/preview, message count, total user requests, provider/model và tổng token usage. Khác biệt nhỏ về null handling/legacy fields cần chuẩn hóa, không copy hai phiên bản.

**Đề xuất:**

- `shared/conversations/conversation-summary.ts`: hàm thuần `mapConversationSummary()` và helper song song có giới hạn nếu còn nhiều consumer.
- Home/History giữ loading state, sorting, error display, delete/clear và cache invalidation riêng.
- `ConversationService.list()` + gọi `get()` cho từng ID tạo pattern N+1 IPC. Đây là vấn đề data-access/IPC chứ không phải bài toán cần worker: nên bổ sung bulk `conversation:list-summaries` hoặc `conversation:list` trả summary trực tiếp từ Electron main/storage layer nếu cấu trúc lưu trữ cho phép.

### 4.4. Conversation storage và scope resolution

`shared/services/ConversationService.ts` được dùng chung nhưng `getWorkspaceFolderPath()` fallback trực tiếp sang `useCodeStore`. Service shared vì vậy phụ thuộc implementation của Code module.

Nó còn import `WorkflowAgentId` từ `features/chat/types/workflow_agent.types.ts`, dù workflow agent scope được dùng ở context và các feature khác.

**Đề xuất:**

- Di chuyển service thành `shared/conversations/conversation-storage.service.ts`.
- Đưa `WorkflowAgentId` ra khỏi `features/chat/types` vì Context/History cũng sử dụng. Với source hiện tại, ưu tiên để type trong `context/WorkflowAgentContext.ts` (nơi sở hữu workflow-agent state) và để Chat/History import contract này. Không tạo thêm một folder chỉ chứa một file type.
- Bỏ `useCodeStore` khỏi service. Caller hoặc composition point truyền `folderPath`/workspace scope tường minh; hoặc inject một resolver interface ở điểm khởi tạo.
- Tránh để service lưu trữ tự đọc `window.__zenWorkspaceFolderPath` làm nguồn sự thật duy nhất. Global có thể giữ làm compatibility bridge trong giai đoạn chuyển đổi, không là contract cuối cùng.
- Chuẩn hóa scope key giữa Chat, Home và History; không để mỗi nơi tự resolve module/project/target theo cách riêng.

### 4.5. Feature Chat: các vấn đề về cohesion và code flow

#### `useChatLLM.ts` — 1.245 dòng

File đang chứa một hook orchestration lớn: quản lý message state, reset/stop, gửi request, stream response, parse kết quả, save conversation và follow-up logic.

Không cần tách từng callback. Nên giữ hook làm orchestration point và tách những workflow đã có contract/side-effect riêng:

- Request preparation: chuẩn hóa request payload, files, account/model và conversation override.
- Response finalization: map metadata, attach parsed result, debug summary, lưu log và save conversation.
- Follow-up/continuation policy: số lần retry/follow-up, điều kiện tiếp tục và lựa chọn câu hỏi.
- Notification: chỉ tách nếu có nhiều consumer hoặc lifecycle độc lập.

Các phần này chỉ nên thành file riêng khi sau khi đọc trọn call graph vẫn có ranh giới rõ, không phải chỉ vì hook dài. `useChatLLM` vẫn giữ quyền điều phối luồng gửi/stream/cancel.

#### `useToolExecution.ts` — 667 dòng

Đây là orchestration của action lifecycle: pending resolver, tool result buffer, action completion, command approval/rejection, state và follow-up. Không chuyển phần này sang Shared hoặc Worker.

Có thể tách các phép tính thuần như xác định trạng thái action, xây action ID, tổng hợp result và kiểm tra hoàn tất nếu nhiều nơi cần dùng/test độc lập. Phần gọi executor, approve dangerous command, terminal/file operation và cập nhật UI phải ở trusted host/feature boundary.

#### `ChatPanel.tsx` — 961 dòng

`ChatPanel` kết nối nhiều hook, state, context và UI. Các hàm export hội thoại (`messagesToMarkdown`, `messagesToJson`, `downloadJson`, `copyToClipboard`) đang đặt ở đầu component file. Có thể chuyển thành `features/chat/utils/conversation-export.ts` hoặc service chuyên export nếu có nhiều consumer/test riêng. `ChatPanel` tiếp tục là composition root của UI Chat.

#### `ChatBody.tsx` — 749 dòng

Có lookup lặp lại trong vòng render:

- `parsedMessages.find()` cho từng message.
- `messages.findIndex()` lặp nhiều lần.
- `slice().find()` tìm next user message.
- `slice().reverse().find()` tìm previous assistant message.

Với N messages, một số đoạn có thể tạo O(N²) lần duyệt và nhiều array allocation. Nên precompute `Map<messageId, parsedMessage>`, index map và previous/next indexes một lần trước render; chỉ tính trên danh sách message đang cần hiển thị.

`hasUnexecutedAutoActions` hiện kiểm tra action pending nhưng cuối cùng luôn `return false`, kể cả khi tìm thấy pending action. Đây là no-op logic cần xác minh UX mong muốn rồi sửa hoặc xóa, không chỉ di chuyển file.

#### `useMessageParsing.ts` và parser cache

Các rủi ro đã thấy:

- `parseCacheRef` là `Map` không có giới hạn dung lượng; chỉ object cache có giới hạn khoảng 100 phần tử.
- Cache key là `${toolFormat}::${msg.content}` nhưng không chứa `feature`, trong khi `parseAIResponse()` nhận `feature` và parser module có thể phụ thuộc module-specific registry. Cùng content/tool format ở hai feature có thể dùng nhầm kết quả parse.
- `ChatBody` có parse cache riêng với cùng kiểu key thiếu feature và chỉ clear khi messages rỗng.
- `useChatLLM` đã parse response hoàn chỉnh và gắn `assistantMessage.parsed`; các consumer khác vẫn có đường parse lại raw content (ví dụ `useToolExecution`, `revert_preview_builder`, `ChatBody` fallback). Nên có một nguồn parsed result theo message/version, không nhiều tầng cache tự quản lý.

**Đề xuất:**

- Chuẩn hóa `ParsedResponse` thành dữ liệu serializable, gắn với `messageId`, `contentVersion/hash`, `toolFormat`, `feature/moduleId`, `parserVersion`.
- Parse mỗi message hoàn chỉnh một lần; dùng lại `message.parsed` cho render, insights và tool execution.
- Message đang stream chỉ parse theo policy rõ ràng; hiện `StreamingService` ghi rõ parse sau khi hoàn tất, nên không mở rộng parse toàn phần từng chunk khi chưa có yêu cầu UX.
- Dùng LRU/capacity theo byte hoặc số entry, eviction khi đổi conversation/module và không giữ raw content vô hạn trong key.

### 4.6. Context và prompt contract

`ProjectContext.tsx` hiện đặt `homedir` và `treeView` bằng chuỗi rỗng, không có đường cập nhật trong file; `workspace` lại lấy từ `project?.name`, còn `rootPath` lấy `project?.path`.

`PromptBuilder` sử dụng `workspace` ít nhất theo hai nghĩa:

- Tạo path `${workspace}/AGENTS.md` để đọc file.
- Dùng nó khi tạo project context.

Cần xác minh `project.name` có thực sự là path trong model `Project` không. Nếu chỉ là tên hiển thị, đây là semantic mismatch: dùng `rootPath` cho filesystem path và một field/nội dung khác cho workspace context. Không tiếp tục truyền một chuỗi `workspace` mang nhiều ý nghĩa.

`treeView` đang rỗng làm phần Project Structure có thể luôn vắng mặt. Chọn một trong hai: hydrate nó từ host/workspace context hoặc bỏ khỏi contract cho tới khi có nguồn dữ liệu thật. `homedir` cũng cần bỏ nếu không còn consumer hoặc cấp giá trị hợp lệ nếu có yêu cầu.

### 4.7. Keep-alive của AgentView

`index.tsx` giữ mỗi `AgentView` đã mở ở trạng thái mounted và ẩn view không active bằng CSS. Điều này giữ UI state, nhưng component/hook/listener/polling của các view ẩn có thể tiếp tục sống theo số project/target đã mở.

Đề xuất không bỏ keep-alive ngay. Thực hiện theo thứ tự:

1. Xác định mọi subscription, timer, polling và event listener trong Chat/feature có tiếp tục chạy khi view inactive không.
2. Truyền `isActive` hoặc lifecycle signal xuống view; pause các hoạt động không cần khi hidden, cleanup đúng.
3. Đặt giới hạn số view keep-alive hoặc LRU eviction, nhưng chỉ sau khi đã có cơ chế persist/restore state an toàn.
4. Đo RAM và FPS khi mở nhiều project/target trước và sau.

## 5. Các ứng viên cleanup — chưa xóa ngay

| File/logic | Quan sát trong ZIP | Hành động |
|---|---|---|
| `shared/hooks/useConversation.ts` | Không thấy consumer trong archive | Search toàn repository, public export, dynamic import; chỉ xóa khi xác minh |
| `shared/types/index.ts` | Không thấy import từ archive | Kiểm tra barrel/public API và consumer ngoài archive |
| `shared/constants/events.ts` | Một constant ngắn, chưa thấy vai trò dùng chung rõ | Xác minh consumer; chuyển về owner hoặc xóa |
| `shared/constants/tooltip.constants.ts` | Rất nhỏ, cần kiểm tra reference | Xác minh consumer; không giữ folder chỉ vì một file |
| `shared/types/file-uploader.ts` | Trùng UploadedFile với Composer | Hợp nhất type sau khi kiểm tra toàn bộ consumer |
| `shared/types/tool-*.ts` | Phụ thuộc vào Chat | Chuyển về Chat, không xóa logic |
| `shared/utils/tokenizer.ts` | Chỉ phục vụ Composer trong archive | Chuyển về Composer |
| `shared/types/git-status-parser.ts` | Implementation nằm trong types | Chuyển về Chat utils và đổi tên |
| `ProjectContext.homedir/treeView` | Giá trị khởi tạo rỗng | Kiểm tra consumer; bỏ hoặc nối nguồn dữ liệu thật |
| `ChatBody.hasUnexecutedAutoActions` | Nhánh cuối luôn false | Sửa theo behavior mong muốn hoặc xóa no-op |

## 6. Thứ tự migration đề xuất

### Phase 0 — Baseline và contract inventory

- Tạo snapshot build/test hiện tại ở repository đầy đủ.
- Liệt kê toàn bộ consumer của `ExtensionService`, `vscodeApi`, `ConversationService`, file hooks và Shared types.
- Lập mapping từng message command cũ sang Electron preload/main IPC.
- Xác nhận model `Project`, semantics của `workspace`, `rootPath`, `treeView`.

### Phase 1 — Ownership-only moves

Chỉ di chuyển file/đổi import, chưa thay logic:

- Account `useDbFetch` và `chromeProfiles`.
- Chat tool types và Git status parser.
- Composer tokenizer.
- `shared/files` cho file handling/types.
- `shared/conversations` cho ConversationService.

Chạy typecheck/build sau từng cụm thay đổi.

### Phase 2 — Shared capability và duplicate logic

- Tạo canonical `UploadedFile` type.
- Tạo upload service dùng chung; chuyển 2 hook sang dùng service.
- Tạo conversation summary mapper dùng chung.
- Chuẩn hóa bounded concurrency helper nếu vẫn cần sau khi có bulk summary API.
- Chuẩn hóa scope resolver cho Home/History/Chat.

Không hợp nhất các state, UI workflow hoặc attachment variants chỉ vì field có hình thức giống nhau.

### Phase 3 — Electron bridge naming và dependency

- Đổi `ExtensionService` thành `ElectronWidgetBridge`.
- Cập nhật tất cả imports, logs và public export.
- Tách Code-specific UI/terminal handlers khỏi `shared/platform`.
- Migrate `window.vscodeApi` call-by-call sang typed preload API/IPC sau khi kiểm tra command contract.
- Duy trì compatibility alias trong một commit nếu cần; gỡ sau khi toàn repository sạch.

### Phase 4 — Chat correctness/performance refactor

- Chuẩn hóa parsed result và parse cache.
- Xóa duplicate parser path khi đã xác minh consumer dùng `message.parsed`.
- Precompute message lookup/index trong `ChatBody`.
- Sửa `hasUnexecutedAutoActions` no-op.
- Tách export helpers và các đoạn pure function có contract rõ khỏi `ChatPanel`/`useChatLLM`.
- Thêm lifecycle pause cho keep-alive views.

### Phase 5 — Worker offload

Thực hiện theo file thứ hai `ZEN_WORKER_OFFLOAD_CANDIDATES.md`. Không chuyển worker chỉ để làm renderer có ít code hơn. Phải đo được main-thread time tiết kiệm vượt serialization + IPC/API latency.

### Phase 6 — Cleanup

- Xóa alias/legacy code và candidate dead code chỉ sau full-repo reference check.
- Xóa folder trống hoặc folder còn một file nhưng không có ownership reason.
- Cập nhật docs, tests và export barrel.

## 7. Checklist nghiệm thu

### Structure và ownership

- [ ] Root chỉ còn `context`, `features`, `shared` và entry point cần thiết.
- [ ] Mỗi file Shared có ít nhất hai consumer thực tế hoặc là contract/adapter cấp ứng dụng có owner rõ.
- [ ] Shared không import private implementation từ Chat/Code/feature khác.
- [ ] Feature-specific types/parser/logic nằm trong feature sở hữu.
- [ ] Không tạo folder chỉ chứa một file nếu không có lý do rõ.

### Duplicate và contracts

- [ ] Conversation summary có một implementation chuẩn.
- [ ] Upload transport có một implementation chuẩn.
- [ ] `UploadedFile` có một định nghĩa chuẩn.
- [ ] Attachment variants không bị ép hợp nhất sai semantics.
- [ ] `WorkflowAgentId` có owner đúng và không buộc Shared phụ thuộc Chat.
- [ ] Workspace scope được truyền tường minh, không phụ thuộc `useCodeStore` bên trong Shared.

### Electron bridge

- [ ] `ExtensionService` được rename đồng bộ.
- [ ] Bridge không phụ thuộc Code store hoặc command executor.
- [ ] Mỗi legacy `vscodeApi` command được mapping và kiểm tra response event.
- [ ] Preload API có type, giới hạn quyền và giữ đúng contract.

### Chat

- [ ] Parse result không bị tạo nhiều lần không cần thiết.
- [ ] Cache key có feature/module/parser version và bounded eviction.
- [ ] ChatBody không còn tìm message lặp O(N²) trong từng render.
- [ ] No-op/unused state được xử lý.
- [ ] Keep-alive view không tiếp tục polling/subscription khi không cần.
- [ ] Các workflow stream, tool action, cancel, approval, restore và persistence vẫn đúng.

### Verification

- [ ] Typecheck và lint thành công.
- [ ] Build renderer/Electron target thành công.
- [ ] Kiểm thử upload, restore conversation, Home/History summary, switch project/target, tool execution và Git operations.
- [ ] Kiểm tra dynamic import, runtime registrations, preload API, IPC channels và public exports.
- [ ] Đo FPS/RAM trước-sau ở kịch bản mở nhiều AgentView và hội thoại dài.

## 8. Kết luận

Hướng restructure tốt nhất cho source hiện tại không phải dựng thêm kiến trúc nhiều tầng. Giữ ba vùng cấp cao, sửa ownership của Shared, hợp nhất các capability thực sự trùng, bỏ dependency ngược và giảm các hot path trong Chat.

Trong tất cả các thay đổi, ba việc nên ưu tiên nhất là:

1. **Electron bridge:** rename và tách khỏi Code implementation để Shared không phụ thuộc feature.
2. **Conversation + File capabilities:** một nguồn summary/upload dùng chung, có contract rõ.
3. **Chat rendering/parsing:** một parsed result đáng tin cậy, cache có giới hạn, giảm lookup lặp và kiểm soát keep-alive lifecycle.

Đây là restructure có tác động thực chất đến maintainability và hiệu năng, nhưng vẫn giữ nguyên hình dạng tổng thể của Zen.
