# vscodeApi command mapping (Phase 3)

window.vscodeApi không được định nghĩa trong preload/renderer, nên các nhánh gọi vscodeApi hiện là dead code; cột cuối là file đầu tiên trong src/main có nhắc tới tên command (chưa chắc là IPC handler).

| Command | Consumer (file:dòng) | Tham chiếu trong src/main |
|---|---|---|
| deleteConversation | features/chat/services/conversation_persistence.service.ts:178,features/home/components/RecentConversations.tsx:37 | src/main/ipc/conversation.handlers.ts |
| focusTerminal | features/chat/components/ChatFooter.tsx:300 | không có |
| getFileStats | features/chat/components/chatbody/aimessagebox/TagRouter.tsx:336 | không có |
| getRevertPreview | features/chat/components/chatbody/UserMessageBox.tsx:205,features/chat/components/chatbody/UserMessageBox.tsx:269 | không có |
| gitCommitAndPush | features/chat/hooks/workspace/useGitOperations.ts:393 | không có |
| loadProjectContext | features/chat/hooks/events/useExternalMessages.ts:81 | không có |
| openTempImage | features/chat/components/chatbody/UserMessageBox.tsx:312,features/chat/hooks/handlers/useTextareaHandlers.ts:111,features/home/components/ComposerSection.tsx:121 | không có |
| openWorkspaceFile | features/chat/components/ChatFooter.tsx:290 | không có |
| openWorkspaceFolder | features/chat/components/ChatFooter.tsx:295 | không có |
| rejectCommitMessage | agent/tools/commit-message/commit-message.renderer.tsx:199 | không có |
| runGitStatus | features/chat/hooks/workspace/useGitOperations.ts:143 | không có |
| showError | features/chat/hooks/conversation/useConversationRestore.ts:297,features/chat/hooks/handlers/useChatSendHandlers.ts:142 | không có |
| showGitDiff | agent/tools/git-status/git-status.renderer.tsx:56 | không có |
| showInformation | features/chat/hooks/workspace/useGitOperations.ts:252,features/chat/hooks/workspace/useGitOperations.ts:404 | không có |
| showWarning | shared/files/useFileHandling.ts:177,shared/files/useFileHandling.ts:264 | không có |
| validateFuzzyMatch | features/chat/components/chatbody/aimessagebox/TagRouter.tsx:309 | không có |
