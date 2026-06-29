import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import * as zlib from 'zlib';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { WebSocketServer, WebSocket as WS } from 'ws';
import { Proxy } from 'http-mitm-proxy';
import { decompress } from '@mongodb-js/zstd';
import * as net from 'net';

import { cacheHeaders } from './headerCache';
import { mediaCache } from './mediaCache';
import { BreakpointManager, BreakpointRule, PendingBreakpoint } from './breakpoint-manager';
import { setupWebSocketTunnel, parseWebSocketFrame } from './websocket-handler';
import { processResponseBody, injectHTMLScript } from './response-processor';

export { BreakpointRule, PendingBreakpoint } from './breakpoint-manager';

export class ProxyServer extends EventEmitter {
  private proxy: any;
  private isRunning: boolean = false;
  private port: number = 8081;
  private wsPort: number = 0;
  private wss: WebSocketServer | null = null;
  private window: BrowserWindow | null = null;
  private isIntercepting: boolean = false;
  private breakpointManager: BreakpointManager;
  zstd: any;

  constructor() {
    super();
    this.breakpointManager = new BreakpointManager();
    try {
      this.proxy = new Proxy();
      this.proxy.use(Proxy.gunzip);
    } catch (e) {
      // Ignore errors
    }
  }

  public setWindow(window: BrowserWindow) {
    this.window = window;
  }

  private startWss(wsPort: number): Promise<void> {
    return new Promise((resolve) => {
      const server = http.createServer();
      this.wss = new WebSocketServer({ server });
      this.wss.on('connection', (ws) => {
        ws.send(JSON.stringify({ intercepting: this.isIntercepting }));
      });
      server.listen(wsPort, '0.0.0.0', () => {
        this.wsPort = wsPort;
        resolve();
      });
    });
  }

  private broadcastIntercept() {
    if (!this.wss) return;
    const msg = JSON.stringify({ intercepting: this.isIntercepting });
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WS.OPEN) ws.send(msg);
    });
  }

  public start(port: number = 8081): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.isRunning) {
        resolve();
        return;
      }
      this.port = port;
      await this.startWss(port + 1);
      this.setupListeners();
      this.proxy.onError((_ctx: any, err: any) => {
        console.error(`[ProxyServer] Error on proxy:`, err || _ctx);
        reject(err || _ctx);
      });
      this.proxy.listen({ port, host: '0.0.0.0' }, () => {
        this.isRunning = true;
        this.emit('started', port);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;

    if (this.wss) {
      try {
        await new Promise<void>((resolve) => {
          this.wss!.close(() => resolve());
        });
      } catch (e) {
        console.error('[ProxyServer] Error closing WSS:', e);
      }
      this.wss = null;
    }

    try {
      await new Promise<void>((resolve) => {
        let resolved = false;
        const done = () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        const timeout = setTimeout(() => {
          done();
        }, 3000);

        try {
          this.proxy.close(() => {
            clearTimeout(timeout);
            done();
          });
        } catch (e) {
          clearTimeout(timeout);
          console.error('[ProxyServer] Error calling proxy.close():', e);
          done();
        }
      });
    } catch (e) {
      console.error('[ProxyServer] Error during stop:', e);
    }
  }

  public setBreakpointRules(rules: BreakpointRule[]) {
    this.breakpointManager.setBreakpointRules(rules);
  }

  public resolveBreakpoint(requestId: string, edited: PendingBreakpoint | null): boolean {
    return this.breakpointManager.resolveBreakpoint(requestId, edited);
  }

  public setIntercept(enabled: boolean) {
    this.isIntercepting = enabled;
    this.broadcastIntercept();
    if (!enabled) {
      this.breakpointManager.clearPendingRequests();
    }
  }

  public forwardRequest(id: string): boolean {
    return this.breakpointManager.forwardRequest(id);
  }

  public dropRequest(id: string): boolean {
    return this.breakpointManager.dropRequest(id);
  }

  private sendToRenderer(channel: string, data: any) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  private setupListeners() {
    this.proxy.onError((ctxOrErr: any, err?: any) => {
      const error = err || ctxOrErr;
      const code = error?.code;
      if (
        code === 'ECONNRESET' ||
        code === 'EPIPE' ||
        code === 'HPE_INVALID_METHOD' ||
        code === 'HPE_INVALID_CONSTANT' ||
        error?.message === 'socket hang up'
      ) {
        return;
      }
      console.error('[ProxyServer Error]', error);
      if (ctxOrErr && ctxOrErr.clientToProxyRequest) {
        console.error(`[ProxyServer Error] URL: ${ctxOrErr.clientToProxyRequest.url}`);
      }
    });

    this.proxy.onConnect((req: any, socket: any, _head: any, callback: any) => {
      const hostUrl = req.url || '';
      if (!hostUrl) {
        return callback();
      }

      const host = hostUrl.split(':')[0];
      const port = parseInt(hostUrl.split(':')[1]) || 443;

      // Check if this is a WebSocket upgrade request
      const isWebSocket = req.headers?.upgrade?.toLowerCase() === 'websocket';

      if (isWebSocket) {
        setupWebSocketTunnel(req, socket, this.sendToRenderer.bind(this));
        return;
      }

      // Bypass list for domains that don't work with SSL interception
      const bypassList: string[] = [
        'challenges.cloudflare.com',
        'ai.cloudflare.com',
        'hcaptcha.com',
        'recaptcha.net',
        'turnstile.cloudflare.com',
        'mtalk.google.com',
        'safebrowsingohttpgateway.googleapis.com',
      ];

      const shouldBypass = bypassList.some((domain) => {
        if (host === domain) return true;
        if (host.endsWith('.' + domain)) return true;
        return false;
      });

      if (shouldBypass) {
        const conn = net.connect(
          {
            port,
            host,
            allowHalfOpen: true,
          },
          () => {
            conn.on('finish', () => {
              socket.destroy();
            });
            socket.on('close', () => {
              conn.end();
            });
            socket.write('HTTP/1.1 200 OK\r\n\r\n', 'utf-8', () => {
              conn.pipe(socket);
              socket.pipe(conn);
            });
          },
        );

        conn.on('error', (err: any) => {
          if (err.code !== 'ECONNRESET') {
            console.error(`[ProxyServer Connect Tunnel Error] Host: ${hostUrl}`, err);
          }
        });
        socket.on('error', (err: any) => {
          if (err.code !== 'ECONNRESET') {
            console.error(`[ProxyServer Connect Client Socket Error] Host: ${hostUrl}`, err);
          }
        });

        return;
      }

      return callback();
    });

    this.proxy.onRequest(async (ctx: any, callback: any) => {
      const req = ctx.clientToProxyRequest;
      const method = req.method;
      const url = (ctx.isSSL ? 'https://' : 'http://') + req.headers.host + req.url;
      const requestId = Date.now().toString() + Math.random();
      ctx.requestId = requestId;

      // Phantoma intercept status endpoint
      if (!ctx.isSSL && req.url === '/phantoma-intercept-status') {
        ctx.proxyToClientResponse.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        });
        ctx.proxyToClientResponse.end(JSON.stringify({ intercepting: this.isIntercepting }));
        return;
      }

      // Setup Page Logic
      if (!ctx.isSSL && req.url && (req.url === '/ssl' || req.url.startsWith('/ssl/'))) {
        const caPath = path.join(process.cwd(), '.http-mitm-proxy', 'certs', 'ca.pem');

        if (req.url === '/ssl/download') {
          if (fs.existsSync(caPath)) {
            const cert = fs.readFileSync(caPath);
            ctx.proxyToClientResponse.writeHead(200, {
              'Content-Type': 'application/x-x509-ca-cert',
              'Content-Disposition': 'attachment; filename="phantoma-ca.pem"',
            });
            ctx.proxyToClientResponse.end(cert);
          } else {
            ctx.proxyToClientResponse.writeHead(404, { 'Content-Type': 'text/plain' });
            ctx.proxyToClientResponse.end('CA Certificate not found');
          }
          return callback();
        }

        const clientIP =
          req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';

        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Phantoma Proxy Setup</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                  background: linear-gradient(135deg, #09090b 0%, #18181b 100%);
                  color: #fff; 
                  min-height: 100vh;
                  padding: 20px;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding-top: 40px;
                }
                h1 { 
                  font-size: 32px;
                  margin-bottom: 10px; 
                  color: #3b82f6;
                  text-align: center;
                }
                .subtitle {
                  text-align: center;
                  color: #a1a1aa;
                  margin-bottom: 30px;
                  font-size: 14px;
                }
                .success-badge {
                  background: #10b981;
                  color: white;
                  padding: 8px 16px;
                  border-radius: 20px;
                  font-size: 12px;
                  font-weight: bold;
                  display: inline-block;
                  margin-bottom: 30px;
                }
                .info-box {
                  background: #18181b;
                  border: 1px solid #27272a;
                  border-radius: 12px;
                  padding: 20px;
                  margin-bottom: 20px;
                }
                .info-box h3 {
                  color: #e4e4e7;
                  font-size: 16px;
                  margin-bottom: 12px;
                  display: flex;
                  align-items: center;
                }
                .info-box h3::before {
                  content: "✓";
                  background: #10b981;
                  color: white;
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  margin-right: 10px;
                  font-size: 14px;
                }
                .info-item {
                  display: flex;
                  justify-content: space-between;
                  padding: 8px 0;
                  border-bottom: 1px solid #27272a;
                  font-size: 14px;
                }
                .info-item:last-child {
                  border-bottom: none;
                }
                .info-item .label {
                  color: #a1a1aa;
                }
                .info-item .value {
                  color: #e4e4e7;
                  font-family: monospace;
                  font-weight: bold;
                }
                .step { 
                  background: #18181b;
                  padding: 20px;
                  border-radius: 12px;
                  border: 1px solid #27272a;
                  margin-bottom: 15px;
                }
                .step-number {
                  background: #3b82f6;
                  color: white;
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 14px;
                  margin-right: 10px;
                }
                .step strong { 
                  color: #e4e4e7;
                  font-size: 16px;
                  display: flex;
                  align-items: center;
                  margin-bottom: 10px;
                }
                .step p {
                  color: #a1a1aa;
                  line-height: 1.6;
                  margin-left: 38px;
                  font-size: 14px;
                }
                .btn { 
                  display: block;
                  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                  color: white;
                  padding: 16px 24px;
                  border-radius: 12px;
                  text-decoration: none;
                  font-weight: bold;
                  text-align: center;
                  transition: transform 0.2s, box-shadow 0.2s;
                  margin: 20px 0;
                  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
                .btn:active { 
                  transform: scale(0.98);
                  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
                }
                .troubleshoot {
                  background: #27272a;
                  border-left: 4px solid #f59e0b;
                  padding: 15px;
                  border-radius: 8px;
                  margin-top: 20px;
                  font-size: 13px;
                  color: #d4d4d8;
                }
                .troubleshoot h4 {
                  color: #f59e0b;
                  margin-bottom: 8px;
                  font-size: 14px;
                }
                .troubleshoot ul {
                  margin-left: 20px;
                  line-height: 1.8;
                }
                .troubleshoot li {
                  color: #a1a1aa;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🎯 Phantoma Proxy</h1>
                <div class="subtitle">Mobile Device Setup</div>
                
                <center>
                  <span class="success-badge">✓ Connected Successfully</span>
                </center>

                <div class="info-box">
                  <h3>Connection Information</h3>
                  <div class="info-item">
                    <span class="label">Your IP Address:</span>
                    <span class="value">${clientIP}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Server:</span>
                    <span class="value">${req.headers.host}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Protocol:</span>
                    <span class="value">HTTP</span>
                  </div>
                </div>

                <div class="step">
                  <strong><span class="step-number">1</span>Download Certificate</strong>
                  <p>Click the button below to download the CA Certificate to your device.</p>
                </div>
                
                <a href="/ssl/download" class="btn">📥 Download CA Certificate</a>

                <div class="step">
                  <strong><span class="step-number">2</span>Install Certificate</strong>
                  <p><strong>Android:</strong> Settings → Security → Encryption & credentials → Install a certificate → CA certificate</p>
                  <p style="margin-top: 8px;"><strong>iOS:</strong> Settings → General → VPN & Device Management → Downloaded Profile → Install</p>
                </div>

                <div class="step">
                  <strong><span class="step-number">3</span>Configure Proxy</strong>
                  <p>Go to WiFi settings → Modify network → Proxy → Manual</p>
                  <p style="margin-top: 8px;">Hostname: <strong>${req.headers.host?.split(':')[0] || '192.168.101.189'}</strong></p>
                  <p>Port: <strong>8081</strong></p>
                </div>

                <div class="troubleshoot">
                  <h4>⚠️ Troubleshooting</h4>
                  <ul>
                    <li>Ensure both devices are on the same WiFi network</li>
                    <li>Check if router's AP Isolation is disabled</li>
                    <li>Try accessing in Incognito/Private browsing mode</li>
                    <li>Disable VPN on mobile device if enabled</li>
                  </ul>
                </div>
              </div>
            </body>
          </html>
        `;
        ctx.proxyToClientResponse.writeHead(200, { 'Content-Type': 'text/html' });
        ctx.proxyToClientResponse.end(html);
        return callback();
      }

      const initiatorStackBase64 = req.headers['x-phantoma-initiator'];
      let initiator = null;
      if (initiatorStackBase64) {
        try {
          initiator = Buffer.from(initiatorStackBase64 as string, 'base64').toString('utf8');
          delete req.headers['x-phantoma-initiator'];
        } catch (e) {
          // Ignore errors
        }
      }

      cacheHeaders(requestId, req.headers);

      this.sendToRenderer('proxy:request', {
        id: requestId,
        method,
        url,
        headers: req.headers,
        timestamp: Date.now(),
        isIntercepted: this.isIntercepting,
        initiator: initiator,
      });

      const proceed = async () => {
        // Check request-phase breakpoint
        const reqRule = this.breakpointManager.matchesBreakpoint(url, method, 'request');
        if (reqRule) {
          const pending: PendingBreakpoint = {
            id: requestId,
            phase: 'request',
            url,
            method,
            headers: req.headers as Record<string, string>,
          };
          const edited = await this.breakpointManager.waitForBreakpointResolution(
            pending,
            this.sendToRenderer.bind(this),
          );
          if (edited === null) {
            ctx.proxyToClientResponse.writeHead(502, { 'Content-Type': 'text/plain' });
            ctx.proxyToClientResponse.end('Dropped by Phantoma breakpoint');
            return;
          }
          if (edited.headers) Object.assign(req.headers, edited.headers);
        }

        const requestChunks: any[] = [];
        ctx.onRequestData((_ctx: any, chunk: any, callback: any) => {
          requestChunks.push(chunk);
          return callback(null, chunk);
        });

        ctx.onRequestEnd(async (_ctx: any, callback: any) => {
          try {
            const buffer = Buffer.concat(requestChunks);
            const encodingHeader = req.headers['content-encoding'];
            const contentEncoding = (
              Array.isArray(encodingHeader) ? encodingHeader[0] : encodingHeader || ''
            ).toLowerCase();

            let body = '';
            let decompressionFailed = false;

            if (contentEncoding === 'gzip') {
              try {
                body = zlib.gunzipSync(buffer).toString('utf8');
              } catch (e) {
                console.error('[Proxy] Failed to decompress gzip request:', e);
                decompressionFailed = true;
              }
            } else if (contentEncoding === 'br') {
              try {
                body = zlib.brotliDecompressSync(buffer).toString('utf8');
              } catch (e) {
                console.error('[Proxy] Failed to decompress brotli request:', e);
                decompressionFailed = true;
              }
            } else if (contentEncoding === 'deflate') {
              try {
                body = zlib.inflateSync(buffer).toString('utf8');
              } catch (e) {
                console.error('[Proxy] Failed to decompress deflate request:', e);
                decompressionFailed = true;
              }
            } else if (contentEncoding === 'zstd') {
              try {
                const decompressed = await decompress(buffer);
                body = Buffer.from(decompressed).toString('utf8');
              } catch (e) {
                console.error('[Proxy] ZSTD decompress failed:', e);
                decompressionFailed = true;
              }
            }

            if (decompressionFailed) {
              try {
                body = buffer.toString('utf8');
                if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/.test(body)) {
                  const hexPreview =
                    buffer
                      .slice(0, 64)
                      .toString('hex')
                      .match(/.{1,2}/g)
                      ?.join(' ') || '';
                  body = `[Binary Content - ${buffer.length} bytes]\n\nFirst 64 bytes (hex):\n${hexPreview}\n\nContent-Type: ${req.headers['content-type'] || 'unknown'}`;
                }
              } catch {
                const hexPreview =
                  buffer
                    .slice(0, 64)
                    .toString('hex')
                    .match(/.{1,2}/g)
                    ?.join(' ') || '';
                body = `[Binary Content - ${buffer.length} bytes]\n\nFirst 64 bytes (hex):\n${hexPreview}`;
              }
            } else if (!body) {
              try {
                body = buffer.toString('utf8');
                if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/.test(body)) {
                  const hexPreview =
                    buffer
                      .slice(0, 64)
                      .toString('hex')
                      .match(/.{1,2}/g)
                      ?.join(' ') || '';
                  body = `[Binary Content - ${buffer.length} bytes]\n\nFirst 64 bytes (hex):\n${hexPreview}`;
                }
              } catch {
                const hexPreview =
                  buffer
                    .slice(0, 64)
                    .toString('hex')
                    .match(/.{1,2}/g)
                    ?.join(' ') || '';
                body = `[Binary Content - ${buffer.length} bytes]\n\nFirst 64 bytes (hex):\n${hexPreview}`;
              }
            }

            if (body) {
              this.sendToRenderer('proxy:request-body', {
                id: requestId,
                body,
                contentEncoding: contentEncoding || 'none',
              });
            }
          } catch (err) {
            console.error('Error processing request body:', err);
          }
          return callback();
        });

        return callback();
      };

      if (this.isIntercepting) {
        await new Promise<void>((resolve, reject) => {
          this.breakpointManager.addPendingRequest(
            requestId,
            resolve,
            () => {
              ctx.proxyToClientResponse.writeHead(502, { 'Content-Type': 'text/plain' });
              ctx.proxyToClientResponse.end('Dropped by Phantoma intercept');
              reject(new Error('dropped'));
            },
          );
        })
          .then(() => proceed())
          .catch(() => {});
      } else {
        proceed();
      }
    });

    this.proxy.onResponse((ctx: any, callback: any) => {
      const req = ctx.clientToProxyRequest;
      const res = ctx.serverToProxyResponse;
      const url = (ctx.isSSL ? 'https://' : 'http://') + req.headers.host + req.url;

      this.sendToRenderer('proxy:response', {
        id: ctx.requestId,
        url,
        statusCode: res ? res.statusCode : 0,
        headers: res ? res.headers : {},
        timestamp: Date.now(),
      });

      const responseChunks: any[] = [];
      let isHtml = false;
      const contentType = res?.headers['content-type'] || '';
      if (contentType.toLowerCase().includes('text/html')) {
        isHtml = true;
        delete res.headers['content-security-policy'];
        delete res.headers['content-security-policy-report-only'];
      }

      ctx.onResponseData((_ctx: any, chunk: any, callback: any) => {
        if (isHtml) {
          responseChunks.push(chunk);
          return callback(null, null);
        }
        responseChunks.push(chunk);
        return callback(null, chunk);
      });

      ctx.onResponseEnd(async (ctx: any, callback: any) => {
        const buffer = Buffer.concat(responseChunks);

        // Response-phase breakpoint
        const resRule = this.breakpointManager.matchesBreakpoint(url, req.method, 'response');
        if (resRule) {
          const pending: PendingBreakpoint = {
            id: ctx.requestId + '_res',
            phase: 'response',
            url,
            method: req.method,
            headers: res?.headers as Record<string, string>,
            statusCode: res?.statusCode,
          };
          const edited = await this.breakpointManager.waitForBreakpointResolution(
            pending,
            this.sendToRenderer.bind(this),
          );
          if (edited === null) {
            ctx.proxyToClientResponse.writeHead(502, { 'Content-Type': 'text/plain' });
            ctx.proxyToClientResponse.end('Dropped by Phantoma breakpoint');
            return callback();
          }
          if (edited.headers) Object.assign(res.headers, edited.headers);
          if (edited.statusCode) res.statusCode = edited.statusCode;
        }

        // HTML Injection
        if (isHtml) {
          const encodingHeader = res?.headers['content-encoding'];
          const contentEncoding = (
            Array.isArray(encodingHeader) ? encodingHeader[0] : encodingHeader || ''
          ).toLowerCase();

          const result = injectHTMLScript(buffer, contentEncoding, this.port, this.wsPort, this.zstd);
          if (result.modified) {
            if (res.headers['content-encoding']) {
              delete res.headers['content-encoding'];
            }
            res.headers['content-length'] = result.buffer.length;
            ctx.proxyToClientResponse.write(result.buffer);
            // Update buffer for body processing
            const newBuffer = result.buffer;
            const size = newBuffer.length;
            const sizeStr = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;

            try {
              const processed = processResponseBody(
                newBuffer,
                contentEncoding,
                res?.headers['content-type'] || '',
                ctx.requestId,
                url,
                this.zstd,
              );
              this.sendToRenderer('proxy:response-body', {
                id: ctx.requestId,
                body: processed.body,
                size: processed.size,
                isBinary: processed.isBinary,
                contentType: processed.contentType,
              });
            } catch (err) {
              console.error('Error processing response body:', err);
            }
            return callback();
          }
        }

        // Normal response processing
        const size = buffer.length;
        const sizeStr = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;

        try {
          const encodingHeader = res?.headers['content-encoding'];
          const contentEncoding = (
            Array.isArray(encodingHeader) ? encodingHeader[0] : encodingHeader || ''
          ).toLowerCase();

          const processed = processResponseBody(
            buffer,
            contentEncoding,
            res?.headers['content-type'] || '',
            ctx.requestId,
            url,
            this.zstd,
          );

          this.sendToRenderer('proxy:response-body', {
            id: ctx.requestId,
            body: processed.body,
            size: processed.size,
            isBinary: processed.isBinary,
            contentType: processed.contentType,
          });
        } catch (err) {
          console.error('Error processing response body:', err);
          const encodingHeader = res?.headers['content-encoding'];
          const contentEncoding = Array.isArray(encodingHeader)
            ? encodingHeader[0]
            : encodingHeader || 'unknown';

          this.sendToRenderer('proxy:response-body', {
            id: ctx.requestId,
            body: `[Phantoma Error] Failed to decode response body.\nEncoding: ${contentEncoding}\nError: ${err instanceof Error ? err.message : String(err)}`,
            size: sizeStr,
          });
        }
        return callback();
      });

      return callback();
    });
  }
}