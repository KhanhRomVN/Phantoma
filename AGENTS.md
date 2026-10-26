# AGENTS.md

## UI conventions

- Modal footer confirm action (e.g. Create group) uses `variant="soft"` from `@renderer/components/ui/Button` in every state (default, hover, disabled). Do not use `solid` or `outline` for it.
- Modal footer Cancel button must NOT use the `variant` prop. Style it only via `className` with the soft look and secondary text: `bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background`.

## Dev environment tips

- Renderer type-check: `npx tsc --noEmit -p tsconfig.web.json` (a pre-existing error in `modules/Emulate/.../AddTargetModal/CLI.tsx` is unrelated).
- AgentWorkflow agents keep model + account in `modules/Code/hooks/useWorkflowStore.ts`; a Zen tab with `workflowAgentId` syncs to it through `WorkflowAgentContext` (read by `useModelAccount`).
- Zen `TagRouter` must not import module renderers directly: renderers come from `ModuleRegistry` (`getModuleRenderers()`, declared in each module's module file (e.g. `CodeModule.ts`) via `renderers`). TagRouter passes the same full props set to every renderer; each renderer picks what it needs.
- Unsaved changes are app-scoped: a module registers a provider via `registerUnsavedProvider` (`shared/unsaved/unsavedRegistry.ts`, e.g. `modules/Code/services/unsaved.service.ts`); `shared/unsaved/UnsavedGuard.tsx` (mounted in `App.tsx`) owns the reload shortcut/beforeunload guard and renders `components/UnsavedChangesModal.tsx`. Do not add per-module reload modals.