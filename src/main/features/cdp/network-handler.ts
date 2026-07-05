import WebSocket from 'ws';
import { CdpManager } from './cdp-manager';

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
    default:
      break;
  }
}

export function handleRequestWillBeSent(this: CdpManager, params: any) {
  const { requestId, request, initiator, type } = params;

  // Log source-type requests
  const isSource = type === 'Script' || type === 'Stylesheet' || type === 'Document';
  if (isSource) {
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

  // Store mapping: if requestId is hash, try to find numeric version
  if (typeof requestId === 'string' && !requestId.includes('.')) {
    if (response.url) {
      this.requestIdMap.set(`hash:${requestId}`, response.url);
    }
  }

  this.sendToRenderer('cdp:response', {
    id: requestId,
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
      // console.warn(`[CDP:Source] ⚠️ Cannot early-fetch body: WS not connected`);
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
      } catch (e: any) {}
    }, 50);
  }
}

export async function handleLoadingFinished(this: CdpManager, params: any) {
  const { requestId, encodedDataLength, timestamp } = params;

  // Check if WebSocket is still connected before trying to fetch body
  if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
    // console.warn(`[CDP:Source] ⚠️ WS not connected, sending empty body`);
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
  let lastError: any = null;
  let bodyFetched = false;
  let staticSource: string | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
      const result = await this.send('Network.getResponseBody', { requestId });
      const { body, base64Encoded } = result;

      staticSource = body; // Store static source for comparison
      this.sendToRenderer('cdp:response-body', {
        id: requestId,
        body: body,
        isBinary: base64Encoded,
        size: encodedDataLength,
        timestamp: Date.now(),
        loadingTimestamp: timestamp,
      });
      bodyFetched = true;
      break; // Success, exit retry loop
    } catch (e: any) {
      lastError = e;
      if (e.code === -32000 && e.message?.includes('No resource')) {
        break;
      }
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
    } catch (e: any) {}
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
}
