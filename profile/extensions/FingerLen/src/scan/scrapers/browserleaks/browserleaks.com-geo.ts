import { clean, q, txt, until, set } from '../_helpers';

/**
 * Scraper cho BrowserLeaks /geo — https://browserleaks.com/geo
 * 4 fields: Permissions API (origin, global), Geolocation API (status, watchPosition)
 */
export async function scrapeBlGeo(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#geo-api-status') || !!q('#permissions-origin'), timeoutMs);
    
    // Permissions API
    set(out, 'permissionsOrigin', txt('#permissions-origin'));
    set(out, 'permissionsGlobal', txt('#permissions-global'));
    
    // Geolocation API
    set(out, 'geoApiStatus', txt('#geo-api-status'));
    set(out, 'watchPosition', txt('#watch-position'));
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}