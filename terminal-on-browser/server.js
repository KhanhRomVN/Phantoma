/**
 * ------------------------------------------------------------------
 * Terminal-on-browser — server
 * ------------------------------------------------------------------
 * Chức năng:
 *  1. Phục vụ UI tĩnh (public/) tại http://127.0.0.1:PORT.
 *  2. WebSocket /pty  — cầu nối giữa shell (node-pty) và xterm.js.
 *  3. WebSocket /log  — đẩy log server + request HTTPS bắt được ra panel.
 *  4. MITM proxy nội bộ (127.0.0.1:MITM_PORT) — bắt toàn bộ HTTPS mà
 *     các tiến trình con spawn từ terminal phát ra. CA cert sinh tự động
 *     vào ~/.terminal-on-browser-ca, inject vào env của pty.spawn.
 * ------------------------------------------------------------------
 */

const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const { Proxy } = require('http-mitm-proxy');

const HOST = '127.0.0.1';
const PORT = process.env.PORT || 3000;
const MITM_PORT = Number(process.env.MITM_PORT || 9988);
const CA_DIR = path.join(os.homedir(), '.terminal-on-browser-ca');
const MAX_BODY_BYTES = 1024 * 1024; // 1MB

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

// ============ WebSocket: log/event stream ============
const logWss = new WebSocketServer({ noServer: true });
const logClients = new Set();

logWss.on('connection', (ws) => {
  logClients.add(ws);
  ws.send(JSON.stringify({ type: 'info', message: 'Đã kết nối kênh log.', ts: Date.now() }));
  ws.on('close', () => logClients.delete(ws));
});

/** Gửi 1 payload bất kỳ tới tất cả client panel. */
function broadcast(payload) {
  const data = JSON.stringify(payload);
  for (const ws of logClients) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

/** Log dạng text ra panel + stdout. */
function broadcastLog(message, type = 'info') {
  broadcast({ type, message, ts: Date.now() });
  console.log(`[log] ${message}`);
}

// ============ MITM proxy ============
const proxy = new Proxy();

/** Đọc/ghi header thành object phẳng (giữ key gốc). */
function headersToObject(raw) {
  const out = {};
  for (const k of Object.keys(raw || {})) out[k] = raw[k];
  return out;
}

/**
 * Xử lý body trong onResponse/onResponseData.
 * Chỉ gom tối đa MAX_BODY_BYTES; phần vượt đánh dấu truncated.
 */
function makeBodyCollector() {
  const chunks = [];
  let size = 0;
  let truncated = false;
  return {
    push(chunk) {
      if (truncated) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        truncated = true;
        return;
      }
      chunks.push(chunk);
    },
    result() {
      const buf = Buffer.concat(chunks);
      return {
        length: size,
        truncated,
        text: truncated ? null : buf.toString('utf8')
      };
    }
  };
}

proxy.onRequest((ctx, callback) => {
  const req = ctx.clientRequest;
  const url = `${ctx.isSSL ? 'https' : 'http'}://${req.headers.host}${req.url}`;

  // Bỏ qua request loop nội bộ (server tự gọi chính nó, CDN xterm, ws)
  if (req.headers.host && req.headers.host.startsWith(`${HOST}:${PORT}`)) {
    return callback();
  }

  ctx.__tosStart = Date.now();
  ctx.__tosUrl = url;
  ctx.__tosReqBody = makeBodyCollector();
  ctx.__tosResBody = makeBodyCollector();

  return callback();
});

// Gom request body (chunk client → server)
proxy.onRequestData((ctx, chunk, callback) => {
  if (ctx.__tosReqBody) ctx.__tosReqBody.push(chunk);
  return callback(null, chunk);
});

proxy.onResponse((ctx, callback) => {
  return callback(null, null);
});

// Gom response body (chunk server → client)
proxy.onResponseData((ctx, chunk, callback) => {
  if (ctx.__tosResBody) ctx.__tosResBody.push(chunk);
  return callback(null, chunk);
});

proxy.onResponseEnd((ctx, callback) => {
  try {
    const req = ctx.clientRequest;
    const res = ctx.serverToProxyResponse;
    const entry = {
      type: 'request',
      ts: ctx.__tosStart || Date.now(),
      method: req.method,
      url: ctx.__tosUrl,
      status: res ? res.statusCode : null,
      durationMs: Date.now() - (ctx.__tosStart || Date.now()),
      requestHeaders: headersToObject(req.headers),
      responseHeaders: res ? headersToObject(res.headers) : {},
      requestBody: ctx.__tosReqBody ? ctx.__tosReqBody.result() : null,
      responseBody: ctx.__tosResBody ? ctx.__tosResBody.result() : null
    };
    broadcast(entry);
  } catch (err) {
    broadcastLog(`Lỗi xử lý response: ${err.message}`, 'error');
  }
  return callback();
});

proxy.onError((ctx, err) => {
  broadcastLog(`Proxy error: ${err && err.message ? err.message : err}`, 'error');
});

/** Khởi động MITM proxy — CA cert sinh tự động trong CA_DIR. */
function startProxy() {
  return new Promise((resolve, reject) => {
    proxy.listen({ port: MITM_PORT, host: HOST, sslCaDir: CA_DIR }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/** Trả về đường dẫn file CA cert (.pem) mà proxy đã sinh. */
function getCaCertPath() {
  const p = path.join(CA_DIR, 'certs', 'ca.pem');
  return fs.existsSync(p) ? p : null;
}

// ============ WebSocket: PTY ============
const ptyWss = new WebSocketServer({ noServer: true });

ptyWss.on('connection', (ws) => {
  const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
  broadcastLog(`PTY mở shell: ${shell}`);

  const caPath = getCaCertPath();
  const proxyUrl = `http://${HOST}:${MITM_PORT}`;
  const childEnv = {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    HTTP_PROXY: proxyUrl,
    HTTPS_PROXY: proxyUrl,
    http_proxy: proxyUrl,
    https_proxy: proxyUrl,
    NO_PROXY: '127.0.0.1,localhost',
    no_proxy: '127.0.0.1,localhost'
  };
  if (caPath) {
    childEnv.NODE_EXTRA_CA_CERTS = caPath;
    childEnv.SSL_CERT_FILE = caPath;
    childEnv.REQUESTS_CA_BUNDLE = caPath;
    childEnv.CURL_CA_BUNDLE = caPath;
  }

  const ptyProc = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME || process.cwd(),
    env: childEnv
  });

  ptyProc.onData((data) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'output', data }));
  });

  ptyProc.onExit(({ exitCode, signal }) => {
    broadcastLog(`PTY thoát (code=${exitCode}, signal=${signal})`, 'warn');
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'exit', exitCode, signal }));
      ws.close();
    }
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'input') ptyProc.write(msg.data);
      else if (msg.type === 'resize') {
        const cols = Math.max(2, Math.min(500, msg.cols | 0));
        const rows = Math.max(2, Math.min(500, msg.rows | 0));
        try { ptyProc.resize(cols, rows); } catch (_) {}
      }
    } catch (_) { /* payload không hợp lệ — bỏ qua */ }
  });

  ws.on('close', () => {
    broadcastLog('PTY đóng kết nối.', 'warn');
    try { ptyProc.kill(); } catch (_) {}
  });
});

// ============ Upgrade routing ============
server.on('upgrade', (req, socket, head) => {
  const { url } = req;
  if (url === '/pty') {
    ptyWss.handleUpgrade(req, socket, head, (ws) => ptyWss.emit('connection', ws, req));
  } else if (url === '/log') {
    logWss.handleUpgrade(req, socket, head, (ws) => logWss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

// ============ Boot ============
(async () => {
  try {
    await startProxy();
    const ca = getCaCertPath();
    broadcastLog(`MITM proxy: ${HOST}:${MITM_PORT} — CA: ${ca || '(chưa sinh)'}`);
  } catch (err) {
    broadcastLog(`Không khởi động được MITM proxy: ${err.message}`, 'error');
  }

  server.listen(PORT, HOST, () => {
    console.log(`\n  ✅ Terminal-on-browser đang chạy tại: http://${HOST}:${PORT}`);
    console.log(`  🔍 MITM proxy: ${HOST}:${MITM_PORT} — env đã inject vào pty con.`);
    console.log(`  ℹ️  Chạy curl/node/python trong terminal để thấy request trong panel.\n`);
  });
})();