import type { ProxySource } from '../../../shared/types/source-domain.types';

/** Protected sources can be edited but not deleted. */
export function isProtectedSource(source: ProxySource): boolean {
  if (source.type === 'vpn') return source.vpn !== null && source.name === source.vpn.label; // ASSUMED: the seeded vpn source is named after its provider label (vpn.service ensureDefaults); extra accounts have other names
  return source.provider?.toLowerCase() === 'warp' || source.name?.toLowerCase() === 'default'; // ASSUMED: API sources may omit provider/name
}
