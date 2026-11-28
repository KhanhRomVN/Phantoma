import { proxiesApi } from '../../features/proxy';
import { sourcesApi } from '../../features/sources';
import { vpnApi, warpApi } from '../../features/vpn';

/**
 * Backwards-compatible `proxyApi` facade: same shape and signatures as before the restructure, now
 * delegating to the per-feature API modules. Code inside the module uses the feature APIs directly.
 */
export const proxyApi = {
  sources: sourcesApi,
  proxies: proxiesApi,
  warp: warpApi,
  vpn: vpnApi,
};
