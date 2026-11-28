# AGENTS.md

## Shared Code Organization

### Duplicate Elimination Strategy

Đã tổ chức lại code để loại bỏ các định nghĩa trùng lặp giữa các module:

#### 1. Shared Constants & Types

**Location**: `src/renderer/src/shared/`

**Constants:**
- `shared/constants/proxy.constants.ts` - Browser proxy constants (PROXY_PROTOCOLS, PROXY_KIND, PROXY_HEALTH, MAX_PING, etc.)
- `shared/constants/ui.constants.ts` - UI constants (STREAM_BOX_HEIGHT, PATH_CHIP_MAX_LENGTH, QUESTION_TRANSITION_DELAY, etc.)

**Types:**
- `shared/types/browser-proxy.types.ts` - Browser/LaunchConfig proxy types (ProxyItem, ProxyFilters, ProxyHealth, ProxyDraft, etc.)
- `shared/types/proxy.types.ts` - Re-export của browser-proxy.types để maintain backward compatibility

**Utilities:**
- `shared/utils/proxy.utils.ts` - Shared proxy utilities (toProxyItem, parseQuery, toggleItem, buildCountryStats, flagEmoji)

#### 2. Import Paths

**TypeScript Path Alias**:
- `@shared/*` → `src/renderer/src/shared/*` (configured in `tsconfig.web.json`)
- `@renderer/*` → `src/renderer/src/*`

**Migration Pattern**:
```typescript
// Old (duplicate definitions in multiple files)
export const PROXY_PROTOCOLS = [...]

// New (single source of truth)
export * from '@shared/constants/proxy.constants';
```

#### 3. Backward Compatibility

Các file cũ (như `components/common/LaunchConfig/constants/proxy.ts`) giữ lại để re-export từ shared location, đảm bảo code hiện tại không bị break.

#### 4. Remaining Duplicates

Một số duplicates còn lại cần xử lý thủ công:
- Agent prompts: `modules/Code/agent/prompts/*` vs `modules/Recon/prompts/*` (có sự khác biệt về tools, nên cần giữ riêng)
- Widget components: `components/Widgets/AgentTools/*` vs `components/Widgets/Zen/*` (architecture decision cần review). Các phần trùng đã gộp: AgentTools import từ Zen (ProcessingIndicator, UsageCircle, parseErrorMessage, ThinkingBlockProps).
- Cố ý giữ trùng: `modules/Code/features/design/templates/mobile` vs `website` (template độc lập), các hằng/type khác domain (ROW_HEIGHT, Proxy, Schedule...), `queue`/`cache` trong `Recon/components/ui/Map`.

#### 5. Domain Separation

**Browser Proxy vs Proxy Management Module**:
- `shared/types/browser-proxy.types.ts` - UI-focused types cho LaunchConfig/Browser (uppercase protocols: 'HTTP', 'HTTPS')
- `modules/Proxy/shared/types/proxy-domain.types.ts` - Domain model cho Proxy management (lowercase protocols: 'http', 'https', nhiều fields)

Đây là 2 bounded contexts khác nhau, KHÔNG merge để tránh coupling giữa UI layer và domain layer.

## Development Commands

- `npm run typecheck` - Type checking cho toàn bộ codebase
- `npm run dev` - Start development server
- `npm run typecheck` hiện báo nhiều lỗi sẵn có trong `Widgets/Zen_old/` (code cũ, import path hỏng) — bỏ qua, chỉ quan tâm lỗi ở `Widgets/Zen/` và `modules/`.

## Multi-agent Tabs

- Multi-agent chỉ dùng 1 panel Zen (orchestrator) trong workspace; `AgentGroup.tsx` mount 1 `CodeAgent` cho mỗi agent và cấp `AgentTabsContext`, còn `Widgets/Zen/features/chat/components/AgentTabBar.tsx` (trong `ChatHeader.tsx`) hiển thị tab theo agent. Không tạo panel Zen riêng cho sub-agent; chuyển tab bằng event `SELECT_AGENT_TAB_EVENT`.

## Zen Module Registry

- Module (code/emulate/recon) được đăng ký ở cuối `Widgets/Zen/features/chat/registries/module.registry.ts`. Nếu quên đăng ký, `getModuleParser` trả null và tin nhắn AI hiển thị raw-text thay vì UI.
