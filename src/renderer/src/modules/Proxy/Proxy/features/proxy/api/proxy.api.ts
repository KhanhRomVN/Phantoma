import { request, resolveBaseUrl } from '../../../shared/api/proxy-http-client';
import type { Proxy, ProxyDraft } from '../../../shared/types/proxy-domain.types';
import type { ProxyInput } from '../types/proxy.types';

export const proxiesApi = {
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
};
