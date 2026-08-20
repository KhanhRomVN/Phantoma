/**
 * ------------------------------------------------------------------
 * Network Event Parser Utility
 * ------------------------------------------------------------------
 * Pure functions xử lý dữ liệu network event (CDP & Proxy). Không có
 * React dependency, không side effect. Dùng chung cho useNetworkEvents
 * và các nơi khác cần parse dữ liệu network thô.
 *
 * Các hàm chính:
 * - parseUrlParts()           : Parse URL thành host + path + protocol
 * - detectTypeFromRequest()   : Nhận diện loại resource từ path/method/URL
 * - buildCdpRequest()         : Build NetworkRequest từ CDP request event
 * - parseProxyRequest()       : Build NetworkRequest từ proxy request event
 * - decodeBinaryBody()        : Giải mã Base64 binary body → UTF-8 string
 * - formatElapsedTime()       : Tính elapsed time (ms) và format string
 * - formatResponseSize()      : Parse raw size → bytes + formatted string
 * - buildPlaceholderRequest() : Tạo placeholder request khi response đến trước
 * ------------------------------------------------------------------
 */

import { NetworkRequest } from '../types/inspector';

// =============================================================================
// ── Constants ──
// =============================================================================

/** Map CDP resourceType → shorthand type string dùng trong UI. */
export const CDP_RESOURCE_TYPE_MAP: Record<string, string> = {
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

// =============================================================================
// URL Parsing
// =============================================================================

/** Parse URL thành host + path + protocol. */
export function parseUrlParts(rawUrl: string): {
  host: string;
  path: string;
  protocol: string;
} {
  if (!rawUrl) return { host: '', path: '', protocol: 'unknown' };

  // Handle data: and blob: URIs — not real network requests
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    const preview = rawUrl.length > 64 ? rawUrl.substring(0, 64) + '...' : rawUrl;
    return { host: '', path: preview, protocol: rawUrl.split(':')[0] || 'unknown' };
  }

  // Normalize media:// scheme — strip prefix to get real URL
  let urlToParse = rawUrl;
  if (urlToParse.startsWith('media://')) {
    urlToParse = urlToParse.replace(/^media:\/\//, '');
    // Fix mangled protocol like https//example.com -> https://example.com
    urlToParse = urlToParse.replace(/^(https?)\/+(?!\/)/, '$1://');
  }

  try {
    const url = new URL(urlToParse);
    return {
      host: url.host,
      path: url.pathname + url.search,
      protocol: url.protocol.replace(':', ''),
    };
  } catch {
    // Fallback: try prepending https://
    try {
      const url = new URL('https://' + urlToParse);
      return {
        host: url.host,
        path: url.pathname + url.search,
        protocol: 'https',
      };
    } catch {
      // Last resort: keep raw URL in path so nothing is lost
      return { host: '', path: rawUrl, protocol: 'unknown' };
    }
  }
}

// =============================================================================
// Type Detection
// =============================================================================

/**
 * Detect resource type từ path + method + URL.
 * Ưu tiên: extension → method heuristic → URL pattern.
 */
export function detectTypeFromRequest(path: string, method: string, url: string): string {
  const pathLower = path.toLowerCase();

  // Extension-based
  if (pathLower.endsWith('.js')) return 'js';
  if (pathLower.endsWith('.css')) return 'css';
  if (pathLower.endsWith('.html') || pathLower.endsWith('.htm')) return 'doc';
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|bmp)$/.test(pathLower)) return 'img';
  if (pathLower.endsWith('.json')) return 'xhr';
  if (/\.(woff|woff2|ttf|otf|eot)$/.test(pathLower)) return 'font';
  if (/\.(mp4|webm|ogg|mp3|wav)$/.test(pathLower)) return 'media';
  if (pathLower.endsWith('.wasm')) return 'wasm';

  // Method heuristic — mutations are likely XHR
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method?.toUpperCase())) return 'xhr';

  // URL pattern
  if (url?.includes('api') || url?.includes('graphql')) return 'xhr';

  return 'other';
}

// =============================================================================
// CDP Request Builder
// =============================================================================

/** Raw CDP request data shape — minimal interface. */
export interface CdpRequestInput {
  id?: string;
  url?: string;
  method?: string;
  resourceType?: string;
  headers?: Record<string, string>;
  requestBody?: string;
  timestamp?: number;
  initiator?: unknown;
}

/**
 * Build NetworkRequest từ CDP request event data.
 * Trả về cả id và timestamp để caller tự quản lý refs.
 */
export function buildCdpRequest(data: CdpRequestInput): {
  request: Partial<NetworkRequest>;
  generatedId: string;
  timestamp: number;
} {
  const { host, path, protocol } = parseUrlParts(data.url || '');
  const type = CDP_RESOURCE_TYPE_MAP[data.resourceType || ''] || 'other';
  const generatedId = data.id || `cdp-${Date.now()}-${Math.random()}`;
  const timestamp = data.timestamp || Date.now();

  const request: Partial<NetworkRequest> = {
    id: generatedId,
    method: data.method || 'GET',
    protocol,
    host,
    path,
    url: data.url || '',
    status: 0,
    type,
    size: '0 B',
    time: '0ms',
    timestamp,
    requestHeaders: data.headers || {},
    responseHeaders: {},
    requestBody: data.requestBody || '',
    responseBody: '',
    initiator: data.initiator ? JSON.stringify(data.initiator) : undefined,
  };

  return { request, generatedId, timestamp };
}

// =============================================================================
// Proxy Request Parser
// =============================================================================

/** Raw proxy request data shape. */
export interface ProxyRequestInput {
  id?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timestamp?: number;
  initiator?: string;
}

/**
 * Parse proxy request event data → NetworkRequest.
 */
export function parseProxyRequest(data: ProxyRequestInput): {
  request: NetworkRequest;
  generatedId: string;
  timestamp: number;
} {
  const { host, path, protocol } = parseUrlParts(data.url || '');
  const type = detectTypeFromRequest(path, data.method || 'GET', data.url || '');
  const generatedId = data.id || `proxy-${Date.now()}-${Math.random()}`;
  const timestamp = data.timestamp || Date.now();

  const request: NetworkRequest = {
    id: generatedId,
    method: data.method || 'GET',
    protocol,
    host,
    path,
    url: data.url || '',
    status: 0,
    type,
    size: '0 B',
    time: '0ms',
    timestamp,
    requestHeaders: data.headers || {},
    responseHeaders: {},
    requestBody: '',
    responseBody: '',
    initiator: data.initiator || undefined,
  };

  return { request, generatedId, timestamp };
}

// =============================================================================
// Binary Body Decoder
// =============================================================================

/**
 * Decode binary body (Base64) thành UTF-8 string.
 * Nếu decode thất bại hoặc chứa control chars → trả về placeholder.
 *
 * @param body      - Raw body string (có thể là base64)
 * @param isBinary  - Flag từ event data
 * @param label     - Nhãn hiển thị khi không decode được (vd: "Binary Data")
 * @param maxLen    - Độ dài tối đa của placeholder (mặc định 1000)
 */
export function decodeBinaryBody(
  body: string,
  isBinary: boolean,
  label: string = 'Binary Data',
  maxLen: number = 1000,
): string {
  if (!isBinary || !body) return body;

  try {
    const decoded = atob(body);
    try {
      const utf8Decoded = decodeURIComponent(escape(decoded));
      // Kiểm tra control characters (trừ newline, tab, carriage return)
      if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(utf8Decoded)) {
        return `[${label} - Base64 encoded]\n${body.substring(0, maxLen)}...`;
      }
      return utf8Decoded;
    } catch {
      return `[${label} - Base64 encoded]\n${body.substring(0, maxLen)}...`;
    }
  } catch {
    return `[${label} - Unable to decode]\n${body.substring(0, maxLen)}...`;
  }
}

// =============================================================================
// Time & Size Formatting
// =============================================================================

/**
 * Tính elapsed time (ms) và format thành string.
 */
export function formatElapsedTime(
  requestTimestamp: number,
  responseTimestamp: number,
): {
  timeMs: number;
  timeStr: string;
} {
  const timeMs = responseTimestamp - requestTimestamp;
  const timeStr = timeMs >= 1000 ? `${(timeMs / 1000).toFixed(2)}s` : `${timeMs}ms`;
  return { timeMs, timeStr };
}

/**
 * Parse raw size (string như "1.5 KB" hoặc number bytes) → bytes + formatted string.
 */
export function formatResponseSize(rawSize: string | number | undefined): {
  sizeBytes: number;
  sizeStr: string;
} {
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

  const sizeStr = sizeBytes > 0 ? `${(sizeBytes / 1024).toFixed(1)} KB` : '0 B';
  return { sizeBytes, sizeStr };
}

// =============================================================================
// Placeholder Request Builder (fallback khi response đến trước request)
// =============================================================================

/**
 * Tạo placeholder NetworkRequest từ response data (khi response đến trước request).
 */
export function buildPlaceholderRequest(
  id: string,
  statusCode: number,
  headers: Record<string, string>,
  timestamp: number,
): NetworkRequest {
  // Thử extract URL từ response headers
  let url = '';
  if (headers && typeof headers === 'object') {
    url = (headers[':path'] || headers['x-original-url'] || '') as string;
  }

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
