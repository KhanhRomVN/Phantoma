import type { ProxyDraft, ProxyKind, ProxyProtocol, ProxyStatus } from '../../../shared/types/proxy-domain.types';

export interface ProxyFilters {
  status: ProxyStatus | 'all';
  protocol: ProxyProtocol | 'all';
  kind: ProxyKind | 'all';
  country: string;
  search: string;
}

export const DEFAULT_PROXY_FILTERS: ProxyFilters = {
  status: 'all',
  protocol: 'all',
  kind: 'all',
  country: 'all',
  search: '',
};

export type ProxyInput = Partial<ProxyDraft> & { sourceId: string };
