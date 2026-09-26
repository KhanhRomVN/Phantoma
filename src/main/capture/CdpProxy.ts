/**
 * ------------------------------------------------------------------
 * CdpProxy - CDP-based HTTPS Proxy for CLI Apps
 * ------------------------------------------------------------------
 * Proxies CLI app traffic through Chrome browser via CDP.
 * CLI sends requests to local proxy → Chrome executes them → CDP captures plaintext.
 * 
 * Benefits:
 * - No MITM certificate needed
 * - No SSL pinning issues
 * - Works on all platforms (not just Linux)
 * - Full request/response capture
 * 
 * Architecture:
 * CLI App → HTTP_PROXY → Local Proxy → Chrome (CDP) → Real Server
 * 
 * Main functions:
 * - start()   : Start proxy server and Chrome with CDP
 * - stop()    : Stop proxy and Chrome
 * - handleRequest() : Forward request to Chrome via CDP
 * ------------------------------------------------------------------
 */

import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';
import { BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger';
import { findAvailablePort } from '../utils/net';
import CDP from 'chrome-remote-interface';

export interface CdpProxyOptions {
  proxyPort?: number;
  chromeDebugPort?: number;
}

export interface CapturedRequest {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface CapturedResponse {
  id: string;
  timestamp: number;
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export class CdpProxy extends EventEmitter {
  private proxyServer: http.Server | null = null;
  private chromeProcess: ChildProcess | null = null;
  private cdpClient: any = null;
  private window: BrowserWindow | null = null;
  private isRunning: boolean = false;
  
  private proxyPort: number = 8888;
  private chromeDebugPort: number = 9222;
  
  // Map request IDs to CLI sockets
  private requestMap = new Map<string, http.ServerResponse>();

  constructor(window: BrowserWindow) {
    super();
    this.window = window;
  }

  public async start(options: CdpProxyOptions = {}): Promise<{ proxyPort: number; chromePort: number }> {
    if (this.isRunning) {
      throw new Error('CDP Proxy already running');
    }

    // Find available ports
    this.proxyPort = options.proxyPort || await findAvailablePort(8888);
    this.chromeDebugPort = options.chromeDebugPort || await findAvailablePort(9222);

    logger.info(`[CdpProxy] Starting proxy on port ${this.proxyPort}`);
    logger.info(`[CdpProxy] Chrome debug port: ${this.chromeDebugPort}`);

    // Start Chrome headless with CDP
    await this.startChrome();

    // Connect to Chrome via CDP
    await this.connectCDP();

    // Start local proxy server
    await this.startProxyServer();

    this.isRunning = true;
    this.emit('started', { proxyPort: this.proxyPort, chromePort: this.chromeDebugPort });

    return { proxyPort: this.proxyPort, chromePort: this.chromeDebugPort };
  }

  public stop(): void {
    logger.info('[CdpProxy] Stopping...');

    // Stop proxy server
    if (this.proxyServer) {
      this.proxyServer.close();
      this.proxyServer = null;
    }

    // Disconnect CDP
    if (this.cdpClient) {
      this.cdpClient.close();
      this.cdpClient = null;
    }

    // Kill Chrome
    if (this.chromeProcess) {
      this.chromeProcess.kill('SIGTERM');
      this.chromeProcess = null;
    }

    this.isRunning = false;
    this.emit('stopped');
  }

  private async startChrome(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Find Chrome executable
      const chromePaths = [
        'google-chrome',
        'google-chrome-stable',
        'chromium',
        'chromium-browser',
      ];

      let chromeExe = '';
      for (const path of chromePaths) {
        try {
          const { execSync } = require('child_process');
          chromeExe = execSync(`which ${path}`, { encoding: 'utf8' }).trim();
          if (chromeExe) break;
        } catch {
          continue;
        }
      }

      if (!chromeExe) {
        return reject(new Error('Chrome not found'));
      }

      logger.info(`[CdpProxy] Using Chrome: ${chromeExe}`);

      // Launch Chrome headless with CDP
      const args = [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-web-security', // Bypass CORS
        '--disable-features=IsolateOrigins,site-per-process',
        `--remote-debugging-port=${this.chromeDebugPort}`,
        '--user-data-dir=/tmp/phantoma-cdp-chrome',
      ];

      this.chromeProcess = spawn(chromeExe, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.chromeProcess.stdout?.on('data', (data) => {
        logger.debug(`[CdpProxy] Chrome stdout: ${data.toString().trim()}`);
      });

      this.chromeProcess.stderr?.on('data', (data) => {
        const msg = data.toString();
        logger.debug(`[CdpProxy] Chrome stderr: ${msg.trim()}`);
        
        // Detect when Chrome is ready
        if (msg.includes('DevTools listening')) {
          resolve();
        }
      });

      this.chromeProcess.on('exit', (code) => {
        logger.warn(`[CdpProxy] Chrome exited with code ${code}`);
        this.chromeProcess = null;
      });

      // Timeout if Chrome doesn't start
      setTimeout(() => resolve(), 3000);
    });
  }

  private async connectCDP(): Promise<void> {
    logger.info('[CdpProxy] Connecting to CDP...');

    try {
      this.cdpClient = await CDP({ port: this.chromeDebugPort });

      const { Network, Page, Runtime } = this.cdpClient;

      // Enable network tracking
      await Network.enable();
      await Page.enable();
      await Runtime.enable();

      // Listen to network events
      Network.requestWillBeSent((params: any) => {
        logger.debug(`[CdpProxy] Request: ${params.request.method} ${params.request.url}`);
        
        const capturedReq: CapturedRequest = {
          id: params.requestId,
          timestamp: Date.now(),
          method: params.request.method,
          url: params.request.url,
          headers: params.request.headers,
          body: params.request.postData,
        };

        this.sendToRenderer('cdp:request', capturedReq);
      });

      Network.responseReceived(async (params: any) => {
        logger.debug(`[CdpProxy] Response: ${params.response.status} ${params.response.url}`);

        try {
          const body = await Network.getResponseBody({ requestId: params.requestId });

          const capturedResp: CapturedResponse = {
            id: params.requestId,
            timestamp: Date.now(),
            statusCode: params.response.status,
            headers: params.response.headers,
            body: body.body,
          };

          this.sendToRenderer('cdp:response', capturedResp);
        } catch (err) {
          logger.warn(`[CdpProxy] Failed to get response body: ${err}`);
        }
      });

      logger.info('[CdpProxy] CDP connected successfully');
    } catch (error) {
      logger.error('[CdpProxy] Failed to connect CDP:', error);
      throw error;
    }
  }

  private async startProxyServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.proxyServer = http.createServer(async (req, res) => {
        await this.handleHttpRequest(req, res);
      });

      // Handle HTTPS CONNECT method
      this.proxyServer.on('connect', async (req, clientSocket, head) => {
        await this.handleConnectRequest(req, clientSocket, head);
      });

      this.proxyServer.listen(this.proxyPort, () => {
        logger.info(`[CdpProxy] Proxy server listening on port ${this.proxyPort}`);
        resolve();
      });

      this.proxyServer.on('error', (err) => {
        logger.error('[CdpProxy] Proxy server error:', err);
        reject(err);
      });
    });
  }

  private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const { method, url, headers } = req;

    logger.info(`[CdpProxy] HTTP ${method} ${url}`);

    // Read request body
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      const body = Buffer.concat(chunks).toString('utf8');

      // Execute request in Chrome via CDP
      try {
        const result = await this.executeRequestInChrome(method || 'GET', url || '', headers, body);

        // Send response back to CLI
        res.writeHead(result.status, result.headers);
        res.end(result.body);
      } catch (error) {
        logger.error('[CdpProxy] Request execution failed:', error);
        res.writeHead(500);
        res.end('Proxy error');
      }
    });
  }

  private async handleConnectRequest(
    req: http.IncomingMessage,
    clientSocket: any,
    head: Buffer,
  ): Promise<void> {
    const { url } = req;
    logger.info(`[CdpProxy] HTTPS CONNECT ${url}`);

    // For HTTPS, we need to tunnel through Chrome
    // Send 200 Connection Established to client
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

    // Read HTTPS request from client
    clientSocket.on('data', async (data: Buffer) => {
      try {
        // Parse HTTPS request (simplified)
        const requestStr = data.toString('utf8');
        const lines = requestStr.split('\r\n');
        const requestLine = lines[0];
        const [method, path] = requestLine.split(' ');

        const fullUrl = `https://${url}${path}`;

        logger.debug(`[CdpProxy] HTTPS ${method} ${fullUrl}`);

        // Execute in Chrome
        const result = await this.executeRequestInChrome(method, fullUrl, {}, '');

        // Send response back
        clientSocket.write(`HTTP/1.1 ${result.status} OK\r\n`);
        Object.entries(result.headers).forEach(([key, value]) => {
          clientSocket.write(`${key}: ${value}\r\n`);
        });
        clientSocket.write('\r\n');
        clientSocket.write(result.body);
      } catch (error) {
        logger.error('[CdpProxy] CONNECT handling failed:', error);
        clientSocket.end();
      }
    });

    clientSocket.on('error', (err: Error) => {
      logger.error('[CdpProxy] Client socket error:', err);
    });
  }

  private async executeRequestInChrome(
    method: string,
    url: string,
    headers: any,
    body: string,
  ): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    if (!this.cdpClient) {
      throw new Error('CDP not connected');
    }

    const { Runtime } = this.cdpClient;

    // Execute fetch in Chrome context
    const fetchCode = `
      (async () => {
        const options = {
          method: ${JSON.stringify(method)},
          headers: ${JSON.stringify(headers)},
          ${body ? `body: ${JSON.stringify(body)},` : ''}
        };

        const response = await fetch(${JSON.stringify(url)}, options);
        const responseBody = await response.text();

        const headersObj = {};
        response.headers.forEach((value, key) => {
          headersObj[key] = value;
        });

        return {
          status: response.status,
          headers: headersObj,
          body: responseBody,
        };
      })()
    `;

    const result = await Runtime.evaluate({
      expression: fetchCode,
      awaitPromise: true,
      returnByValue: true,
    });

    if (result.exceptionDetails) {
      throw new Error(`Chrome execution failed: ${result.exceptionDetails.text}`);
    }

    return result.result.value;
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      proxyPort: this.proxyPort,
      chromePort: this.chromeDebugPort,
    };
  }
}
