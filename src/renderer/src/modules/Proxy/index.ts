// Public API of the Proxy module.
export { ProxyPage, ProxyPage as Proxy } from './app/ProxyPage';
export { proxyApi } from './app/api/proxy-api.facade';
export type {
  Proxy as ProxyRecord,
  ProxyCheck,
  ProxyDraft,
  ProxyKind,
  ProxyOwnership,
  ProxyProtocol,
  ProxyStatus,
  Tone,
} from './shared/types/proxy-domain.types';
export type {
  ProxySource,
  ProxySourceType,
  VpnAccount,
  VpnField,
  VpnProviderInfo,
} from './shared/types/source-domain.types';
export type { ProxyFilters, ProxyInput } from './features/proxy';
export type { SourceInput, SourceStats } from './features/sources';
