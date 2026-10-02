/**
 * ------------------------------------------------------------------
 * CdpProxy (port từ src/main/capture/CdpProxy.ts)
 * ------------------------------------------------------------------
 * Thay BrowserWindow → runtimeBus; đổi findAvailablePort import sang
 * runtime/net; Chrome user-data-dir vào RUNTIME_DIR.
 * ------------------------------------------------------------------
 */

import { EventEmitter } from 'events';
import * as http from 'http';
import { spawn, ChildProcess } from 'child_process';
import { runtimeBus } from '../event-bus';
import { findAvailablePort } from '../net';
import { TMP_DIR } from '../paths';
import { createLogger } from '../../utils/logger';
import CDP from 'chrome-remote-interface';

const logger = createLogger('CdpProxy');

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
  private isRunning = false;

  private proxyPort = 8888;
  private chromeDebugPort = 9222;

  private requestMap = new Map<string, http.ServerResponse>();

  constructor(_window?: unknown) {
    super();
  }

  public async start(options: CdpProxyOptions = {}): Promise<{ proxyPort: number; chromePort: number }> {
    if (this.isRunning) {
      throw new Error('CDP Proxy already running');
    }

    this.proxyPort = options.proxyPort || (await findAvailablePort(8888));
    this.chromeDebugPort = options.chromeDebugPort || (await findAvailablePort(9222));

    logger.info(`Starting proxy on port ${this.proxyPort}`);
    logger.info(`Chrome debug port: ${this.chromeDebugPort}`);

    await this.startChrome();
    await this.connectCDP();
    await this.startProxyServer();

    this.isRunning = true;
    this.emit('started', { proxyPort: this.proxyPort, chromePort: this.chromeDebugPort });

    return { proxyPort: this.proxyPort, chromePort: this.chromeDebugPort };
  }

  public stop(): void {
    logger.info('Stopping...');

    if (this.proxyServer) {
      this.proxyServer.close();
      this.proxyServer = null;
    }

    if (this.cdpClient) {
      this.cdpClient.close();
      this.cdpClient = null;
    }

    if (this.chromeProcess) {
      this.chromeProcess.kill('SIGTERM');
      this.chromeProcess = null;
    }

    this.isRunning = false;
    this.emit('stopped');
  }

  private async startChrome(): Promise<void> {
    return new Promise((resolve, reject) => {
      const chromePaths = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];

      let chromeExe = '';
      for (const p of chromePaths) {
        try {
          const { execSync } = require('child_process');
          chromeExe = execSync(`which ${p}`, { encoding: 'utf8' }).trim();
          if (chromeExe) break;
        } catch {
          continue;
        }
      }

      if (!chromeExe) {
        return reject(new Error('Chrome not found'));
      }

      logger.info(`Using Chrome: ${chromeExe}`);

      const args = [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        `--remote-debugging-port=${this.chromeDebugPort}`,
        `--user-data-dir=${TMP_DIR}/phantoma-cdp-chrome`,
      ];

      this.chromeProcess = spawn(chromeExe, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.chromeProcess.stdout?.on('data', (data) => {
        logger.debug(`Chrome stdout: ${data.toString().trim()}`);
      });

      this.chromeProcess.stderr?.on('data', (data) => {
        const msg = data.toString();
        logger.debug(`Chrome stderr: ${msg.trim()}`);
        if (msg.includes('DevTools listening')) {
          resolve();
        }
      });

      this.chromeProcess.on('exit', (code) => {
        logger.warn(`Chrome exited with code ${code}`);
        this.chromeProcess = null;
      });

      setTimeout(() => resolve(), 3000);
    });
  }

  private async connectCDP(): Promise<void> {
    logger.info('Connecting to CDP...');

    try {
      this.cdpClient = await CDP({ port: this.chromeDebugPort });

      const { Network, Page, Runtime } = this.cdpClient;

      await Network.enable();
      await Page.enable();
      await Runtime.enable();

      Network.requestWillBeSent((params: any) => {
        logger.debug(`Request: ${params.request.method} ${params.request.url}`);
        const capturedReq: CapturedRequest = {
          id: params.requestId,
          timestamp: Date.now(),
          method: params.request.method,
          url: params.request.url,
          headers: params.request.headers,
          body: params.request.postData,
        };
        runtimeBus.emitEvent('cdp:request', capturedReq);
      });

      Network.responseReceived(async (params: any) => {
        logger.debug(`Response: ${params.response.status} ${params.response.url}`);
        try {
          const body = await Network.getResponseBody({ requestId: params.requestId });
          const capturedResp: CapturedResponse = {
            id: params.requestId,
            timestamp: Date.now(),
            statusCode: params.response.status,
            headers: params.response.headers,
            body: body.body,
          };
          runtimeBus.emitEvent('cdp:response', capturedResp);
        } catch (err) {
          logger.warn(`Failed to get response body: ${err}`);
        }
      });

      logger.info('CDP connected successfully');
    } catch (error) {
      logger.error('Failed to connect CDP', { err: String(error) });
      throw error;
    }
  }

  private async startProxyServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.proxyServer = http.createServer(async (req, res) => {
        await this.handleHttpRequest(req, res);
      });

      this.proxyServer.on('connect', async (req, clientSocket, head) => {
        await this.handleConnectRequest(req, clientSocket, head);
      });

      this.proxyServer.listen(this.proxyPort, () => {
        logger.info(`Proxy server listening on port ${this.proxyPort}`);
        resolve();
      });

      this.proxyServer.on('error', (err) => {
        logger.error('Proxy server error', { err: String(err) });
        reject(err);
      });
    });
  }

  private async handleHttpRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const { method, url, headers } = req;
    logger.info(`HTTP ${method} ${url}`);

    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      const body = Buffer.concat(chunks).toString('utf8');
      try {
        const result = await this.executeRequestInChrome(method || 'GET', url || '', headers, body);
        res.writeHead(result.status, result.headers);
        res.end(result.body);
      } catch (error) {
        logger.error('Request execution failed', { err: String(error) });
        res.writeHead(500);
        res.end('Proxy error');
      }
    });
  }

  private async handleConnectRequest(
    req: http.IncomingMessage,
    clientSocket: any,
    _head: Buffer,
  ): Promise<void> {
    const { url } = req;
    logger.info(`HTTPS CONNECT ${url}`);

    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

    clientSocket.on('data', async (data: Buffer) => {
      try {
        const requestStr = data.toString('utf8');
        const lines = requestStr.split('\r\n');
        const requestLine = lines[0];
        const [method, path] = requestLine.split(' ');

        const fullUrl = `https://${url}${path}`;
        logger.debug(`HTTPS ${method} ${fullUrl}`);

        const result = await this.executeRequestInChrome(method, fullUrl, {}, '');

        clientSocket.write(`HTTP/1.1 ${result.status} OK\r\n`);
        Object.entries(result.headers).forEach(([key, value]) => {
          clientSocket.write(`${key}: ${value}\r\n`);
        });
        clientSocket.write('\r\n');
        clientSocket.write(result.body);
      } catch (error) {
        logger.error('CONNECT handling failed', { err: String(error) });
        clientSocket.end();
      }
    });

    clientSocket.on('error', (err: Error) => {
      logger.error('Client socket error', { err: String(err) });
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

  public getStatus() {
    return {
      isRunning: this.isRunning,
      proxyPort: this.proxyPort,
      chromePort: this.chromeDebugPort,
    };
  }
}