/** @deprecated Compatibility re-export kept until every consumer outside the Proxy module imports from the public API (see index.ts). */
export * from '../shared/types/proxy-domain.types';
export * from '../shared/types/source-domain.types';
export { DEFAULT_PROXY_FILTERS } from '../features/proxy';
export type { ProxyFilters } from '../features/proxy';
export type { SourceStats } from '../features/sources';
