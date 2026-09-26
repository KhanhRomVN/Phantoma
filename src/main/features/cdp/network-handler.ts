/**
 * ------------------------------------------------------------------
 * Trình xử lý mạng CDP
 * ------------------------------------------------------------------
 * Xử lý các sự kiện domain Network của CDP và chuyển tiếp chúng đến
 * renderer. Bắt giữ requests, responses, trạng thái tải và
 * truy xuất nguồn script.
 *
 * Hàm chính:
 * - handleNetworkEvent()      : Định tuyến sự kiện mạng theo phương thức
 * - handleRequestWillBeSent() : Chuyển tiếp dữ liệu request đến renderer
 * - handleResponseReceived()  : Chuyển tiếp dữ liệu response và lấy body
 * - handleLoadingFinished()   : Lấy body và nguồn đã giải nén
 * - handleLoadingFailed()     : Chuyển tiếp lỗi tải
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External ──
import WebSocket from 'ws';

// ── Internal ──
import { CdpManager } from './cdp-manager';
import { logger } from '../../utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
export function handleNetworkEvent(this: CdpManager, method: string, params: any) {
  if (!this.mainWindow) {
    return;
  }

  switch (method) {
    case 'Network.requestWillBeSent':
      this.handleRequestWillBeSent(params);
      break;
    case 'Network.responseReceived':
      this.handleResponseReceived(params);
      break;
    case 'Network.loadingFinished':
      this.handleLoadingFinished(params);
      break;
    case 'Network.loadingFailed':
      this.handleLoadingFailed(params);
      break;
    // ── WebSocket events ──
    case 'Network.webSocketCreated':
      this.handleWebSocketCreated(params);
      break;
    case 'Network.webSocketHandshakeResponseReceived':
      this.handleWebSocketHandshakeResponse(params);
      break;
    case 'Network.webSocketFrameSent':
      this.handleWebSocketFrame(params, 'client');
      break;
    case 'Network.webSocketFrameReceived':
      this.handleWebSocketFrame(params, 'server');
      break;
    case 'Network.webSocketFrameError':
      this.handleWebSocketFrameError(params);
      break;
    case 'Network.webSocketClosed':
      this.handleWebSocketClosed(params);
      break;
    default:
      break;
  }
}

export function handleRequestWillBeSent(this: CdpManager, params: any) {
  const { requestId, request, initiator, type } = params;

  if (!this.mainWindow) {
    return;
  }

  // Store URL to scriptId mapping if this is a script
  if (type === 'Script' && request.url) {
    this.scriptIdMap.set(`request:${requestId}`, request.url);
  }

  // Store mapping for requestId if it's a numeric type (for later lookup by hash)
  if (typeof requestId === 'string' && requestId.includes('.')) {
    this.requestIdMap.set(`numeric:${requestId}`, requestId);
  }

  // Build full initiator object with all available data
  let initiatorData: any = null;
  if (initiator) {
    initiatorData = {
      type: initiator.type || 'other',
      url: initiator.url || undefined,
      lineNumber: initiator.lineNumber ?? undefined,
      columnNumber: initiator.columnNumber ?? undefined,
      functionName: initiator.functionName || undefined,
    };

    // Include stack trace if available
    if (initiator.stack && initiator.stack.callFrames) {
      initiatorData.stack = initiator.stack.callFrames.map((frame: any) => ({
        functionName: frame.functionName || '(anonymous)',
        url: frame.url || '',
        lineNumber: frame.lineNumber || 0,
        columnNumber: frame.columnNumber || 0,
      }));
    }
  }

  // Normalize to Phantoma format
  this.sendToRenderer('cdp:request', {
    id: requestId,
    method: request.method,
    url: request.url,
    headers: request.headers,
    timestamp: Date.now(),
    requestBody: request.postData || '',
    initiator: initiatorData,
    resourceType: type || 'Other',
  });
}

export async function handleResponseReceived(this: CdpManager, params: any) {
  const { requestId, response, timestamp } = params;

  if (!this.mainWindow) {
    return;
  }

  // Store mapping: if requestId is hash, try to find numeric version
  if (typeof requestId === 'string' && !requestId.includes('.')) {
    if (response.url) {
      this.requestIdMap.set(`hash:${requestId}`, response.url);
    }
  }

  this.sendToRenderer('cdp:response', {
    id: requestId,
    url: response.url || '',
    statusCode: response.status,
    headers: response.headers,
    mimeType: response.mimeType,
    timestamp: Date.now(),
    responseTimestamp: timestamp,
  });

  // Try to get body early for script and stylesheet resources
  const resourceType = response.resourceType || response.type || '';
  if (resourceType === 'Script' || resourceType === 'Stylesheet' || resourceType === 'Document') {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    setTimeout(async () => {
      try {
        const result = await this.send('Network.getResponseBody', { requestId });
        const { body, base64Encoded } = result;
        if (body && body.length > 0) {
          this.sendToRenderer('cdp:response-body', {
            id: requestId,
            body: body,
            isBinary: base64Encoded,
            size: body.length,
            timestamp: Date.now(),
            loadingTimestamp: timestamp,
          });
        }
      } catch (e: any) {
        // Ignore
        logger.warn(`[CDP] Failed to get response body for ${requestId}:`, e.message);
      }
    }, 50);
  }
}

export async function handleLoadingFinished(this: CdpManager, params: any) {
  const { requestId, encodedDataLength, timestamp } = params;

  // Check if WebSocket is still connected before trying to fetch body
  if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
    this.sendToRenderer('cdp:response-body', {
      id: requestId,
      body: '',
      isBinary: false,
      size: encodedDataLength,
      timestamp: Date.now(),
      loadingTimestamp: timestamp,
    });
    return;
  }

  // Try multiple times to get body with delay
  const maxRetries = 3;
  let bodyFetched = false;
  let staticSource: string | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
      const result = await this.send('Network.getResponseBody', { requestId });
      const { body, base64Encoded } = result;

      staticSource = body;
      this.sendToRenderer('cdp:response-body', {
        id: requestId,
        body: body,
        isBinary: base64Encoded,
        size: encodedDataLength,
        timestamp: Date.now(),
        loadingTimestamp: timestamp,
      });
      bodyFetched = true;
      break;
    } catch (e: any) {
      if (e.code === -32000 && e.message?.includes('No resource')) {
        logger.warn(`[CDP] No resource for ${requestId}, skipping body fetch`);
        break;
      }
      logger.warn(`[CDP] Failed to get response body for ${requestId} (attempt ${attempt + 1}):`, e.message);
    }
  }

  // Now try to get unpacked source from Debugger and compare
  let requestUrl: string | undefined;

  const numericKey = `request:${requestId}`;
  requestUrl = this.scriptIdMap.get(numericKey);

  if (!requestUrl) {
    const hashUrl = this.requestIdMap.get(`hash:${requestId}`);
    if (hashUrl) {
      requestUrl = hashUrl;
    }
  }

  const scriptId = requestUrl ? this.scriptIdMap.get(requestUrl) : undefined;

  if (requestUrl && scriptId) {
    try {
      const result = await this.send('Debugger.getScriptSource', { scriptId });
      if (result && result.scriptSource) {
        const unpackedSource = result.scriptSource;

        // Compare static vs unpacked
        const isDifferent = staticSource && staticSource !== unpackedSource;
        const compressionRatio = staticSource
          ? ((staticSource.length / unpackedSource.length) * 100).toFixed(1) + '%'
          : 'N/A';

        // Send unpacked source with metadata
        this.sendToRenderer('cdp:script-unpacked', {
          requestId,
          url: requestUrl,
          scriptId,
          staticSource,
          unpackedSource,
          isDifferent,
          compressionRatio,
          timestamp: Date.now(),
        });

        // If static body was not fetched, use unpacked as fallback
        if (!bodyFetched) {
          this.sendToRenderer('cdp:response-body', {
            id: requestId,
            body: unpackedSource,
            isBinary: false,
            size: unpackedSource.length,
            timestamp: Date.now(),
            loadingTimestamp: timestamp,
            isUnpacked: true,
          });
          bodyFetched = true;
        }
      }
    } catch (e: any) {
      // Ignore
      logger.warn(`[CDP] Failed to get script source for ${requestId}:`, e.message);
    }
  }

  // If still no body fetched, send empty
  if (!bodyFetched) {
    this.sendToRenderer('cdp:response-body', {
      id: requestId,
      body: '',
      isBinary: false,
      size: encodedDataLength,
      timestamp: Date.now(),
      loadingTimestamp: timestamp,
    });
  }
}

export function handleLoadingFailed(this: CdpManager, params: any) {
  const { requestId, errorText } = params;
  this.sendToRenderer('cdp:error', { id: requestId, error: errorText });
  // Gửi response với status 0 để renderer update request status thành Failed
  this.sendToRenderer('cdp:response', {
    id: requestId,
    url: '',
    statusCode: 0,
    headers: { 'X-Request-Status': 'Failed', 'X-Error': errorText || 'Unknown error' },
    mimeType: '',
    timestamp: Date.now(),
    responseTimestamp: Date.now(),
  });
}

// ─── WebSocket handlers (CDP Network domain) ────────────────────────────
// Map event CDP sang cùng channel `ws:*` mà ProxyServer dùng, để renderer
// (`useNetworkEvents`) xử lý thống nhất cả hai nguồn.
//  - Network.webSocketCreated                   → ws:connect
//  - Network.webSocketHandshakeResponseReceived → ws:update (status='connected')
//  - Network.webSocketFrameSent                 → ws:message (direction='client')
//  - Network.webSocketFrameReceived             → ws:message (direction='server')
//  - Network.webSocketFrameError                → ws:update (status='error')
//  - Network.webSocketClosed                    → ws:close

function makeWsId(requestId: string): string {
  return `ws-${requestId}`;
}

export function handleWebSocketCreated(this: CdpManager, params: any) {
  const { requestId, url } = params;
  if (!this.mainWindow) return;

  let host = '';
  let path = '/';
  let protocol = 'ws';
  try {
    const parsed = new URL(url);
    host = parsed.host;
    path = parsed.pathname + parsed.search;
    protocol = parsed.protocol === 'wss:' ? 'wss' : 'ws';
  } catch {
    // Bỏ qua lỗi parse URL — vẫn giữ giá trị mặc định
  }

  logger.info('[CDP WS] webSocketCreated', { requestId, url });
  this.sendToRenderer('ws:connect', {
    id: makeWsId(requestId),
    url,
    host,
    path,
    protocol,
    status: 'connecting',
    startTime: Date.now(),
    requestHeaders: {},
    responseHeaders: {},
  });
}

export function handleWebSocketHandshakeResponse(this: CdpManager, params: any) {
  const { requestId, response } = params;
  if (!this.mainWindow) return;

  logger.info('[CDP WS] handshakeResponse', { requestId, status: response?.status });
  this.sendToRenderer('ws:update', {
    id: makeWsId(requestId),
    status: 'connected',
    responseHeaders: response?.headers || {},
  });
}

export function handleWebSocketFrame(
  this: CdpManager,
  params: any,
  direction: 'client' | 'server',
) {
  const { requestId, response } = params;
  if (!this.mainWindow) return;

  const opcode = response?.opcode ?? 1;
  const payloadData: string = response?.payloadData ?? '';
  const dataType = opcode === 2 ? 'binary' : 'text';
  const sizeBytes =
    dataType === 'binary'
      ? Math.floor((payloadData.length * 3) / 4)
      : Buffer.byteLength(payloadData, 'utf8');

  this.sendToRenderer('ws:message', {
    id: `ws-msg-${requestId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    connectionId: makeWsId(requestId),
    direction,
    data: payloadData,
    dataType,
    size: sizeBytes,
    timestamp: Date.now(),
  });
}

export function handleWebSocketFrameError(this: CdpManager, params: any) {
  const { requestId, errorMessage } = params;
  if (!this.mainWindow) return;

  logger.warn('[CDP WS] frameError', { requestId, errorMessage });
  this.sendToRenderer('ws:update', {
    id: makeWsId(requestId),
    status: 'error',
  });
}

export function handleWebSocketClosed(this: CdpManager, params: any) {
  const { requestId } = params;
  if (!this.mainWindow) return;

  logger.info('[CDP WS] webSocketClosed', { requestId });
  this.sendToRenderer('ws:close', {
    id: makeWsId(requestId),
    endTime: Date.now(),
    status: 'closed',
  });
}