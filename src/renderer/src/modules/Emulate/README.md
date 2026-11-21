# Module Emulate

Inspector HTTP/WebSocket, fuzzer, log, report và AI agent cho thiết bị/trình duyệt được emulate.

## Cấu trúc

```
Emulate/
├── index.ts               Public API của module
├── emulate.module.ts      Đăng ký ZenModule (tag, executor, parser, renderer, prompt)
├── EmulateView.tsx        Component gốc
├── Emulate.tsx            Shim re-export (tương thích import cũ)
├── EmulateModule.ts       Shim re-export (tương thích import cũ)
├── app/                   Layout cấp module: FooterBar, WorkspacePanel, useHealthCheck
├── features/              Mỗi feature tự chứa component/hook/store/service
│   ├── targets/  traffic/  fuzzer/  logs/  reports/  resources/  sources/
├── agent/                 Mọi thứ liên quan AI agent
│   ├── tools/<tool>/      executor + parser + renderer + index (mỗi tool một thư mục)
│   ├── prompts/           system prompt của từng agent
│   ├── components/  services/  stores/  tag-registry.ts
├── shared/                Thứ ≥ 2 feature dùng chung: api, constants, types, utils, stores
└── docs/ARCHITECTURE.md
```

## Quy tắc phụ thuộc

`app → features → shared`, `agent → features → shared`.
Cấm `shared → features/agent/app`; `stores/hooks/utils/services → components`.
Hiện `shared/` không import ngược lên tầng nào (đã kiểm tra bằng script).

## Quy ước đặt tên

| Đối tượng | Quy tắc |
|---|---|
| Component | `PascalCase.tsx` |
| Hook | `useXxx.ts` |
| Store | `kebab-case.store.ts` |
| API / service | `kebab-case.api.ts` / `.service.ts` |
| Type | `kebab-case.types.ts` |
| Util / constant | `kebab-case.util.ts` / `.constants.ts` |
| Tool | thư mục `kebab-case`, key gửi AI giữ `snake_case` |

Import xuyên thư mục sâu hơn 2 cấp dùng alias `@renderer/modules/Emulate/...`.

## Còn lại (chưa làm trong đợt này)

Các việc dưới đây cần chạy app/test thật nên chưa làm; xem `docs/ARCHITECTURE.md`:

- Tách 13 file > 500 dòng (`RequestTable`, `Log`, `RequestPanel`, `TargetModal`, `EmulateView`...).
- Gộp `ParamTab`/`HeaderTab` (~750 dòng, gần như trùng) thành một component key-value.
- Thay 70 `any`, rà 94 `useEffect`, gộp `useState` rời rạc.
- Chuyển component sang named export (hiện còn dùng cả default lẫn named).
- Test đặc tả cho parser/util, ESLint ranh giới tầng, `strict` TypeScript.
