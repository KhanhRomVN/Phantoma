# AGENTS.md

## UI conventions

- Modal footer confirm action (e.g. Create group) uses `variant="soft"` from `@renderer/components/ui/Button` in every state (default, hover, disabled). Do not use `solid` or `outline` for it.
- Modal footer Cancel button must NOT use the `variant` prop. Style it only via `className` with the soft look and secondary text: `bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background`.