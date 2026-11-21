# Kiến trúc Emulate

## Luồng AI tag → kết quả

```
AI trả về <list_https>...</list_https>
  → parser   (agent/tools/list-https/list-https.parser.ts)   tách tham số
  → executor (agent/tools/list-https/list-https.executor.ts) đọc store/gọi API
  → renderer (agent/tools/list-https/list-https.renderer.tsx) hiển thị kết quả
```

`agent/tools/registry.ts` tự gom `index.ts` và `*.renderer.tsx` của mọi thư mục tool
bằng `import.meta.glob`; `emulate.module.ts` chỉ đăng ký kết quả vào `ZenModule`.
Ở môi trường dev, registry báo lỗi nếu số tool khác số renderer.

## Thêm một tool mới

1. Tạo `agent/tools/<ten-tool>/` gồm `<ten-tool>.parser.ts`, `.executor.ts`, `.renderer.tsx`.
2. Tạo `index.ts` export một `EmulateTool` (`name` là key `snake_case`, `execute`, `parse`):
   copy từ tool gần giống nhất.
3. Thêm metadata (title, timeout) vào `agent/tag-registry.ts`.
4. Mô tả tool trong `agent/prompts/<agent>/tools-reference.ts` và `agent/prompts/AGENTS.md`.

Renderer được đăng ký theo tên thư mục: `list-https` → `ListHttpsRenderer`, và component
export phải tên đúng như vậy.

## Thêm một feature mới

Tạo `features/<ten>/{components,hooks,stores,services}` cùng `index.ts` làm public API.
Feature khác chỉ nên import qua `index.ts`; thứ dùng từ ≥ 2 feature thì chuyển vào `shared/`.

## Hợp đồng không được đổi

- Key tool gửi AI (`list_https`, `run_fuzzer`...) và định dạng tag trong prompt.
- Key `systemPrompts`: `emulate`, `orchestrator`, `emulate_planner`, `emulate_browser`, `emulate_cli`, `emulate_analyzer`.
- Khóa localStorage/secure storage, endpoint API, tên event WebSocket, `id: 'emulate'`.

## Gợi ý ESLint ranh giới tầng

```js
overrides: [
  { files: ['shared/**'], rules: { 'no-restricted-imports': ['error', { patterns: ['**/features/**', '**/agent/**', '**/app/**'] }] } },
  { files: ['**/*.ts'], excludedFiles: ['**/*.tsx'], rules: { 'no-restricted-imports': ['error', { patterns: ['**/components/**'] }] } },
]
```
