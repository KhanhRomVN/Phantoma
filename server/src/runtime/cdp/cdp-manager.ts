/**
 * ------------------------------------------------------------------
 * CDP Manager (port từ src/main/features/cdp/cdp-manager.ts)
 * ------------------------------------------------------------------
 * Thay điểm chạm Electron: bỏ BrowserWindow/mainWindow; `sendToRenderer`
 * phát event qua runtimeBus để SSE hub đẩy xuống renderer.
 * ------------------------------------------------------------------
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';

import { connectToTarget, initializeNetwork } from './connection';
import {
  handleNetworkEvent,
  handleRequestWillBeSent,
  handleResponseReceived,
  handleLoadingFinished,
  handleLoadingFailed,
  handleWebSocketCreated,
  handleWebSocketHandshakeResponse,
  handleWebSocketFrame,
  handleWebSocketFrameError,
  handleWebSocketClosed,
} from './network-handler';
import { handleScriptParsed } from './script-handler';
import { runtimeBus } from '../event-bus';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CDP');

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
  public isConnected = false;
  public scriptIdMap = new Map<string, string>();
  public requestIdMap = new Map<string, string>();
  public scriptSourceCache = new Map<string, string>();
  private currentPort = 0;

  constructor() {
    super();
    this.connectToTarget = connectToTarget.bind(this);
    this.initializeNetwork = initializeNetwork.bind(this);
    this.handleNetworkEvent = handleNetworkEvent.bind(this);
    this.handleRequestWillBeSent = handleRequestWillBeSent.bind(this);
    this.handleResponseReceived = handleResponseReceived.bind(this);
    this.handleLoadingFinished = handleLoadingFinished.bind(this);
    this.handleLoadingFailed = handleLoadingFailed.bind(this);
    this.handleWebSocketCreated = handleWebSocketCreated.bind(this);
    this.handleWebSocketHandshakeResponse = handleWebSocketHandshakeResponse.bind(this);
    this.handleWebSocketFrame = handleWebSocketFrame.bind(this);
    this.handleWebSocketFrameError = handleWebSocketFrameError.bind(this);
    this.handleWebSocketClosed = handleWebSocketClosed.bind(this);
    this.handleScriptParsed = handleScriptParsed.bind(this);
  }

  public async connect(port: number, retries = 5, delay = 1000): Promise<boolean> {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN && this.currentPort === port) {
      return true;
    }

    this.cleanup();
    this.currentPort = port;

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
        pageTarget = allPageTargets[0];
      }

      if (!pageTarget) {
        const browserTarget = targets.find((t) => t.type === 'browser');
        if (!browserTarget) return false;
        return this.connectToTarget(browserTarget.webSocketDebuggerUrl, retries, delay);
      }

      return this.connectToTarget(pageTarget.webSocketDebuggerUrl, retries, delay);
    } catch (error) {
      logger.error('Error in connect()', { err: String(error) });
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, delay));
        return this.connect(port, retries - 1, delay);
      }
      return false;
    }
  }

  public cleanup(): void {
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new Error('Connection closed'));
      this.pendingRequests.delete(id);
    }

    this.scriptIdMap.clear();
    this.requestIdMap.clear();
    this.scriptSourceCache.clear();

    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch {
        logger.warn('Failed to close WebSocket during cleanup');
      }
      this.ws = null;
    }

    this.isConnected = false;
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

      if (data.method) {
        this.emit(data.method, data.params);
        this.handleNetworkEvent(data.method, data.params);
        if (data.method === 'Debugger.scriptParsed') {
          this.handleScriptParsed(data.params);
        }
      }
    } catch {
      logger.warn('Failed to parse message, silently ignoring');
    }
  }

  public handleNetworkEvent: (method: string, params: any) => void;
  public handleRequestWillBeSent: (params: any) => void;
  public handleResponseReceived: (params: any) => Promise<void>;
  public handleLoadingFinished: (params: any) => Promise<void>;
  public handleLoadingFailed: (params: any) => void;
  public handleWebSocketCreated: (params: any) => void;
  public handleWebSocketHandshakeResponse: (params: any) => void;
  public handleWebSocketFrame: (params: any, direction: 'client' | 'server') => void;
  public handleWebSocketFrameError: (params: any) => void;
  public handleWebSocketClosed: (params: any) => void;
  public handleScriptParsed: (params: any) => void;

  public async navigate(url: string): Promise<boolean> {
    if (!this.isConnected || !this.ws) return false;
    try {
      await this.send('Page.navigate', { url });
      return true;
    } catch {
      logger.warn(`Failed to navigate to: ${url}`);
      return false;
    }
  }

  public async reload(): Promise<boolean> {
    if (!this.isConnected || !this.ws) return false;
    try {
      await this.send('Page.reload', { ignoreCache: true });
      return true;
    } catch {
      logger.warn('Failed to reload page');
      return false;
    }
  }

  public async injectMonitoringBorder(): Promise<boolean> {
    if (!this.isConnected || !this.ws) return false;
    try {
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

      await this.send('Runtime.evaluate', {
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

      return true;
    } catch {
      logger.warn('Failed to inject monitoring border');
      return false;
    }
  }

  public async removeMonitoringBorder(): Promise<boolean> {
    if (!this.isConnected || !this.ws) return false;
    try {
      await this.send('Runtime.evaluate', {
        expression: `
          (function() {
            const style = document.getElementById('phantoma-monitoring-border');
            if (style) {
              style.remove();
            }
            document.documentElement.style.boxShadow = '';
            return 'border removed';
          })();
        `,
      });
      return true;
    } catch {
      logger.warn('Failed to remove monitoring border');
      return false;
    }
  }

  /** Phát event qua runtimeBus (thay webContents.send). */
  public sendToRenderer(channel: string, data: any) {
    runtimeBus.emitEvent(channel, data);
  }
}

export const cdpManager = new CdpManager();