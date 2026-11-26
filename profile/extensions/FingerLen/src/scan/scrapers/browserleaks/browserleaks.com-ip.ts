import { clean, q, txt, until, set, rowVal, num } from '../_helpers';

/**
 * Scraper cho BrowserLeaks /ip — https://browserleaks.com/ip
 * 74 fields: IP address, location, ISP, WebRTC, TCP/IP fingerprint, TLS, HTTP/2, HTTP headers, Tor, Whois
 */
export async function scrapeBlIp(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#client-ipv4') && !!rowVal('Country'), timeoutMs);
    
    // My IP Address
    const ipEl = q('#client-ipv4') as HTMLElement | null;
    set(out, 'ipAddress', ipEl?.dataset.ip || txt('#client-ipv4 .flag-text'));
    set(out, 'hostname', rowVal('Hostname'));
    
    // IP Address Location
    set(out, 'countryCode', ipEl?.dataset.iso_code);
    set(out, 'country', clean(q('#lookup-flag .flag-text')?.firstChild?.textContent));
    set(out, 'region', rowVal('State/Region'));
    set(out, 'city', rowVal('City'));
    set(out, 'isp', rowVal('ISP'));
    set(out, 'organization', rowVal('Organization'));
    set(out, 'network', rowVal('Network'));
    set(out, 'usageType', rowVal('Usage Type'));
    set(out, 'timezone', rowVal('Timezone').split(' ')[0]);
    set(out, 'localTime', rowVal('Local Time'));
    const coords = q('#coords-data') as HTMLElement | null;
    set(out, 'latitude', num(coords?.dataset.lat || ''));
    set(out, 'longitude', num(coords?.dataset.lon || ''));
    
    // IPv6
    const v6 = txt('#client-ipv6');
    if (/[0-9a-f:]{6,}/i.test(v6)) out.ipv6 = v6;
    
    // WebRTC Leak Test
    set(out, 'webrtcPublicIp', txt('#client-ipv4').replace(/n\/a.*$/i, '').trim());
    
    // TCP/IP Fingerprint
    set(out, 'tcpOs', rowVal('OS'));
    set(out, 'tcpMtu', rowVal('MTU'));
    set(out, 'tcpLinkType', rowVal('Link Type'));
    set(out, 'tcpDistance', rowVal('Distance'));
    set(out, 'ja4t', rowVal('JA4T'));
    
    // TLS Fingerprint
    set(out, 'ja4', rowVal('JA4'));
    set(out, 'ja3Hash', rowVal('JA3 Hash'));
    
    // HTTP/2 Fingerprint
    set(out, 'akamaiHash', rowVal('Akamai Hash'));
    
    // HTTP Headers (extract từ bảng)
    const headerRows = Array.from(document.querySelectorAll('table'));
    for (const table of headerRows) {
      const prevH = table.previousElementSibling;
      if (prevH && clean(prevH.textContent).includes('HTTP Headers')) {
        for (const row of Array.from(table.querySelectorAll('tr'))) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const key = clean(cells[0].textContent);
            const val = clean(cells[1].textContent);
            if (key && val) out['http_' + key.replace(/[^a-zA-Z0-9]+/g, '_')] = val;
          }
        }
        break;
      }
    }
    
    // Tor Relay
    set(out, 'torRelay', rowVal('Relays'));
    
    // Whois (chỉ lấy các field quan trọng)
    set(out, 'whoisRegistry', rowVal('Source Registry'));
    set(out, 'whoisNetRange', rowVal('Net Range'));
    set(out, 'whoisCidr', rowVal('CIDR'));
    set(out, 'whoisNetType', rowVal('Net Type'));
    set(out, 'whoisRegistration', rowVal('Registration'));
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}