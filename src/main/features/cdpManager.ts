import WebSocket from 'ws';
import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

interface CdpRequest {
  id: number;
  method: string;
  params?: any;
}

export class CdpManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  private mainWindow: BrowserWindow | null = null;
  private isConnected = false;
  private scriptIdMap = new Map<string, string>(); // requestId -> scriptId
  private requestIdMap = new Map<string, string>(); // hash requestId -> numeric requestId

  constructor() {
    super();
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

public async connect(port: number, retries = 5, delay = 1000): Promise<boolean> {
    try {
      const targetsResponse = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (!targetsResponse.ok) throw new Error(`HTTP ${targetsResponse.status} from /json/list`);

      const targets = (await targetsResponse.json()) as any[];
      const allPageTargets = targets.filter((t) => t.type === 'page');
      
      let pageTarget = allPageTargets.find(
        (t) => 
          t.title && 
          !t.title.toLowerCase().includes('phantoma') &&
          t.url && 
          !t.url.includes('localhost:5173')
      );
      
      if (!pageTarget && allPageTargets.length > 0) {
        console.warn('[CDP] No non-Phantoma page target found, using first available page target');
        pageTarget = allPageTargets[0];
      }
      
      if (!pageTarget) {
        const browserTarget = targets.find((t) => t.type === 'browser');
        if (!browserTarget) {
          console.error('[CDP] No targets found');
          return false;
        }
        return this.connectToTarget(browserTarget.webSocketDebuggerUrl, retries, delay);
      }

      return this.connectToTarget(pageTarget.webSocketDebuggerUrl, retries, delay);
    } catch (error) {
      console.error('[CDP] Failed to get targets:', error);
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, delay));
        return this.connect(port, retries - 1, delay);
      }
      return false;
    }
  }
  private async connectToTarget(wsUrl: string, retries = 5, delay = 1000): Promise<boolean> {
    return new Promise((resolve) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', async () => {
        this.isConnected = true;
        try {
          await this.initializeNetwork();
          resolve(true);
        } catch (err) {
          console.error('[CDP] Failed to initialize network:', err);
          resolve(false);
        }
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('error', (err) => {
        console.error('[CDP] WebSocket error:', err);
        if (!this.isConnected) resolve(false);
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        this.ws = null;
      });

      setTimeout(() => {
        if (!this.isConnected) {
          console.warn('[CDP] Connection timeout');
          resolve(false);
        }
      }, 10000);
    });
  }

private async initializeNetwork() {
    try {
      await this.send('Page.enable', {});
    } catch (e) {
      // Ignore
    }

    try {
      await this.send('Debugger.enable', {});
    } catch (e) {
      // Ignore
    }

    try {
      await this.send('Runtime.enable', {});
    } catch (e) {
      // Ignore
    }

    try {
      await this.send('Network.enable', {
        maxTotalBufferSize: 10000000,
        maxResourceBufferSize: 5000000,
        maxPostDataSize: 5000000,
      });
    } catch (e) {
      console.error('[CDP] Failed to enable network:', e);
    }
    
    try {
      await this.send('Network.setAcceptedEncodings', {
        encodings: ['gzip', 'br', 'deflate']
      });
    } catch (e) {
      // Ignore
    }
    
    try {
      await this.send('Network.setBypassServiceWorker', { bypass: true });
    } catch (e) {
      // Ignore
    }
  }
  private send(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket not connected'));
      }

      const id = ++this.requestId;
      this.pendingRequests.set(id, { resolve, reject });

      const request: CdpRequest = { id, method, params };
      this.ws.send(JSON.stringify(request));
    });
  }

  private handleMessage(message: string) {
    try {
      const data = JSON.parse(message);

      // Handle Command Response
      if (data.id && this.pendingRequests.has(data.id)) {
        const { resolve, reject } = this.pendingRequests.get(data.id)!;
        this.pendingRequests.delete(data.id);
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data.result);
        }
        return;
      }

      // Handle Events
      if (data.method) {
        this.emit(data.method, data.params);
        this.handleNetworkEvent(data.method, data.params);
        // Handle Debugger.scriptParsed to map scriptId to requestId
        if (data.method === 'Debugger.scriptParsed') {
          this.handleScriptParsed(data.params);
        }
      }
    } catch (e) {
      console.error('[CDP] Error handling message:', e);
    }
  }

  private handleNetworkEvent(method: string, params: any) {
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

  private handleScriptParsed(params: any) {
    const { scriptId, url, embedderName } = params;
    if (url) {
      this.scriptIdMap.set(url, scriptId);
    }
  }

  private handleRequestWillBeSent(params: any) {
    const { requestId, request, initiator, type, loaderId } = params;

    // Store URL to scriptId mapping if this is a script
    if (type === 'Script' && request.url) {
      this.scriptIdMap.set(`request:${requestId}`, request.url);
    }

    // Store mapping for requestId if it's a numeric type (for later lookup by hash)
    if (typeof requestId === 'string' && requestId.includes('.')) {
      this.requestIdMap.set(`numeric:${requestId}`, requestId);
    }

    // Debug: Log raw initiator from CDP
    if (initiator) {
      console.log('[CDP] 🔍 Raw initiator:', JSON.stringify(initiator, null, 2));
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
        console.log('[CDP] 📚 Stack frames:', initiatorData.stack.length);
      }

      console.log('[CDP] 📤 Sending initiator to renderer:', {
        type: initiatorData.type,
        url: initiatorData.url,
        hasStack: !!initiatorData.stack,
        stackLength: initiatorData.stack?.length || 0,
      });
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

  private async handleResponseReceived(params: any) {
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
        } catch (e) {
          // Silent fail - will retry in loadingFinished
        }
      }, 50);
    }
  }

  private async handleLoadingFinished(params: any) {
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
    let lastError: any = null;
    let bodyFetched = false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
        }
        const result = await this.send('Network.getResponseBody', { requestId });
        const { body, base64Encoded } = result;

        this.sendToRenderer('cdp:response-body', {
          id: requestId,
          body: body,
          isBinary: base64Encoded,
          size: encodedDataLength,
          timestamp: Date.now(),
          loadingTimestamp: timestamp,
        });
        bodyFetched = true;
        return;
      } catch (e: any) {
        lastError = e;
        if (e.code === -32000 && e.message?.includes('No resource')) {
          break;
        }
      }
    }

    // If Network.getResponseBody failed, try Debugger.getScriptSource for scripts ONLY
    if (!bodyFetched) {
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
            this.sendToRenderer('cdp:response-body', {
              id: requestId,
              body: result.scriptSource,
              isBinary: false,
              size: result.scriptSource.length,
              timestamp: Date.now(),
              loadingTimestamp: timestamp,
            });
            return;
          }
        } catch (e) {
          // Silent fail
        }
      }
    }

    this.sendToRenderer('cdp:response-body', {
      id: requestId,
      body: '',
      isBinary: false,
      size: encodedDataLength,
      timestamp: Date.now(),
      loadingTimestamp: timestamp,
    });
  }

  private handleLoadingFailed(params: any) {
    const { requestId, errorText } = params;
    this.sendToRenderer('cdp:error', { id: requestId, error: errorText });
  }

  public async navigate(url: string): Promise<boolean> {
    if (!this.isConnected || !this.ws) {
      console.warn('[CDP] Cannot navigate: not connected');
      return false;
    }
    try {
      await this.send('Page.navigate', { url });
      return true;
    } catch (e) {
      console.error('[CDP] Navigation failed:', e);
      return false;
    }
  }

  public async reload(): Promise<boolean> {
    if (!this.isConnected || !this.ws) {
      console.warn('[CDP] Cannot reload: not connected');
      return false;
    }
    try {
      await this.send('Page.reload', { ignoreCache: true });
      return true;
    } catch (e) {
      console.error('[CDP] Reload failed:', e);
      return false;
    }
  }

  private sendToRenderer(channel: string, data: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    } else {
      console.warn(`[CDP] Cannot send ${channel}: mainWindow not available`);
    }
  }
}

export const cdpManager = new CdpManager();
