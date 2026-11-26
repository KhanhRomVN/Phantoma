import { clean, q, txt, until, set, sleep } from '../_helpers';

/**
 * Scraper cho BrowserLeaks /tls — https://browserleaks.com/tls
 * 42 fields: User-Agent, protocol support, mixed content test, TLS fingerprints (JA4, JA3),
 * TLS handshake, ECH, supported cipher suites, TLS extensions, extension details
 */
export async function scrapeBlTls(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!txt('#ja4') || !!txt('#ja3'), timeoutMs);
    await sleep(500);
    
    // Your Web Browser
    set(out, 'httpUserAgent', txt('#http-user-agent'));
    
    // Protocol Support
    set(out, 'tls13', txt('#tls-1-3'));
    set(out, 'tls12', txt('#tls-1-2'));
    set(out, 'tls11', txt('#tls-1-1'));
    set(out, 'tls10', txt('#tls-1-0'));
    
    // Mixed Content Test
    set(out, 'mixedContentActive', txt('#mixed-content-active'));
    set(out, 'mixedContentPassive', txt('#mixed-content-passive'));
    
    // TLS Fingerprint
    set(out, 'ja4', txt('#ja4'));
    set(out, 'ja4_r', txt('#ja4_r'));
    set(out, 'ja4_o', txt('#ja4_o'));
    set(out, 'ja4_ro', txt('#ja4_ro'));
    set(out, 'ja3', txt('#ja3'));
    set(out, 'ja3_r', txt('#ja3_r'));
    set(out, 'ja3_n', txt('#ja3_n'));
    set(out, 'ja3_rn', txt('#ja3_rn'));
    
    // TLS Handshake
    set(out, 'tlsProtocol', txt('#tls-protocol'));
    set(out, 'cipherSuite', txt('#cipher-suite'));
    set(out, 'keyExchange', txt('#key-exchange'));
    set(out, 'signatureScheme', txt('#signature-scheme'));
    
    // Encrypted Client Hello
    set(out, 'echSuccess', txt('#ech-success'));
    set(out, 'outerSni', txt('#outer-sni'));
    
    // Supported Cipher Suites
    const cipherList = txt('#cipher-suites-list');
    if (cipherList) out.supportedCipherSuites = cipherList.split('\n').map(s => clean(s)).filter(Boolean);
    
    // Supported TLS Extensions
    const extList = txt('#extensions-list');
    if (extList) out.supportedTlsExtensions = extList.split('\n').map(s => clean(s)).filter(Boolean);
    
    // Extension Details (parse từng section nếu có)
    set(out, 'alpnProtocols', txt('#alpn-protocols'));
    set(out, 'applicationSettings', txt('#application-settings'));
    set(out, 'compressCertificate', txt('#compress-certificate'));
    set(out, 'ecPointFormats', txt('#ec-point-formats'));
    set(out, 'echType', txt('#ech-type'));
    set(out, 'echKdfId', txt('#ech-kdf-id'));
    set(out, 'echAeadId', txt('#ech-aead-id'));
    set(out, 'echConfigId', txt('#ech-config-id'));
    set(out, 'keyShareClientShares', txt('#key-share-client-shares'));
    set(out, 'pskKeyExchangeModes', txt('#psk-key-exchange-modes'));
    set(out, 'serverName', txt('#server-name'));
    set(out, 'signatureAlgorithms', txt('#signature-algorithms'));
    set(out, 'statusRequestType', txt('#status-request-type'));
    set(out, 'supportedGroups', txt('#supported-groups'));
    set(out, 'supportedVersions', txt('#supported-versions'));
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}