import { DEV_PORTS, profileBaseUrl } from '@renderer/config/ports';

let resolved: string | null = null;
let pending: Promise<string> | null = null;

export function resolveProfileBaseUrl(): Promise<string> {
  if (resolved) return Promise.resolve(resolved);
  if (pending) return pending;

  pending = (async () => {
    let port = DEV_PORTS.profile;
    try {
      const runtime = window.api?.runtime;
      const ports = runtime?.startProfile ? await runtime.startProfile() : await runtime?.getPorts();
      if (ports?.profile) port = ports.profile;
    } catch {
      // dev mode or main unavailable: fall back to DEV_PORTS
    }
    resolved = profileBaseUrl(port);
    return resolved;
  })();

  return pending.finally(() => {
    pending = null;
  });
}