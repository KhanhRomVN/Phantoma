# Conversation Storage Debug Logging

## Tổng quan

Đã thêm logging để debug việc lưu conversation với các ID khác nhau giữa các module (Code, Emulate, Recon).

## Phát hiện quan trọng

Hệ thống hiện tại có **2 storage backends riêng biệt**:

### 1. Old System (Chat Panel - localStorage)
- **Storage**: Browser localStorage
- **Key format**: `zen-chat:${sessionId}:${folderPath}:${conversationId}`
- **Sử dụng**: Chat Panel feature (đang được dùng nhiều)
- **Files**:
  - `/src/renderer/src/components/RightPanel/Agent/feature/Chat/services/ConversationService.ts`
  - `/src/renderer/src/components/RightPanel/Agent/services/ExtensionService.ts`

### 2. New System (File-based Storage)
- **Storage**: File system tại `~/.phantoma/conversations/`
- **Key format**: `${moduleId}/${conversationId}.json`
- **Module IDs**:
  - Code: `code:${currentProjectId}` (projectId = system path của project)
  - Emulate: `emulate:${activeTargetId}` (targetId = ID trong table `emulate_targets`)
  - Recon: `recon:${activeTargetId}`
- **Sử dụng**: useConversation hook (chưa được dùng nhiều, đang trong giai đoạn phát triển)
- **Files**:
  - `/src/renderer/src/components/RightPanel/Agent/hooks/useConversation.ts`
  - `/src/renderer/src/components/RightPanel/Agent/services/ConversationService.ts`
  - `/src/main/services/ConversationStorage.ts`
  - `/src/main/ipc/conversation.handlers.ts`

## Các thay đổi đã thực hiện

### 1. Main Process (IPC Handlers)
**File**: `/src/main/ipc/conversation.handlers.ts`

Thêm console.info logging cho:
- `conversation:save` - Log moduleId, conversationId, messageCount
- `conversation:get` - Log moduleId, conversationId, load status
- `conversation:list` - Log moduleId, count, first 5 IDs

### 2. Renderer Process - New System
**File**: `/src/renderer/src/components/RightPanel/Agent/services/ConversationService.ts`

Thêm logger.info cho:
- `save()` - Log moduleId, conversationId, messageCount
- `get()` - Log moduleId, conversationId, load status
- `create()` - Log moduleId, conversationId, hasInitialMessage

### 3. Renderer Process - Old System
**File**: `/src/renderer/src/components/RightPanel/Agent/feature/Chat/services/ConversationService.ts`

Thêm logger.info trong `saveConversation()`:
- Log storageKey (full key with zen-chat prefix)
- Log sessionId, folderPath, conversationId, messageCount

### 4. Agent Panel - Module ID Construction
**File**: `/src/renderer/src/components/RightPanel/Agent/index.tsx`

Thêm logger.info khi construct activeKey:
- Log feature type (emulate/code/recon)
- Log targetId/projectId
- Log final activeKey

## Cách sử dụng

### 1. Xem logs trong console
Khi chạy app, mở DevTools Console và filter theo:
- `[AgentPanel]` - Xem module ID được tạo
- `[ConversationService]` - Xem conversation operations (New System)
- `[Chat ConversationService]` - Xem conversation operations (Old System)
- `[IPC][conversation:]` - Xem backend file operations

### 2. Log format

**Agent Panel (Module ID)**:
```
[AgentPanel] 🎯 Active key (Emulate): {
  feature: 'emulate',
  targetId: '123-abc-456',
  activeKey: 'emulate:123-abc-456'
}
```

**New System (File-based)**:
```
[ConversationService] 🆕 Creating new conversation: {
  moduleId: 'emulate:123-abc-456',
  conversationId: 'conv_1234567890_abc123',
  hasInitialMessage: true
}
```

**Old System (localStorage)**:
```
[Chat ConversationService] 💾 Saving conversation (Old System): {
  storageKey: 'zen-chat:12345:/path/to/project:conv_1234567890',
  sessionId: 12345,
  folderPath: '/path/to/project',
  conversationId: 'conv_1234567890',
  messageCount: 5
}
```

### 3. Xem file logs
Logs cũng được ghi vào file thông qua logger service:
- Location: Xem `src/renderer/src/utils/logger.ts` để biết nơi lưu logs

## Module-specific ID patterns

### Code Module
- **Module ID**: `code:${projectPath}`
- **Example**: `code:/home/user/projects/my-app`
- **Storage path**: `~/.phantoma/conversations/code:~home~user~projects~my-app/`

### Emulate Module
- **Module ID**: `emulate:${targetId}`
- **Example**: `emulate:550e8400-e29b-41d4-a716-446655440000`
- **Storage path**: `~/.phantoma/conversations/emulate:550e8400-e29b-41d4-a716-446655440000/`
- **Target ID source**: Database table `emulate_targets.id`

### Recon Module
- **Module ID**: `recon:${targetId}`
- **Example**: `recon:recon-target-123`
- **Storage path**: `~/.phantoma/conversations/recon:recon-target-123/`

## Vấn đề cần giải quyết

1. **Dual Storage System**: Có 2 hệ thống lưu conversation song song, gây confusion và có thể gây data inconsistency
2. **Migration Path**: Cần migrate từ old system (localStorage) sang new system (file-based)
3. **Code Module ID**: Dùng full system path làm ID có thể gây vấn đề với:
   - Path separator khác nhau giữa OS
   - Path quá dài
   - Special characters trong path
   - Khuyến nghị: Dùng project UUID hoặc hash của path

## Khuyến nghị tiếp theo

1. **Immediate**: Sử dụng logs để debug và hiểu rõ flow hiện tại
2. **Short-term**: Tạo spec để migrate toàn bộ sang New System (file-based)
3. **Long-term**: 
   - Remove old system (localStorage-based)
   - Implement migration tool cho existing conversations
   - Standardize module ID format (avoid using full paths)
