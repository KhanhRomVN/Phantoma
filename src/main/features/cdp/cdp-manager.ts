import WebSocket from 'ws';
import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import { connectToTarget, initializeNetwork } from './connection';
import {
  handleNetworkEvent,
  handleRequestWillBeSent,
  handleResponseReceived,
  handleLoadingFinished,
  handleLoadingFailed,
} from './network-handler';
import { handleScriptParsed } from './script-handler';

interface CdpRequest {
  id: number;
  method: string;
  params?: any;
}

export class CdpManager extends EventEmitter {
  public ws: WebSocket | null = null;
  public requestId = 0;
  public pendingRequests = new Map<
    number,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  public mainWindow: BrowserWindow | null = null;
  public isConnected = false;
  public scriptIdMap = new Map<string, string>(); // requestId -> scriptId
  public requestIdMap = new Map<string, string>(); // hash requestId -> numeric requestId

  constructor() {
    super();
    // Bind methods
    this.connectToTarget = connectToTarget.bind(this);
    this.initializeNetwork = initializeNetwork.bind(this);
    this.handleNetworkEvent = handleNetworkEvent.bind(this);
    this.handleRequestWillBeSent = handleRequestWillBeSent.bind(this);
    this.handleResponseReceived = handleResponseReceived.bind(this);
    this.handleLoadingFinished = handleLoadingFinished.bind(this);
    this.handleLoadingFailed = handleLoadingFailed.bind(this);
    this.handleScriptParsed = handleScriptParsed.bind(this);
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
          !t.url.includes('localhost:5173'),
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
        console.log('[CDP] No page target found, connecting to browser target:', browserTarget.url || 'unknown');
        return this.connectToTarget(browserTarget.webSocketDebuggerUrl, retries, delay);
      }

      console.log('[CDP] Selected page target - URL:', pageTarget.url, ', Title:', pageTarget.title);
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

  public connectToTarget: (wsUrl: string, retries?: number, delay?: number) => Promise<boolean>;
  public initializeNetwork: () => Promise<void>;

  public send(method: string, params: any = {}): Promise<any> {
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

  public handleMessage(message: string) {
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

  public handleNetworkEvent: (method: string, params: any) => void;
  public handleRequestWillBeSent: (params: any) => void;
  public handleResponseReceived: (params: any) => Promise<void>;
  public handleLoadingFinished: (params: any) => Promise<void>;
  public handleLoadingFailed: (params: any) => void;
  public handleScriptParsed: (params: any) => void;

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

  public async injectMonitoringBorder(): Promise<boolean> {
    console.log('[CDP] injectMonitoringBorder called - checking connection...');
    if (!this.isConnected || !this.ws) {
      console.warn('[CDP] Cannot inject border: not connected (isConnected:', this.isConnected, ', ws:', !!this.ws, ')');
      return false;
    }
    console.log('[CDP] Connection OK, preparing CSS injection...');
    try {
      // Inject overlay border on top of everything
      const css = `
        html::after {
          content: '' !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          pointer-events: none !important;
          border: 4px solid rgba(255, 107, 107, 0.8) !important;
          z-index: 999999 !important;
          box-sizing: border-box !important;
        }
      `;
      
      console.log('[CDP] CSS content to inject:', css.trim().replace(/\s+/g, ' '));
      console.log('[CDP] Sending Page.addScriptToEvaluateOnNewDocument...');
      await this.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `
          (function() {
            const style = document.createElement('style');
            style.id = 'phantoma-monitoring-border';
            style.textContent = ${JSON.stringify(css)};
            if (document.head) {
              document.head.appendChild(style);
            } else {
              document.addEventListener('DOMContentLoaded', () => {
                document.head.appendChild(style);
              });
            }
          })();
        `,
      });
      console.log('[CDP] Page.addScriptToEvaluateOnNewDocument completed successfully');
      
      // Also inject into current page
      console.log('[CDP] Sending Runtime.evaluate for current page...');
      const result = await this.send('Runtime.evaluate', {
        expression: `
          (function() {
            const existing = document.getElementById('phantoma-monitoring-border');
            if (existing) existing.remove();
            
            const style = document.createElement('style');
            style.id = 'phantoma-monitoring-border';
            style.textContent = ${JSON.stringify(css)};
            document.head.appendChild(style);
            
            return 'style injected';
          })();
        `,
      });
      console.log('[CDP] Runtime.evaluate completed with result:', result);
      
      // Verification - check if style was actually applied
      console.log('[CDP] Verifying injection...');
      const verifyResult = await this.send('Runtime.evaluate', {
        expression: `
          (function() {
            const style = document.getElementById('phantoma-monitoring-border');
            const url = window.location.href;
            const htmlBoxShadow = getComputedStyle(document.documentElement).boxShadow;
            const result = {
              styleExists: !!style,
              styleContent: style ? style.textContent : null,
              pageUrl: url,
              htmlBoxShadow: htmlBoxShadow,
              headExists: !!document.head
            };
            return JSON.stringify(result);
          })();
        `
      });
      console.log('[CDP] Verification result:', verifyResult);
      
      // Get current page URL separately for clarity
      const urlResult = await this.send('Runtime.evaluate', {
        expression: 'window.location.href'
      });
      console.log('[CDP] Current page URL:', urlResult);
      
      console.log('[CDP] ✅ Monitoring border injected successfully');
      return true;
    } catch (e) {
      console.error('[CDP] ❌ Failed to inject monitoring border:', e);
      if (e instanceof Error) {
        console.error('[CDP] Error details - name:', e.name, ', message:', e.message, ', stack:', e.stack);
      }
      return false;
    }
  }

  public async removeMonitoringBorder(): Promise<boolean> {
    console.log('[CDP] removeMonitoringBorder called - checking connection...');
    if (!this.isConnected || !this.ws) {
      console.warn('[CDP] Cannot remove border: not connected (isConnected:', this.isConnected, ', ws:', !!this.ws, ')');
      return false;
    }
    console.log('[CDP] Connection OK, removing monitoring border...');
    try {
      const result = await this.send('Runtime.evaluate', {
        expression: `
          (function() {
            const style = document.getElementById('phantoma-monitoring-border');
            if (style) {
              style.remove();
              console.log('[CDP] Style element removed from page');
            } else {
              console.log('[CDP] No style element found with id phantoma-monitoring-border');
            }
            document.documentElement.style.boxShadow = '';
            return 'border removed';
          })();
        `,
      });
      console.log('[CDP] Runtime.evaluate result:', result);
      console.log('[CDP] ✅ Monitoring border removed successfully');
      return true;
    } catch (e) {
      console.error('[CDP] ❌ Failed to remove monitoring border:', e);
      if (e instanceof Error) {
        console.error('[CDP] Error details - name:', e.name, ', message:', e.message, ', stack:', e.stack);
      }
      return false;
    }
  }

  public sendToRenderer(channel: string, data: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    } else {
      console.warn(`[CDP] Cannot send ${channel}: mainWindow not available`);
    }
  }
}

export const cdpManager = new CdpManager();