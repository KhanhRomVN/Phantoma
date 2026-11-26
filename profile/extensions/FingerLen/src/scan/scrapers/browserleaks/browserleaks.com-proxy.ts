import { clean, q, txt, until, set } from '../_helpers';

/**
 * Scraper cho BrowserLeaks /proxy — https://browserleaks.com/proxy
 * 7 fields: Proxy detection, Tor browser detection (IP, letterboxing, canvas protection),
 * Adblock detection (subscriptions list)
 */
export async function scrapeBlProxy(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#proxy-headers') || !!q('#adblock-subscriptions'), timeoutMs);
    
    // Proxy Detection
    set(out, 'httpProxyHeaders', txt('#proxy-headers'));
    
    // Tor Browser Detection
    set(out, 'torIpAddress', txt('#tor-ip'));
    set(out, 'torLetterboxing', txt('#tor-letterboxing'));
    set(out, 'canvasProtection', txt('#canvas-protection'));
    
    // Adblock Detection
    const subscriptionsText = txt('#adblock-subscriptions');
    if (subscriptionsText) {
      const lines = subscriptionsText.split('\n').map(s => clean(s)).filter(Boolean);
      out.adblockSubscriptions = lines;
      
      // Parse số lượng filters nếu có
      const summary = lines[0];
      const match = summary.match(/Detected (\d+) Filters: (\d+) Global, (\d+) Regional/);
      if (match) {
        out.adblockFiltersTotal = parseInt(match[1], 10);
        out.adblockFiltersGlobal = parseInt(match[2], 10);
        out.adblockFiltersRegional = parseInt(match[3], 10);
      }
    }
    
    // Content Filters Detection
    set(out, 'adguardDetected', txt('#adguard-detected'));
    set(out, 'darkReaderDetected', txt('#dark-reader-detected'));
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}