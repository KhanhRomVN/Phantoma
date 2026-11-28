import { request } from '../../../shared/api/proxy-http-client';
import type { VpnAccount, VpnProviderInfo } from '../../../shared/types/source-domain.types';
import type { VpnAccountInput, VpnActivateOptions, VpnStartOptions } from '../types/vpn.types';

export const vpnApi = {
  providers: () => request<VpnProviderInfo[]>('GET', '/vpn/providers'),
  create: (input: VpnAccountInput & { provider: string; name: string }) =>
    request<VpnAccount>('POST', '/vpn/accounts', input),
  update: (id: string, input: VpnAccountInput) => request<VpnAccount>('PUT', `/vpn/accounts/${id}`, input),
  remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/vpn/accounts/${id}`),
  activate: (id: string, opts: VpnActivateOptions = {}) =>
    request<VpnAccount>('POST', `/vpn/accounts/${id}/activate`, opts),
  start: (id: string, opts: VpnStartOptions = {}) =>
    request<VpnAccount>('POST', `/vpn/accounts/${id}/start`, opts),
  stop: (id: string) => request<VpnAccount>('POST', `/vpn/accounts/${id}/stop`),
};

export const listVpnAccounts = () => request<VpnAccount[]>('GET', '/vpn/accounts');
