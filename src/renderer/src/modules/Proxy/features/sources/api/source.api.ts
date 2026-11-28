import { request } from '../../../shared/api/proxy-http-client';
import type { ProxySource, VpnAccount } from '../../../shared/types/source-domain.types';
import { listVpnAccounts } from '../../vpn';
import type { SourceInput } from '../types/source.types';

interface ApiSource {
  id: string;
  name: string;
  type: string;
  websiteUrl: string;
  count: number;
  createdAt: string;
  updatedAt: string;
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

export const sourcesApi = {
  list: async (): Promise<ProxySource[]> => {
    const [sources, accounts] = await Promise.all([request<ApiSource[]>('GET', '/sources'), listVpnAccounts()]);
    const accountIds = new Set(accounts.map((a) => a.id));
    return [...sources.filter((s) => !accountIds.has(s.id)).map(fromSource), ...accounts.map(fromAccount)];
  },
  create: (input: SourceInput & { name: string }) => request<ApiSource>('POST', '/sources', input),
  update: (id: string, input: SourceInput) => request<ApiSource>('PUT', `/sources/${id}`, input),
  remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/sources/${id}`),
};
