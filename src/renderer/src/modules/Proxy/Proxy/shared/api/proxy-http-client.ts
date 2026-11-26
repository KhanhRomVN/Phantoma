import { DEFAULT_PROXY_PORT, proxyBaseUrl, type RuntimePorts } from '@renderer/config/ports';
import type { ApiEnvelope, HttpMethod } from './proxy-api.types';

let baseUrl: Promise<string> | null = null;

export function resolveBaseUrl(): Promise<string> {
  if (!baseUrl) {
    baseUrl = (async () => {
      let port = DEFAULT_PROXY_PORT;
      try {
        const ports = (await window.api?.runtime?.getPorts()) as Partial<RuntimePorts> | undefined;
        if (ports?.proxy) port = ports.proxy;
      } catch (error) {
        console.warn('[Proxy] runtime ports unavailable, using default', error);
      }
      return proxyBaseUrl(port);
    })();
  }
  return baseUrl;
}

export async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${await resolveBaseUrl()}/api/v1${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error ?? `Proxy server error (HTTP ${res.status})`);
  }
  return payload.data as T;
}
