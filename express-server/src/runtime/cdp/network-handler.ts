/**
 * ------------------------------------------------------------------
 * CDP Network Handler (port từ src/main/features/cdp/network-handler.ts)
 * ------------------------------------------------------------------
 * Bỏ guard `mainWindow`; event đi thẳng vào runtimeBus qua sendToRenderer.
 * ------------------------------------------------------------------
 */

import WebSocket from 'ws';
import type { CdpManager } from './cdp-manager';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CDP');

export function handleNetworkEvent(this: CdpManager, method: string, params: any) {
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

  if (type === 'Script' && request.url) {
    this.scriptIdMap.set(`request:${requestId}`, request.url);
  }

  if (typeof requestId === 'string' && requestId.includes('.')) {
    this.requestIdMap.set(`numeric:${requestId}`, requestId);
  }

  let initiatorData: any = null;
  if (initiator) {
    initiatorData = {
      type: initiator.type || 'other',
      url: initiator.url || undefined,
      lineNumber: initiator.lineNumber ?? undefined,
      columnNumber: initiator.columnNumber ?? undefined,
      functionName: initiator.functionName || undefined,
    };

    if (initiator.stack && initiator.stack.callFrames) {
      initiatorData.stack = initiator.stack.callFrames.map((frame: any) => ({
        functionName: frame.functionName || '(anonymous)',
        url: frame.url || '',
        lineNumber: frame.lineNumber || 0,
        columnNumber: frame.columnNumber || 0,
      }));
    }
  }

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
            body,
            isBinary: base64Encoded,
            size: body.length,
            timestamp: Date.now(),
            loadingTimestamp: timestamp,
          });
        }
      } catch (e: any) {
        logger.warn(`Failed to get response body for ${requestId}: ${e.message}`);
      }
    }, 50);
  }
}

export async function handleLoadingFinished(this: CdpManager, params: any) {
  const { requestId, encodedDataLength, timestamp } = params;

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
        body,
        isBinary: base64Encoded,
        size: encodedDataLength,
        timestamp: Date.now(),
        loadingTimestamp: timestamp,
      });
      bodyFetched = true;
      break;
    } catch (e: any) {
      if (e.code === -32000 && e.message?.includes('No resource')) {
        logger.warn(`No resource for ${requestId}, skipping body fetch`);
        break;
      }
      logger.warn(`Failed to get response body for ${requestId} (attempt ${attempt + 1}): ${e.message}`);
    }
  }

  let requestUrl: string | undefined;
  requestUrl = this.scriptIdMap.get(`request:${requestId}`);

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
        const isDifferent = staticSource && staticSource !== unpackedSource;
        const compressionRatio = staticSource
          ? ((staticSource.length / unpackedSource.length) * 100).toFixed(1) + '%'
          : 'N/A';

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
      logger.warn(`Failed to get script source for ${requestId}: ${e.message}`);
    }
  }

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

function makeWsId(requestId: string): string {
  return `ws-${requestId}`;
}

export function handleWebSocketCreated(this: CdpManager, params: any) {
  const { requestId, url } = params;

  let host = '';
  let path = '/';
  let protocol = 'ws';
  try {
    const parsed = new URL(url);
    host = parsed.host;
    path = parsed.pathname + parsed.search;
    protocol = parsed.protocol === 'wss:' ? 'wss' : 'ws';
  } catch {
    // ignore parse error
  }

  logger.info('webSocketCreated', { requestId, url });
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
  logger.info('handshakeResponse', { requestId, status: response?.status });
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
  logger.warn('frameError', { requestId, errorMessage });
  this.sendToRenderer('ws:update', {
    id: makeWsId(requestId),
    status: 'error',
  });
}

export function handleWebSocketClosed(this: CdpManager, params: any) {
  const { requestId } = params;
  logger.info('webSocketClosed', { requestId });
  this.sendToRenderer('ws:close', {
    id: makeWsId(requestId),
    endTime: Date.now(),
    status: 'closed',
  });
}