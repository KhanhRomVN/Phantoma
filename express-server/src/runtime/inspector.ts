/**
 * ------------------------------------------------------------------
 * Inspector Request Handler (port từ src/main/features/inspector.ts)
 * ------------------------------------------------------------------
 * Thay electron.net.fetch → fetch native của Node 20.
 * ------------------------------------------------------------------
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('Inspector');

export interface InspectorRequestPayload {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface InspectorResponsePayload {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  time?: number;
  size?: number;
  error?: string;
}

export async function handleInspectorRequest(
  payload: InspectorRequestPayload,
): Promise<InspectorResponsePayload> {
  const { url, method, headers, body } = payload;
  const startTime = Date.now();

  try {
    const unsafeHeaders = [
      'host',
      'connection',
      'content-length',
      'upgrade-insecure-requests',
      'accept-encoding',
    ];

    const sanitizedHeaders: Record<string, string> = {};
    if (headers) {
      Object.entries(headers).forEach(([k, v]) => {
        const lowerKey = k.toLowerCase();
        if (unsafeHeaders.includes(lowerKey)) return;
        if (v !== undefined && v !== null) {
          sanitizedHeaders[k] = String(v);
        }
      });
    }

    const response = await fetch(url, {
      method,
      headers: sanitizedHeaders,
      body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
    });

    const endTime = Date.now();
    const responseBody = await response.text();

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      time: endTime - startTime,
      headers: responseHeaders,
      body: responseBody,
      size: Buffer.byteLength(responseBody, 'utf8'),
    };
  } catch (error: any) {
    logger.error('Request failed', { err: error?.message ?? String(error) });
    return {
      error: error.message || 'Unknown error occurred',
    };
  }
}