import WebSocket from 'ws';
import { CdpManager } from './cdp-manager';

export function handleNetworkEvent(this: CdpManager, method: string, params: any) {
  if (!this.mainWindow) {
    console.warn('[CDP] No mainWindow set, dropping event:', method);
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
  const { requestId, request, initiator, type, loaderId } = params;

  // Log source-type requests
  const isSource = type === 'Script' || type === 'Stylesheet' || type === 'Document';
  if (isSource) {
    const shortUrl = request.url.length > 120 ? request.url.substring(0, 117) + '...' : request.url;
    console.log(`[CDP:Source] 📄 REQUEST [${type}] ${shortUrl}`);
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
    const shortUrl = (response.url || '').length > 120
      ? (response.url || '').substring(0, 117) + '...'
      : (response.url || '');
    console.log(
      `[CDP:Source] ⬇ RESPONSE [${resourceType}] status=${response.status} size=${response.encodedDataLength || '?'} ${shortUrl}`,
    );

    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[CDP:Source] ⚠️ Cannot early-fetch body: WS not connected`);
      return;
    }

    setTimeout(async () => {
      try {
        const result = await this.send('Network.getResponseBody', { requestId });
        const { body, base64Encoded } = result;
        if (body && body.length > 0) {
          console.log(
            `[CDP:Source] ✅ EARLY-BODY [${resourceType}] ${body.length} bytes (base64=${base64Encoded})`,
          );
          this.sendToRenderer('cdp:response-body', {
            id: requestId,
            body: body,
            isBinary: base64Encoded,
            size: body.length,
            timestamp: Date.now(),
            loadingTimestamp: timestamp,
          });
        } else {
          console.log(`[CDP:Source] ⚠️ EARLY-BODY [${resourceType}] body empty, will retry in loadingFinished`);
        }
      } catch (e: any) {
        console.log(
          `[CDP:Source] ⚠️ EARLY-BODY [${resourceType}] failed: ${e?.message || e}, will retry in loadingFinished`,
        );
      }
    }, 50);
  }
}

export async function handleLoadingFinished(this: CdpManager, params: any) {
  const { requestId, encodedDataLength, timestamp } = params;

  console.log(`[CDP:Source] 🏁 LOADING-FINISHED requestId=${requestId} encodedSize=${encodedDataLength}`);

  // Check if WebSocket is still connected before trying to fetch body
  if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
    console.warn(`[CDP:Source] ⚠️ WS not connected, sending empty body`);
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

      console.log(
        `[CDP:Source] ✅ BODY attempt=${attempt + 1} requestId=${requestId} size=${body?.length || 0} base64=${base64Encoded}`,
      );
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
      console.log(
        `[CDP:Source] ⚠️ BODY attempt=${attempt + 1} failed: ${e?.message || e}`,
      );
      if (e.code === -32000 && e.message?.includes('No resource')) {
        console.log(`[CDP:Source] ⚠️ No resource available, stopping retries`);
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
        
        console.log(
          `[CDP:Source] ✅ DEBUGGER-SOURCE success: ${unpackedSource.length} bytes`,
        );

        // Compare static vs unpacked
        const isDifferent = staticSource && staticSource !== unpackedSource;
        const compressionRatio = staticSource 
          ? ((staticSource.length / unpackedSource.length) * 100).toFixed(1) + '%'
          : 'N/A';

        if (isDifferent) {
          console.log(
            `[CDP:Source] 🔍 UNPACKED differs from static! Static: ${staticSource?.length || 0}b, Unpacked: ${unpackedSource.length}b (${compressionRatio})`
          );
        }

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
          console.log(`[CDP:Source] 🔄 Using unpacked source as fallback body`);
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
      console.log(
        `[CDP:Source] ⚠️ DEBUGGER-SOURCE failed: ${e?.message || e}`,
      );
    }
  } else {
    if (requestUrl) {
      console.log(
        `[CDP:Source] ⚠️ No scriptId mapping for url=${requestUrl}, cannot get unpacked source`,
      );
    }
  }

  // If still no body fetched, send empty
  if (!bodyFetched) {
    console.log(`[CDP:Source] ❌ BODY-FAILED requestId=${requestId} — sending empty`);
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
  const { requestId, errorText, type } = params;
  const resourceType = type || '?';
  console.log(
    `[CDP:Source] ❌ LOADING-FAILED [${resourceType}] requestId=${requestId} error=${errorText}`,
  );
  this.sendToRenderer('cdp:error', { id: requestId, error: errorText });
}