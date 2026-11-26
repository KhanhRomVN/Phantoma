/**
 * ------------------------------------------------------------------
 * Network Normalizer Service
 * ------------------------------------------------------------------
 * Nhận event thô từ CDP/Proxy, chuẩn hóa (parse URL, type, size, time,
 * decode body, timeout 10s) rồi broadcast 2 kênh gọn cho renderer:
 *   - net:request : NetworkRequest hoàn chỉnh (request mới)
 *   - net:update  : { id, updates } (response / body / timeout)
 * Renderer chỉ cần gọi API/WS và đưa data vào store.
 * ------------------------------------------------------------------
 */

import { wssHub } from './wss-hub.service';
import {
  buildCdpRequest,
  buildProxyRequest,
  buildPlaceholderRequest,
  buildSslBypassRequest,
  decodeBinaryBody,
  formatElapsedTime,
  formatResponseSize,
  type NetworkRequestDto,
} from '../../utils/network-event.util';

const REQUEST_TIMEOUT_MS = 10000;
const MAX_TRACKED = 20000;

interface Tracked {
  timestamp: number;
  status: number;
  timer?: NodeJS.Timeout;
}

export const NORMALIZED_CHANNELS = new Set([
  'cdp:request',
  'cdp:response',
  'cdp:response-body',
  'proxy:request',
  'proxy:request-body',
  'proxy:response',
  'proxy:response-body',
  'proxy:ssl-bypass',
]);

class NetworkNormalizer {
  private tracked = new Map<string, Tracked>();

  private emitRequest(req: NetworkRequestDto): void {
    wssHub.broadcast({ type: 'net:request', data: req });
  }

  private emitUpdate(id: string, updates: Partial<NetworkRequestDto>): void {
    wssHub.broadcast({ type: 'net:update', data: { id, updates } });
  }

  private track(id: string, timestamp: number, withTimeout = false): void {
    if (this.tracked.size >= MAX_TRACKED) {
      const oldest = this.tracked.keys().next().value as string | undefined;
      if (oldest) this.release(oldest);
    }
    const entry: Tracked = { timestamp, status: 0 };
    if (withTimeout) {
      entry.timer = setTimeout(() => {
        const t = this.tracked.get(id);
        if (t && t.status === 0) {
          this.emitUpdate(id, {
            status: 0,
            responseHeaders: { 'X-Request-Status': 'Timeout' },
            time: `${REQUEST_TIMEOUT_MS}ms`,
          });
        }
        if (t) t.timer = undefined;
      }, REQUEST_TIMEOUT_MS);
    }
    this.tracked.set(id, entry);
  }

  private release(id: string): void {
    const t = this.tracked.get(id);
    if (t?.timer) clearTimeout(t.timer);
    this.tracked.delete(id);
  }

  private isSkippable(req: NetworkRequestDto): boolean {
    return req.protocol === 'data' || req.protocol === 'blob' || req.method === 'OPTIONS';
  }

  private onResponse(data: any): void {
    const t = this.tracked.get(data.id);
    if (t?.timer) {
      clearTimeout(t.timer);
      t.timer = undefined;
    }
    if (t) {
      t.status = data.statusCode ?? 200;
      this.emitUpdate(data.id, {
        status: data.statusCode ?? 200,
        responseHeaders: data.headers || {},
      });
      return;
    }
    if (!data.url || data.url.startsWith('data:') || data.url.startsWith('blob:')) return;
    const placeholder = buildPlaceholderRequest(
      data.id,
      data.statusCode,
      data.headers || {},
      data.timestamp || Date.now(),
    );
    this.track(data.id, placeholder.timestamp);
    const entry = this.tracked.get(data.id);
    if (entry) entry.status = placeholder.status;
    this.emitRequest(placeholder);
  }

  private onBody(data: any, body: string, size: string): void {
    const t = this.tracked.get(data.id);
    const time = t ? formatElapsedTime(t.timestamp, data.timestamp || Date.now()) : '0ms';
    this.emitUpdate(data.id, { responseBody: body, size, time });
    this.release(data.id);
  }

  handle(channel: string, data: any): boolean {
    if (!NORMALIZED_CHANNELS.has(channel)) return false;
    try {
      switch (channel) {
        case 'cdp:request': {
          const req = buildCdpRequest(data);
          if (this.isSkippable(req)) break;
          this.track(req.id, req.timestamp);
          this.emitRequest(req);
          break;
        }
        case 'cdp:response':
          this.onResponse(data);
          break;
        case 'cdp:response-body': {
          const body = data.isUnpacked
            ? `/* UNPACKED SOURCE FROM DEBUGGER API */\n${data.body || ''}`
            : data.body || '';
          this.onBody(data, body, formatResponseSize(data.size));
          break;
        }
        case 'proxy:request': {
          const req = buildProxyRequest(data);
          if (this.isSkippable(req)) break;
          this.track(req.id, req.timestamp, true);
          this.emitRequest(req);
          break;
        }
        case 'proxy:request-body':
          if (this.tracked.has(data.id)) {
            this.emitUpdate(data.id, {
              requestBody: decodeBinaryBody(data.body || '', data.isBinary, 'Binary Request Body'),
            });
          }
          break;
        case 'proxy:response':
          this.onResponse(data);
          break;
        case 'proxy:response-body':
          this.onBody(
            data,
            decodeBinaryBody(data.body || '', data.isBinary, 'Binary Data'),
            formatResponseSize(data.size),
          );
          break;
        case 'proxy:ssl-bypass':
          this.emitRequest(buildSslBypassRequest(data));
          break;
      }
    } catch {
      // dữ liệu lỗi từ 1 event không được làm sập luồng realtime
    }
    return true;
  }
}

export const networkNormalizer = new NetworkNormalizer();
