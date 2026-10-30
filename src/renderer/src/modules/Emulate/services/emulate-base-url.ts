/**
 * ------------------------------------------------------------------
 * Emulate Base URL Resolver
 * ------------------------------------------------------------------
 * Module Emulate giao tiếp với Phantoma/emulate service (port riêng,
 * mặc định 3002) — KHÔNG phải server shell ở port 8080. Vì vậy mọi
 * request/SSE từ renderer trong phạm vi Emulate phải resolve base URL
 * theo env VITE_EMULATE_URL hoặc localStorage.emulate_server_url,
 * thay vì dùng apiService mặc định trỏ 8080.
 *
 * Thứ tự ưu tiên:
 *   1. localStorage.emulate_server_url (user override qua Settings)
 *   2. import.meta.env.VITE_EMULATE_URL
 *   3. fallback http://localhost:3002
 * ------------------------------------------------------------------
 */

import { DEV_PORTS, emulateBaseUrl } from '@app/ports';

const DEFAULT_EMULATE_BASE = emulateBaseUrl(DEV_PORTS.emulate);

// Build mode: main trả port ngẫu nhiên qua IPC, cache lại.
let resolvedFromIpc: string | null = null;

/** Refresh cached emulate base từ port main đang giữ (build only). */
export async function refreshEmulateBaseFromIpc(): Promise<void> {
  if (typeof window === 'undefined' || !window.api?.runtime?.getPorts) return;
  try {
    const ports = await window.api.runtime.getPorts();
    if (ports?.emulate) resolvedFromIpc = emulateBaseUrl(ports.emulate);
  } catch {
    // ignore
  }
}

void refreshEmulateBaseFromIpc();

export function resolveEmulateBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('emulate_server_url');
    if (stored) {
      return stored.startsWith('http://') || stored.startsWith('https://')
        ? stored
        : `http://${stored}`;
    }
  }
  const envUrl = (import.meta as any)?.env?.VITE_EMULATE_URL as string | undefined;
  if (envUrl) return envUrl;
  if (resolvedFromIpc) return resolvedFromIpc;
  return DEFAULT_EMULATE_BASE;
}