/**
 * ------------------------------------------------------------------
 * Network Event Util
 * ------------------------------------------------------------------
 * Pure functions chuẩn hóa event CDP/Proxy thành NetworkRequest và các
 * update (đã chuyển từ renderer sang server để renderer chỉ nhận data).
 * ------------------------------------------------------------------
 */

export interface NetworkRequestDto {
  id: string;
  method: string;
  url: string;
  protocol: string;
  host: string;
  path: string;
  status: number;
  type: string;
  size: string;
  time: string;
  timestamp: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody: string;
  responseBody: string;
  initiator?: string;
  isIntercepted?: boolean;
}

const CDP_RESOURCE_TYPE_MAP: Record<string, string> = {
  Document: 'doc',
  XHR: 'xhr',
  Fetch: 'fetch',
  Script: 'js',
  Stylesheet: 'css',
  Image: 'img',
  Media: 'media',
  Font: 'font',
  WebSocket: 'ws',
  Manifest: 'manifest',
  Other: 'other',
};

export function parseUrlParts(rawUrl: string): { host: string; path: string; protocol: string } {
  if (!rawUrl) return { host: '', path: '', protocol: 'unknown' };

  if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    const preview = rawUrl.length > 64 ? rawUrl.substring(0, 64) + '...' : rawUrl;
    return { host: '', path: preview, protocol: rawUrl.split(':')[0] || 'unknown' };
  }

  let urlToParse = rawUrl;
  if (urlToParse.startsWith('media://')) {
    urlToParse = urlToParse.replace(/^media:\/\//, '');
    urlToParse = urlToParse.replace(/^(https?)\/+(?!\/)/, '$1://');
  }

  try {
    const url = new URL(urlToParse);
    return { host: url.host, path: url.pathname + url.search, protocol: url.protocol.replace(':', '') };
  } catch {
    try {
      const url = new URL('https://' + urlToParse);
      return { host: url.host, path: url.pathname + url.search, protocol: 'https' };
    } catch {
      return { host: '', path: rawUrl, protocol: 'unknown' };
    }
  }
}

export function detectTypeFromRequest(path: string, method: string, url: string): string {
  const pathLower = path.toLowerCase();

  if (pathLower.endsWith('.js')) return 'js';
  if (pathLower.endsWith('.css')) return 'css';
  if (pathLower.endsWith('.html') || pathLower.endsWith('.htm')) return 'doc';
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|bmp)$/.test(pathLower)) return 'img';
  if (pathLower.endsWith('.json')) return 'xhr';
  if (/\.(woff|woff2|ttf|otf|eot)$/.test(pathLower)) return 'font';
  if (/\.(mp4|webm|ogg|mp3|wav)$/.test(pathLower)) return 'media';
  if (pathLower.endsWith('.wasm')) return 'wasm';

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method?.toUpperCase())) return 'xhr';
  if (url?.includes('api') || url?.includes('graphql')) return 'xhr';

  return 'other';
}

export function buildCdpRequest(data: any): NetworkRequestDto {
  const { host, path, protocol } = parseUrlParts(data.url || '');
  return {
    id: data.id || `cdp-${Date.now()}-${Math.random()}`,
    method: data.method || 'GET',
    protocol,
    host,
    path,
    url: data.url || '',
    status: 0,
    type: CDP_RESOURCE_TYPE_MAP[data.resourceType || ''] || 'other',
    size: '0 B',
    time: '0ms',
    timestamp: data.timestamp || Date.now(),
    requestHeaders: data.headers || {},
    responseHeaders: {},
    requestBody: data.requestBody || '',
    responseBody: '',
    initiator: data.initiator ? JSON.stringify(data.initiator) : undefined,
  };
}

export function buildProxyRequest(data: any): NetworkRequestDto {
  const { host, path, protocol } = parseUrlParts(data.url || '');
  return {
    id: data.id || `proxy-${Date.now()}-${Math.random()}`,
    method: data.method || 'GET',
    protocol,
    host,
    path,
    url: data.url || '',
    status: 0,
    type: detectTypeFromRequest(path, data.method || 'GET', data.url || ''),
    size: '0 B',
    time: '0ms',
    timestamp: data.timestamp || Date.now(),
    requestHeaders: data.headers || {},
    responseHeaders: {},
    requestBody: '',
    responseBody: '',
    initiator: data.initiator || undefined,
    isIntercepted: data.isIntercepted,
  };
}

export function buildPlaceholderRequest(
  id: string,
  statusCode: number,
  headers: Record<string, string>,
  timestamp: number,
): NetworkRequestDto {
  const url = (headers?.[':path'] || headers?.['x-original-url'] || '') as string;
  return {
    id,
    method: 'GET',
    url,
    status: statusCode || 200,
    responseHeaders: headers || {},
    timestamp: timestamp || Date.now(),
    type: 'other',
    host: '',
    path: '/',
    protocol: 'http',
    size: '0 B',
    time: '0ms',
    requestHeaders: {},
    responseBody: '',
    requestBody: '',
  };
}

export function buildSslBypassRequest(data: any): NetworkRequestDto {
  const { id, host, port, timestamp, note } = data;
  return {
    id: id || `ssl-bypass-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    url: `https://${host}${port === 443 ? '' : `:${port}`}`,
    protocol: 'https',
    host,
    path: '/',
    method: 'TUNNEL',
    status: 200,
    requestHeaders: {
      'X-SSL-Bypass': 'true',
      'X-Bypass-Note': note || 'TCP tunnel without decryption',
    },
    responseHeaders: { 'X-Connection-Type': 'SSL Bypass', 'X-Decryption': 'Disabled' },
    requestBody: '',
    responseBody: '',
    type: 'other',
    size: '0 B',
    time: '0ms',
    timestamp: timestamp || Date.now(),
  };
}

export function decodeBinaryBody(
  body: string,
  isBinary: boolean,
  label = 'Binary Data',
  maxLen = 1000,
): string {
  if (!isBinary || !body) return body;
  const fallback = `[${label} - Base64 encoded]\n${body.substring(0, maxLen)}...`;
  try {
    const text = Buffer.from(body, 'base64').toString('utf8');
    if (text.includes('\uFFFD') || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
      return fallback;
    }
    return text;
  } catch {
    return `[${label} - Unable to decode]\n${body.substring(0, maxLen)}...`;
  }
}

export function formatElapsedTime(requestTimestamp: number, responseTimestamp: number): string {
  const timeMs = responseTimestamp - requestTimestamp;
  return timeMs >= 1000 ? `${(timeMs / 1000).toFixed(2)}s` : `${timeMs}ms`;
}

export function formatResponseSize(rawSize: string | number | undefined): string {
  let sizeBytes = 0;
  if (typeof rawSize === 'string') {
    const match = rawSize.match(/([\d.]+)\s*(KB|B)/i);
    if (match) {
      const num = parseFloat(match[1]);
      sizeBytes = match[2].toUpperCase() === 'KB' ? num * 1024 : num;
    }
  } else if (typeof rawSize === 'number') {
    sizeBytes = rawSize;
  }
  return sizeBytes > 0 ? `${(sizeBytes / 1024).toFixed(1)} KB` : '0 B';
}