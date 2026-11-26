# AGENTS.md

## Dev environment tips
- Renderer typecheck: `npx tsc --noEmit -p tsconfig.web.json` (project has many pre-existing errors; filter by the file you touched).
- Fingerprint logic lives in `src/renderer/src/services/fingerprint-generator.ts`; the CDP injection that spoofs WebGL/UA lives in `profile/src/services/browser-cdp.service.ts`.
- Host-platform-aware presets: `detectHostFamily()` biases `generateFootprints` toward the real OS.
- Browser extension `profile/extensions/fingerprint-trust-check` (React + Vite, MV3): build with `cd profile/extensions/fingerprint-trust-check && npm run build`; ungoogled-chromium loads `dist/` via `--load-extension` in `browser-run.service.ts`. Rebuild after editing `src/`.