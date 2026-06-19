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

  constructor() {
    super();
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  public async connect(port: number, retries = 5, delay = 1000): Promise<boolean> {
    console.log(`[CDP] Connecting to localhost:${port}... (Retries left: ${retries})`);

    try {
      // First, get the list of targets (pages)
      const targetsResponse = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (!targetsResponse.ok) throw new Error(`HTTP ${targetsResponse.status} from /json/list`);

      const targets = (await targetsResponse.json()) as any[];
      console.log(`[CDP] Found ${targets.length} targets`);

      // Find a page target (type: 'page') - prefer targets that are NOT Phantoma
      // Phantoma's main window has title containing "Phantoma" or URL containing localhost:5173
      // We want to connect to the browser page (e.g., DeepSeek) not Phantoma itself
      const allPageTargets = targets.filter((t) => t.type === 'page');
      console.log(`[CDP] Found ${allPageTargets.length} page targets`);
      
      // Log all page targets for debugging
      allPageTargets.forEach((t, i) => {
        console.log(`[CDP] Page target ${i + 1}: id=${t.id}, title="${t.title || 'untitled'}", url="${t.url || 'unknown'}"`);
      });
      
      // Prefer targets that are NOT Phantoma
      let pageTarget = allPageTargets.find(
        (t) => 
          t.title && 
          !t.title.toLowerCase().includes('phantoma') &&
          t.url && 
          !t.url.includes('localhost:5173')
      );
      
      // If no suitable target found, fallback to any page target
      if (!pageTarget && allPageTargets.length > 0) {
        console.warn('[CDP] No non-Phantoma page target found, using first available page target');
        pageTarget = allPageTargets[0];
      }
      
      if (!pageTarget) {
        console.warn('[CDP] No page target found, waiting for a page to open...');
        // If no page, we need to wait or try the browser target
        // Fallback: use the browser target if available
        const browserTarget = targets.find((t) => t.type === 'browser');
        if (!browserTarget) {
          console.error('[CDP] No targets found');
          return false;
        }
        console.log(`[CDP] Using browser target: ${browserTarget.id}`);
        return this.connectToTarget(browserTarget.webSocketDebuggerUrl, retries, delay);
      }

      console.log(`[CDP] Selected page target: ${pageTarget.id} - ${pageTarget.title || 'untitled'} (url: ${pageTarget.url || 'unknown'})`);
      return this.connectToTarget(pageTarget.webSocketDebuggerUrl, retries, delay);
    } catch (error) {
      console.error('[CDP] Failed to get targets:', error);
      if (retries > 0) {
        console.log(`[CDP] Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        return this.connect(port, retries - 1, delay);
      }
      return false;
    }
  }

  private async connectToTarget(wsUrl: string, retries = 5, delay = 1000): Promise<boolean> {
    console.log(`[CDP] Connecting to target WebSocket: ${wsUrl}`);

    return new Promise((resolve) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', async () => {
        console.log('[CDP] Connected to target WebSocket');
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
        console.log('[CDP] Disconnected from target');
        this.isConnected = false;
        this.ws = null;
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.isConnected) {
          console.warn('[CDP] Connection timeout');
          resolve(false);
        }
      }, 10000);
    });
  }

  private async initializeNetwork() {
    console.log('[CDP] Initializing network domain...');
    
    // Enable Page domain first (required for network events in some cases)
    try {
      await this.send('Page.enable', {});
      console.log('[CDP] Page domain enabled');
    } catch (e) {
      console.log('[CDP] Page.enable not supported, continuing...');
    }

    // Enable Runtime domain
    try {
      await this.send('Runtime.enable', {});
    } catch (e) {
      // Ignore
    }

    // Enable network domain with interception for full request capture
    try {
      const result = await this.send('Network.enable', {
        maxTotalBufferSize: 10000000,
        maxResourceBufferSize: 5000000,
        maxPostDataSize: 5000000,
      });
      console.log('[CDP] Network domain enabled');
    } catch (e) {
      console.error('[CDP] Failed to enable network:', e);
    }
    
    // Set accepted encodings for better response handling
    try {
      await this.send('Network.setAcceptedEncodings', {
        encodings: ['gzip', 'br', 'deflate']
      });
      console.log('[CDP] Accepted encodings set');
    } catch (e) {
      console.log('[CDP] setAcceptedEncodings not supported, continuing...');
    }
    
    // Try to ensure we get all request events
    try {
      // This helps ensure requestWillBeSent events are sent
      await this.send('Network.setBypassServiceWorker', { bypass: true });
      console.log('[CDP] Service worker bypass set');
    } catch (e) {
      console.log('[CDP] setBypassServiceWorker not supported, continuing...');
    }

    // NOTE: Request interception is DISABLED because it blocks all requests
    // and requires calling continueInterceptedRequest for each request.
    // Network.enable alone is sufficient to capture requestWillBeSent events.
    // Body capture is done via Network.getResponseBody in loadingFinished.
    console.log('[CDP] Request interception disabled (not needed for monitoring)');

    
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
        if (data.error) reject(data.error);
        else resolve(data.result);
        return;
      }

      // Handle Events
      if (data.method) {
        this.emit(data.method, data.params);
        this.handleNetworkEvent(data.method, data.params);
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

  private handleRequestWillBeSent(params: any) {
    const { requestId, request, initiator, type } = params;

    // Normalize to Phantoma format
    this.sendToRenderer('cdp:request', {
      id: requestId, // CDP RequestId matches across events
      method: request.method,
      url: request.url,
      headers: request.headers,
      timestamp: Date.now(), // Approximate, strictly we should map monotonic time
      requestBody: request.postData || '',
      initiator: initiator?.type,
      resourceType: type || 'Other', // Document, XHR, Fetch, Script, Stylesheet, Image, Media, Font, WebSocket, Other
    });
  }

  private handleResponseReceived(params: any) {
    const { requestId, response, timestamp } = params;

    this.sendToRenderer('cdp:response', {
      id: requestId,
      statusCode: response.status,
      headers: response.headers,
      mimeType: response.mimeType,
      timestamp: Date.now(),
      responseTimestamp: timestamp, // CDP monotonic time
    });
  }

  private async handleLoadingFinished(params: any) {
    const { requestId, encodedDataLength, timestamp } = params;

    try {
      // Fetch body
      const result = await this.send('Network.getResponseBody', { requestId });
      const { body, base64Encoded } = result;

      this.sendToRenderer('cdp:response-body', {
        id: requestId,
        body: body, // Ensure frontend handles base64 if base64Encoded is true
        isBinary: base64Encoded,
        size: encodedDataLength, // Approximate
        timestamp: Date.now(),
        loadingTimestamp: timestamp,
      });
    } catch (e) {
      console.error(`[CDP] Failed to get body for ${requestId}:`, e);
      // Still send size even if body fetch fails
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
      console.log(`[CDP] Navigating to: ${url}`);
      const result = await this.send('Page.navigate', { url });
      console.log('[CDP] Navigation result:', result);
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
      console.log('[CDP] Reloading page...');
      await this.send('Page.reload', { ignoreCache: true });
      console.log('[CDP] Reload successful');
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
