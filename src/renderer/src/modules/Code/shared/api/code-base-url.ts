/**
 * ------------------------------------------------------------------
 * Code Base URL Resolver
 * ------------------------------------------------------------------
 * Xác định base URL của Code server từ cổng runtime do main process cấp,
 * có cache kết quả và fallback về cổng dev mặc định.
 *
 * Main functions:
 * - resolveCodeBaseUrl() : Trả về base URL (cache sau lần resolve đầu tiên)
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { runtimeIpc } from '../ipc/runtime.ipc';

// ── Utils ──
import { DEV_PORTS, codeBaseUrl, DEFAULT_CODE_PORT } from '@renderer/config/ports';

// ─── Constants ───────────────────────────────────────────────────────────────
let resolved: string | null = null;
let pending: Promise<string> | null = null;

// ─── Functions ───────────────────────────────────────────────────────────────
export function resolveCodeBaseUrl(): Promise<string> {
  if (resolved) return Promise.resolve(resolved);
  if (pending) return pending;

  pending = (async () => {
    let port = DEV_PORTS.code ?? DEFAULT_CODE_PORT;
    try {
      const ports = await runtimeIpc.getCodePorts();
      if (ports?.code) port = ports.code;
    } catch {
      // dev mode or main unavailable: fall back to DEV_PORTS
    }
    resolved = codeBaseUrl(port);
    return resolved;
  })();

  return pending.finally(() => {
    pending = null;
  });
}