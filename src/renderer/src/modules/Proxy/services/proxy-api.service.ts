import { DEFAULT_PROXY_PORT, proxyBaseUrl, type RuntimePorts } from '@renderer/config/ports';
import type { Proxy, ProxyDraft, ProxySource, VpnAccount, VpnProviderInfo } from '../types';

interface ApiSource {
  id: string;
  name: string;
  type: string;
  websiteUrl: string;
  count: number;
  createdAt: string;
  updatedAt: string;
}

export type ProxyInput = Partial<ProxyDraft> & { sourceId: string };
export type SourceInput = { name?: string; websiteUrl?: string };
export type VpnAccountInput = { name?: string; credentials?: Record<string, string> };

let baseUrl: Promise<string> | null = null;

function resolveBaseUrl(): Promise<string> {
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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${await resolveBaseUrl()}/api/v1${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error ?? `Proxy server error (HTTP ${res.status})`);
  }
  return payload.data as T;
}

function fromSource(s: ApiSource): ProxySource {
  return {
    id: s.id,
    name: s.name,
    provider: s.type === 'vpn' ? 'warp' : '', // ASSUMED: the only vpn-type source outside /vpn/accounts is WARP
    type: 'vendor',
    url: s.websiteUrl || (s.type === 'vpn' ? 'https://one.one.one.one' : ''),
    description: '',
    count: s.count,
    lastSync: s.updatedAt,
    online: true,
    vpn: null,
  };
}

function fromAccount(a: VpnAccount): ProxySource {
  return {
    id: a.id,
    name: a.name,
    provider: a.provider,
    type: 'vpn',
    url: a.url,
    description: a.label,
    count: 0,
    lastSync: a.updatedAt,
    online: a.running,
    vpn: a,
  };
}

export const proxyApi = {
  sources: {
    list: async (): Promise<ProxySource[]> => {
      const [sources, accounts] = await Promise.all([
        request<ApiSource[]>('GET', '/sources'),
        request<VpnAccount[]>('GET', '/vpn/accounts'),
      ]);
      const accountIds = new Set(accounts.map((a) => a.id));
      return [...sources.filter((s) => !accountIds.has(s.id)).map(fromSource), ...accounts.map(fromAccount)];
    },
    create: (input: SourceInput & { name: string }) => request<ApiSource>('POST', '/sources', input),
    update: (id: string, input: SourceInput) => request<ApiSource>('PUT', `/sources/${id}`, input),
    remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/sources/${id}`),
  },

  proxies: {
    subscribe: (onUpdate: (proxy: Proxy) => void): (() => void) => {
      let source: EventSource | null = null;
      let closed = false;
      void resolveBaseUrl().then((base) => {
        if (closed) return;
        source = new EventSource(`${base}/api/v1/proxies/events`);
        source.onmessage = (e): void => {
          try {
            onUpdate(JSON.parse(e.data) as Proxy);
          } catch (err) {
            console.warn('[Proxy] bad status event', err);
          }
        };
      });
      return () => {
        closed = true;
        source?.close();
      };
    },
    list: () => request<Proxy[]>('GET', '/proxies?include=checks'),
    create: (input: ProxyInput) => request<Proxy>('POST', '/proxies', input),
    createMany: (sourceId: string, items: ProxyDraft[]) =>
      request<{ created: Proxy[]; skipped: { index: number; reason: string }[] }>('POST', '/proxies/import', {
        sourceId,
        items,
      }),
    test: (ids: string[]) => request<Proxy[]>('POST', '/proxies/test', { ids }),
    removeMany: (ids: string[]) => request<{ deleted: number }>('POST', '/proxies/bulk-delete', { ids }),
  },

  warp: {
    create: (input: { license: string; count: number }) =>
      request<{ created: Proxy[]; errors: string[] }>('POST', '/warp/proxies', input),
    start: (id: string) => request<Proxy>('POST', `/warp/proxies/${id}/start`, {}),
    stop: (id: string) => request<Proxy>('POST', `/warp/proxies/${id}/stop`),
  },

  vpn: {
    providers: () => request<VpnProviderInfo[]>('GET', '/vpn/providers'),
    create: (input: VpnAccountInput & { provider: string; name: string }) =>
      request<VpnAccount>('POST', '/vpn/accounts', input),
    update: (id: string, input: VpnAccountInput) => request<VpnAccount>('PUT', `/vpn/accounts/${id}`, input),
    remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/vpn/accounts/${id}`),
    activate: (id: string, opts: { userDataDir?: string; profileDirectory?: string; profileId?: string } = {}) =>
      request<VpnAccount>('POST', `/vpn/accounts/${id}/activate`, opts),
    start: (id: string, opts: { country?: string; accountId?: string } = {}) =>
      request<VpnAccount>('POST', `/vpn/accounts/${id}/start`, opts),
    stop: (id: string) => request<VpnAccount>('POST', `/vpn/accounts/${id}/stop`),
  },
};