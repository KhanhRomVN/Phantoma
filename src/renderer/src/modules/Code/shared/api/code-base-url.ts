import { DEV_PORTS, codeBaseUrl, DEFAULT_CODE_PORT } from '@renderer/config/ports';
import { runtimeIpc } from '../ipc/runtime.ipc';

let resolved: string | null = null;
let pending: Promise<string> | null = null;

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