/**
 * ------------------------------------------------------------------
 * Proxy Server (port từ src/main/proxy/ProxyServer.ts)
 * ------------------------------------------------------------------
 * MITM proxy chặn bắt HTTP/HTTPS + WebSocket. Thay điểm chạm Electron
 * duy nhất (`window.webContents.send`) bằng `runtimeBus.emitEvent`
 * để SSE hub đẩy event xuống renderer.
 *
 * Toàn bộ logic nghiệp vụ giữ nguyên byte-for-byte so với bản gốc.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { EventEmitter } from 'events';
import * as zlib from 'zlib';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import * as http from 'http';

import { Proxy } from 'http-mitm-proxy';
import { decompress } from '@mongodb-js/zstd';
import { WebSocketServer, WebSocket as WS } from 'ws';

import { INJECT_SCRIPT } from './injection';
import { cacheHeaders } from './headerCache';
import { mediaCache } from './mediaCache';
import { runtimeBus } from '../event-bus';
import { CERTS_DIR } from '../paths';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ProxyServer');

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface BreakpointRule {
  id: string;
  urlPattern: string;
  methods: string[];
  phase: 'request' | 'response' | 'both';
  enabled: boolean;
}

export interface PendingBreakpoint {
  id: string;
  phase: 'request' | 'response';
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  statusCode?: number;
}

// ─── Class ──────────────────────────────────────────────────────────────
export class ProxyServer extends EventEmitter {
  private proxy: any;
  private isRunning = false;
  private port = 8081;
  private wsPort = 0;
  private wss: WebSocketServer | null = null;
  private isIntercepting = false;
  private breakpointRules: BreakpointRule[] = [];
  private pendingBreakpoints: Map<string, (edited: PendingBreakpoint | null) => void> = new Map();
  private pendingRequests: Map<string, { proceed: () => void; drop: () => void }> = new Map();
  zstd: any;

  constructor() {
    super();
    try {
      this.proxy = new Proxy();
      this.proxy.use(Proxy.gunzip);
    } catch (e) {
      logger.warn('Failed to initialize proxy', { err: String(e) });
    }
  }

  /** Không còn cửa sổ Electron — giữ method no-op để tương thích API cũ. */
  public setWindow(_window: unknown): void {
    // no-op: event đi qua runtimeBus
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

  public start(port = 8081): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.isRunning) {
        resolve();
        return;
      }
      this.port = port;
      await this.startWss(port + 1);
      this.setupListeners();
      this.proxy.onError((_ctx: any, err: any) => {
        logger.error('Error on proxy', { err: String(err || _ctx) });
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
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.wss) {
      try {
        await new Promise<void>((resolve) => {
          this.wss!.close(() => resolve());
        });
      } catch (e) {
        logger.error('Error closing WSS', { err: String(e) });
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
        const timeout = setTimeout(() => done(), 3000);
        try {
          this.proxy.close(() => {
            clearTimeout(timeout);
            done();
          });
        } catch (e) {
          clearTimeout(timeout);
          logger.error('Error calling proxy.close()', { err: String(e) });
          done();
        }
      });
    } catch (e) {
      logger.error('Error during stop', { err: String(e) });
    }
  }

  public setBreakpointRules(rules: BreakpointRule[]) {
    this.breakpointRules = rules;
  }

  public resolveBreakpoint(requestId: string, edited: PendingBreakpoint | null) {
    const resolve = this.pendingBreakpoints.get(requestId);
    if (resolve) {
      this.pendingBreakpoints.delete(requestId);
      resolve(edited);
      return true;
    }
    return false;
  }

  private matchesBreakpoint(
    url: string,
    method: string,
    phase: 'request' | 'response',
  ): BreakpointRule | undefined {
    return this.breakpointRules.find((rule) => {
      if (!rule.enabled) return false;
      if (rule.phase !== 'both' && rule.phase !== phase) return false;
      if (rule.methods.length > 0 && !rule.methods.includes(method.toUpperCase())) return false;
      try {
        return new RegExp(rule.urlPattern, 'i').test(url);
      } catch {
        return url.includes(rule.urlPattern);
      }
    });
  }

  private waitForBreakpointResolution(
    pending: PendingBreakpoint,
  ): Promise<PendingBreakpoint | null> {
    return new Promise((resolve) => {
      this.pendingBreakpoints.set(pending.id, resolve);
      this.sendToRenderer('proxy:breakpoint-hit', pending);
    });
  }

  public setIntercept(enabled: boolean) {
    this.isIntercepting = enabled;
    this.broadcastIntercept();
    if (!enabled) {
      this.pendingRequests.forEach(({ proceed }) => proceed());
      this.pendingRequests.clear();
    }
  }

  public forwardRequest(id: string) {
    const entry = this.pendingRequests.get(id);
    if (entry) {
      entry.proceed();
      this.pendingRequests.delete(id);
      return true;
    }
    return false;
  }

  public dropRequest(id: string) {
    const entry = this.pendingRequests.get(id);
    if (entry) {
      entry.drop();
      this.pendingRequests.delete(id);
      return true;
    }
    return false;
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
      logger.error('ProxyServer Error', { err: String(error) });
      if (ctxOrErr && ctxOrErr.clientToProxyRequest) {
        logger.error(`URL: ${ctxOrErr.clientToProxyRequest.url}`);
      }
    });

    this.proxy.onConnect((req: any, socket: any, _head: any, callback: any) => {
      const hostUrl = req.url || '';
      if (!hostUrl) {
        return callback();
      }

      const host = hostUrl.split(':')[0];
      const port = parseInt(hostUrl.split(':')[1]) || 443;

      const isWebSocket = req.headers?.upgrade?.toLowerCase() === 'websocket';
      if (isWebSocket) {
        const wsId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const wsUrl = `wss://${host}${req.url || ''}`;
        const wsPath = req.url || '/';

        this.sendToRenderer('ws:connect', {
          id: wsId,
          url: wsUrl,
          host,
          path: wsPath,
          status: 'connecting',
          startTime: Date.now(),
          messages: [],
          totalMessages: 0,
          clientBytesSent: 0,
          serverBytesSent: 0,
          requestHeaders: req.headers || {},
          responseHeaders: {},
        });

        const conn = net.connect({ port, host, allowHalfOpen: true }, () => {
          socket.write('HTTP/1.1 200 Connection Established\r\n\r\n', 'utf-8', () => {
            let responseHeadersCaptured = false;
            let serverHeaderBuffer = '';

            conn.on('data', (data: Buffer) => {
              const frameInfo = this.parseWebSocketFrame(data, 'server');
              if (frameInfo) {
                this.sendToRenderer('ws:message', {
                  id: `ws-msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  connectionId: wsId,
                  direction: 'server',
                  data: frameInfo.isBinary
                    ? data.toString('base64')
                    : frameInfo.payload || data.toString('utf8'),
                  dataType: frameInfo.isBinary ? 'binary' : 'text',
                  size: data.length,
                  timestamp: Date.now(),
                });

                this.sendToRenderer('ws:update', {
                  id: wsId,
                  totalMessages: frameInfo.isControl ? undefined : 1,
                  serverBytesSent: data.length,
                });
              }

              if (!responseHeadersCaptured) {
                serverHeaderBuffer += data.toString('utf8');
                const headerEnd = serverHeaderBuffer.indexOf('\r\n\r\n');
                if (headerEnd !== -1) {
                  responseHeadersCaptured = true;
                  const headerStr = serverHeaderBuffer.substring(0, headerEnd);
                  const headers: Record<string, string> = {};
                  headerStr.split('\r\n').forEach((line) => {
                    const colonIdx = line.indexOf(':');
                    if (colonIdx > 0) {
                      headers[line.substring(0, colonIdx).trim().toLowerCase()] = line
                        .substring(colonIdx + 1)
                        .trim();
                    } else if (line.startsWith('HTTP/')) {
                      headers[':status'] = line.split(' ')[1] || '101';
                    }
                  });
                  this.sendToRenderer('ws:update', {
                    id: wsId,
                    status: 'connected',
                    responseHeaders: headers,
                  });
                }
              }

              socket.write(data);
            });

            socket.on('data', (data: Buffer) => {
              const frameInfo = this.parseWebSocketFrame(data, 'client');
              if (frameInfo) {
                this.sendToRenderer('ws:message', {
                  id: `ws-msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  connectionId: wsId,
                  direction: 'client',
                  data: frameInfo.isBinary
                    ? data.toString('base64')
                    : frameInfo.payload || data.toString('utf8'),
                  dataType: frameInfo.isBinary ? 'binary' : 'text',
                  size: data.length,
                  timestamp: Date.now(),
                });

                this.sendToRenderer('ws:update', {
                  id: wsId,
                  totalMessages: frameInfo.isControl ? undefined : 1,
                  clientBytesSent: data.length,
                });
              }

              conn.write(data);
            });

            conn.on('close', () => {
              this.sendToRenderer('ws:close', {
                id: wsId,
                endTime: Date.now(),
                status: 'closed',
              });
              socket.end();
            });

            socket.on('close', () => {
              this.sendToRenderer('ws:close', {
                id: wsId,
                endTime: Date.now(),
                status: 'closed',
              });
              conn.end();
            });

            conn.on('error', (err: any) => {
              if (err.code !== 'ECONNRESET') {
                logger.error('ProxyServer WS server error', { err: String(err) });
              }
            });

            socket.on('error', (err: any) => {
              if (err.code !== 'ECONNRESET') {
                logger.error('ProxyServer WS client error', { err: String(err) });
              }
            });
          });
        });

        conn.on('error', (err: any) => {
          if (err.code !== 'ECONNRESET') {
            logger.error('ProxyServer WS connection error', { err: String(err) });
          }
          this.sendToRenderer('ws:close', {
            id: wsId,
            endTime: Date.now(),
            status: 'closed',
          });
          socket.destroy();
        });

        return;
      }

      const bypassList: string[] = [
        'challenges.cloudflare.com',
        'ai.cloudflare.com',
        'hcaptcha.com',
        'recaptcha.net',
        'turnstile.cloudflare.com',
        'mtalk.google.com',
        'safebrowsingohttpgateway.googleapis.com',
        'workos.com',
        'api.workos.com',
      ];

      const clineAuthBypassList: string[] = ['authkit.cline.bot'];

      const shouldBypass = bypassList.some((domain) => {
        if (host === domain) return true;
        if (host.endsWith('.' + domain)) return true;
        return false;
      });

      const shouldBypassClineAuth = clineAuthBypassList.some((domain) => {
        if (host === domain) return true;
        if (host.endsWith('.' + domain)) return true;
        return false;
      });

      if (shouldBypass || shouldBypassClineAuth) {
        logger.info(`SSL Bypass (TCP tunnel): ${hostUrl}`);

        this.sendToRenderer('proxy:ssl-bypass', {
          id: `ssl-bypass-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          host,
          port,
          url: hostUrl,
          timestamp: Date.now(),
          type: 'SSL_BYPASS',
          note: 'Connection tunneled without decryption to preserve authentication',
        });

        const conn = net.connect({ port, host, allowHalfOpen: true }, () => {
          conn.on('finish', () => socket.destroy());
          socket.on('close', () => conn.end());
          socket.write('HTTP/1.1 200 OK\r\n\r\n', 'utf-8', () => {
            conn.pipe(socket);
            socket.pipe(conn);
          });
        });

        conn.on('error', (err: any) => {
          if (err.code !== 'ECONNRESET') {
            logger.error(`Connect Tunnel Error Host: ${hostUrl}`, { err: String(err) });
          }
        });
        socket.on('error', (err: any) => {
          if (err.code !== 'ECONNRESET') {
            logger.error(`Connect Client Socket Error Host: ${hostUrl}`, { err: String(err) });
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

      if (!ctx.isSSL && req.url === '/phantoma-intercept-status') {
        ctx.proxyToClientResponse.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        });
        ctx.proxyToClientResponse.end(JSON.stringify({ intercepting: this.isIntercepting }));
        return;
      }

      if (!ctx.isSSL && req.url && (req.url === '/ssl' || req.url.startsWith('/ssl/'))) {
        const caPath = path.join(CERTS_DIR, 'ca.pem');

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

        const html = `<!DOCTYPE html><html><head><title>Phantoma Proxy Setup</title>
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:sans-serif;background:#09090b;color:#fff;padding:20px">
<h1 style="color:#3b82f6">Phantoma Proxy</h1>
<p>Client IP: <b>${clientIP}</b></p>
<p>Server: <b>${req.headers.host}</b></p>
<p><a href="/ssl/download" style="color:#3b82f6">Download CA Certificate</a></p>
<p>Configure proxy host to <b>${req.headers.host?.split(':')[0] || ''}</b>, port <b>8081</b>.</p>
</body></html>`;
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
        } catch {
          // ignore
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
        initiator,
      });

      const proceed = async () => {
        const reqRule = this.matchesBreakpoint(url, method, 'request');
        if (reqRule) {
          const pending: PendingBreakpoint = {
            id: requestId,
            phase: 'request',
            url,
            method,
            headers: req.headers as Record<string, string>,
          };
          const edited = await this.waitForBreakpointResolution(pending);
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
                logger.error('Failed to decompress gzip request', { err: String(e) });
                decompressionFailed = true;
              }
            } else if (contentEncoding === 'br') {
              try {
                body = zlib.brotliDecompressSync(buffer).toString('utf8');
              } catch (e) {
                logger.error('Failed to decompress brotli request', { err: String(e) });
                decompressionFailed = true;
              }
            } else if (contentEncoding === 'deflate') {
              try {
                body = zlib.inflateSync(buffer).toString('utf8');
              } catch (e) {
                logger.error('Failed to decompress deflate request', { err: String(e) });
                decompressionFailed = true;
              }
            } else if (contentEncoding === 'zstd') {
              try {
                const decompressed = await decompress(buffer);
                body = Buffer.from(decompressed).toString('utf8');
              } catch (e) {
                logger.error('ZSTD decompress failed', { err: String(e) });
                decompressionFailed = true;
              }
            }

            if (decompressionFailed) {
              try {
                body = buffer.toString('utf8');
                if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/.test(body)) {
                  const hexPreview =
                    buffer.slice(0, 64).toString('hex').match(/.{1,2}/g)?.join(' ') || '';
                  body = `[Binary Content - ${buffer.length} bytes]\n\nFirst 64 bytes (hex):\n${hexPreview}\n\nContent-Type: ${req.headers['content-type'] || 'unknown'}`;
                }
              } catch {
                const hexPreview =
                  buffer.slice(0, 64).toString('hex').match(/.{1,2}/g)?.join(' ') || '';
                body = `[Binary Content - ${buffer.length} bytes]\n\nFirst 64 bytes (hex):\n${hexPreview}`;
              }
            } else if (!body) {
              try {
                body = buffer.toString('utf8');
                if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/.test(body)) {
                  const hexPreview =
                    buffer.slice(0, 64).toString('hex').match(/.{1,2}/g)?.join(' ') || '';
                  body = `[Binary Content - ${buffer.length} bytes]\n\nFirst 64 bytes (hex):\n${hexPreview}`;
                }
              } catch {
                const hexPreview =
                  buffer.slice(0, 64).toString('hex').match(/.{1,2}/g)?.join(' ') || '';
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
            logger.error('Error processing request body', { err: String(err) });
          }
          return callback();
        });

        return callback();
      };

      if (this.isIntercepting) {
        await new Promise<void>((resolve, reject) => {
          this.pendingRequests.set(requestId, {
            proceed: resolve,
            drop: () => {
              ctx.proxyToClientResponse.writeHead(502, { 'Content-Type': 'text/plain' });
              ctx.proxyToClientResponse.end('Dropped by Phantoma intercept');
              reject(new Error('dropped'));
            },
          });
        })
          .then(() => proceed())
          .catch((e: any) => {
            logger.warn('Breakpoint resolution failed', { err: String(e) });
          });
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

        const resRule = this.matchesBreakpoint(url, req.method, 'response');
        if (resRule) {
          const pending: PendingBreakpoint = {
            id: ctx.requestId + '_res',
            phase: 'response',
            url,
            method: req.method,
            headers: res?.headers as Record<string, string>,
            statusCode: res?.statusCode,
          };
          const edited = await this.waitForBreakpointResolution(pending);
          if (edited === null) {
            ctx.proxyToClientResponse.writeHead(502, { 'Content-Type': 'text/plain' });
            ctx.proxyToClientResponse.end('Dropped by Phantoma breakpoint');
            return callback();
          }
          if (edited.headers) Object.assign(res.headers, edited.headers);
          if (edited.statusCode) res.statusCode = edited.statusCode;
        }

        if (isHtml) {
          try {
            const encodingHeader = res?.headers['content-encoding'];
            const contentEncoding = (
              Array.isArray(encodingHeader) ? encodingHeader[0] : encodingHeader || ''
            ).toLowerCase();

            let body = '';
            if (contentEncoding === 'gzip') {
              body = zlib.gunzipSync(buffer).toString('utf8');
            } else if (contentEncoding === 'br') {
              body = zlib.brotliDecompressSync(buffer).toString('utf8');
            } else if (contentEncoding === 'deflate') {
              body = zlib.inflateSync(buffer).toString('utf8');
            } else if (contentEncoding === 'zstd' && this.zstd) {
              body = Buffer.from(this.zstd.decompress(buffer)).toString('utf8');
            } else {
              body = buffer.toString('utf8');
            }

            if (res.headers['content-encoding']) {
              delete res.headers['content-encoding'];
            }

            const script = `<script>${INJECT_SCRIPT.replace('__PROXY_PORT__', String(this.port)).replace('__WS_PORT__', String(this.wsPort))}<\/script>`;
            const headIdx = body.indexOf('<head');
            const headEndIdx = headIdx !== -1 ? body.indexOf('>', headIdx) + 1 : -1;
            if (headEndIdx > 0) {
              body = body.slice(0, headEndIdx) + script + body.slice(headEndIdx);
            } else {
              body = script + body;
            }

            const newBuffer = Buffer.from(body, 'utf8');
            res.headers['content-length'] = newBuffer.length;
            ctx.proxyToClientResponse.write(newBuffer);
          } catch (e) {
            logger.error('Injection failed', { err: String(e) });
            ctx.proxyToClientResponse.write(buffer);
          }
        }

        const size = buffer.length;
        const sizeStr = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;

        try {
          const encodingHeader = res?.headers['content-encoding'];
          const contentEncoding = (
            Array.isArray(encodingHeader) ? encodingHeader[0] : encodingHeader || ''
          ).toLowerCase();

          let isBinaryResponse = false;
          let body = '';

          if (contentEncoding === 'gzip') {
            body = zlib.gunzipSync(buffer).toString('utf8');
          } else if (contentEncoding === 'br') {
            body = zlib.brotliDecompressSync(buffer).toString('utf8');
          } else if (contentEncoding === 'deflate') {
            body = zlib.inflateSync(buffer).toString('utf8');
          } else if (contentEncoding === 'zstd' && this.zstd) {
            try {
              body = (await this.zstd.decompress(buffer)).toString('utf8');
            } catch (e) {
              body = `[Phantoma Error] Failed to decompress zstd content: ${e instanceof Error ? e.message : String(e)}`;
            }
          } else if (!contentEncoding || contentEncoding === 'identity') {
            if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
              try {
                body = zlib.gunzipSync(buffer).toString('utf8');
              } catch (e) {
                body = `[Phantoma Error] Detected GZIP magic bytes but failed to decompress.\nError: ${e instanceof Error ? e.message : String(e)}`;
              }
            } else {
              const checkLen = Math.min(buffer.length, 1024);
              for (let i = 0; i < checkLen; i++) {
                if (buffer[i] === 0x00) {
                  isBinaryResponse = true;
                  break;
                }
              }
              if (isBinaryResponse) {
                body = buffer.toString('base64');
              } else {
                body = buffer.toString('utf8');
              }
            }
          } else {
            body = `[Phantoma Info] Content encoded with '${contentEncoding}' which is currently not supported for preview.`;
          }

          const contentTypeRes = (res?.headers['content-type'] || '').toLowerCase();
          const isMedia =
            contentTypeRes.startsWith('image/') ||
            contentTypeRes.startsWith('video/') ||
            contentTypeRes.startsWith('audio/');

          if (isMedia && ctx.requestId) {
            const fileName = url.split('/').pop()?.split('?')[0] || 'media_file';
            mediaCache.save(ctx.requestId, buffer, contentTypeRes, fileName);
          }

          this.sendToRenderer('proxy:response-body', {
            id: ctx.requestId,
            body,
            size: sizeStr,
            isBinary: isBinaryResponse,
            contentType: res?.headers['content-type'] || '',
          });
        } catch (err) {
          logger.error('Error processing response body', { err: String(err) });
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

  /**
   * Thay thế webContents.send: đẩy event vào runtimeBus để SSE hub
   * fan-out xuống renderer.
   */
  private sendToRenderer(channel: string, data: any) {
    runtimeBus.emitEvent(channel, data);
    if (channel === 'proxy:ssl-bypass') {
      logger.debug(`Sent SSL bypass event to renderer: ${data?.host}`);
    }
  }

  private parseWebSocketFrame(
    data: Buffer,
    _direction: 'client' | 'server',
  ): {
    isBinary: boolean;
    isControl: boolean;
    payload: string | null;
    opcode: number;
  } | null {
    try {
      if (data.length < 2) return null;

      const firstByte = data[0];
      const secondByte = data[1];

      const fin = (firstByte & 0x80) !== 0;
      const opcode = firstByte & 0x0f;
      const masked = (secondByte & 0x80) !== 0;
      let payloadLength = secondByte & 0x7f;

      const validOpcodes = [0, 1, 2, 8, 9, 10];
      if (!validOpcodes.includes(opcode)) return null;
      if (!fin && opcode === 0 && data.length < 2) return null;

      let offset = 2;

      if (payloadLength === 126) {
        if (data.length < 4) return null;
        payloadLength = data.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (data.length < 10) return null;
        const hi = data.readUInt32BE(2);
        const lo = data.readUInt32BE(6);
        payloadLength = hi > 0 ? 65535 : lo;
        offset = 10;
      }

      let maskKey: Buffer | null = null;
      if (masked) {
        if (data.length < offset + 4) return null;
        maskKey = data.slice(offset, offset + 4);
        offset += 4;
      }

      const payloadEnd = Math.min(offset + payloadLength, data.length);
      let payload: Buffer;

      if (maskKey) {
        payload = Buffer.alloc(payloadEnd - offset);
        for (let i = offset; i < payloadEnd; i++) {
          payload[i - offset] = data[i] ^ maskKey[(i - offset) % 4];
        }
      } else {
        payload = data.slice(offset, payloadEnd);
      }

      const isBinary = opcode === 2;
      const isControl = opcode >= 8;

      let payloadStr: string | null = null;
      if (!isBinary && !isControl) {
        try {
          payloadStr = payload.toString('utf8');
        } catch {
          logger.warn('Failed to decode UTF-8 payload');
          payloadStr = null;
        }
      } else if (isControl) {
        payloadStr = `[${['', '', '', '', '', '', '', '', 'CLOSE', 'PING', 'PONG'][opcode] || 'UNKNOWN'}]`;
        if (opcode === 8 && payload.length >= 2) {
          const code = payload.readUInt16BE(0);
          const reason = payload.length > 2 ? payload.slice(2).toString('utf8') : '';
          payloadStr = `[CLOSE ${code}${reason ? ': ' + reason : ''}]`;
        }
      }

      return { isBinary, isControl, payload: payloadStr, opcode };
    } catch {
      logger.warn('Failed to parse WebSocket frame');
      return null;
    }
  }
}