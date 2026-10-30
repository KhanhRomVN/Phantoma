/**
 * ------------------------------------------------------------------
 * Runtime Ports (renderer)
 * ------------------------------------------------------------------
 * Trả port của 2 server con. Dev: DEV_PORTS từ shared. Build: hỏi main
 * qua IPC runtime:get-ports một lần rồi cache.
 * ------------------------------------------------------------------
 */

import { DEV_PORTS, RuntimePorts, serverBaseUrl, emulateBaseUrl } from '@app/ports';

let cached: RuntimePorts | null = null;
let pending: Promise<RuntimePorts> | null = null;

async function fetchPorts(): Promise<RuntimePorts> {
  if (cached) return cached;
  if (pending) return pending;
  pending = (async () => {
    try {
      const ports = await window.api.runtime.getPorts();
      cached = ports ?? DEV_PORTS;
    } catch {
      cached = DEV_PORTS;
    }
    pending = null;
    return cached!;
  })();
  return pending;
}

export async function getRuntimePorts(): Promise<RuntimePorts> {
  return fetchPorts();
}

export function getDevPorts(): RuntimePorts {
  return DEV_PORTS;
}

export async function getServerBaseUrl(): Promise<string> {
  const p = await fetchPorts();
  return serverBaseUrl(p.server);
}

export async function getEmulateBaseUrl(): Promise<string> {
  const p = await fetchPorts();
  return emulateBaseUrl(p.emulate);
}