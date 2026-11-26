import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import WebSocket from 'ws';
import { AppError } from '../utils/http';
import { createLogger } from '../utils/logger';

const logger = createLogger('FxaCdpService');

const FXA_LOGIN_URL = 'https://accounts.firefox.com/signin';
const FXA_API_HOST = 'api.accounts.firefox.com';

export interface FxaCapturedLogin {
  uid: string;
  email: string;
  sessionToken: string;
}

function findBrowser(): string | null {
  const candidates = ['google-chrome-stable', 'google-chrome', 'chromium-browser', 'chromium'];
  for (const name of candidates) {
    const found = (process.env.PATH ?? '')
      .split(':')
      .map((dir) => path.join(dir, name))
      .find((p) => fs.existsSync(p));
    if (found) return found;
  }
  return null;
}

const SKIP_NAMES = new Set([
  'SingletonLock',
  'SingletonCookie',
  'SingletonSocket',
  'lockfile',
  'Cache',
  'Code Cache',
  'GPUCache',
  'GrShaderCache',
  'ShaderCache',
  'DawnCache',
  'Crashpad',
  'BrowserMetrics',
  'CacheStorage',
]);

// ASSUMED: a real Chrome user-data-dir is cloned to a temp dir (same as profile/src cloneRealProfile) because Chrome ignores --remote-debugging-port on its default data dir and hands off to an already-running instance
async function cloneRealProfile(root: string, folder: string): Promise<string> {
  const dest = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'phantoma-fxa-cdp-'));
  const source = path.join(root, folder);
  const nested = path.join(source, 'chrome');
  try {
    const localState = path.join(root, 'Local State');
    if (fs.existsSync(localState))
      await fs.promises.copyFile(localState, path.join(dest, 'Local State'));
    await fs.promises.cp(source, path.join(dest, folder), {
      recursive: true,
      filter: (src) => src !== nested && !SKIP_NAMES.has(path.basename(src)),
    });
  } catch (err: any) {
    fs.rmSync(dest, { recursive: true, force: true });
    throw new AppError(`Cannot copy Chrome profile: ${err?.message || err}`, 500);
  }
  return dest;
}

async function waitForDebugPort(port: number, retries = 60, delay = 300): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      // chưa sẵn sàng
    }
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new AppError('Chrome CDP debug port did not become ready in time', 502);
}

async function pickPageTarget(port: number): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${port}/json`);
  const targets = (await res.json()) as any[];
  const pages = targets.filter(
    (t) => t.type === 'page' && t.url && !t.url.startsWith('devtools://'),
  );
  const page = pages.find((t) => t.url.includes('firefox.com')) ?? pages[0];
  if (!page) throw new AppError('No page target found on Chrome CDP', 502);
  return page.webSocketDebuggerUrl;
}

/**
 * Mở Chrome trỏ tới trang sign-in của Mozilla, chờ account/login trả về sessionToken qua CDP Network domain.
 * Trả về null nếu người dùng đóng cửa sổ trước khi đăng nhập xong (timeoutMs trôi qua).
 */
export async function captureFxaLogin(
  timeoutMs = 300000,
  opts: { userDataDir?: string; profileDirectory?: string } = {},
): Promise<FxaCapturedLogin | null> {
  const executable = findBrowser();
  if (!executable) throw new AppError('No Chrome/Chromium executable found on PATH', 502);

  const debugPort = 9300 + Math.floor(Math.random() * 500);
  const cloneReal = Boolean(opts.userDataDir && opts.profileDirectory);
  const ownsDir = !opts.userDataDir || cloneReal;
  const userDataDir = cloneReal
    ? await cloneRealProfile(opts.userDataDir as string, opts.profileDirectory as string)
    : (opts.userDataDir ?? path.join(os.tmpdir(), `phantoma-fxa-cdp-${Date.now()}`));
  fs.mkdirSync(userDataDir, { recursive: true });

  const args = [
    `--remote-debugging-port=${debugPort}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    ...(opts.profileDirectory ? [`--profile-directory=${opts.profileDirectory}`] : []),
    FXA_LOGIN_URL,
  ];

  const child = spawn(executable, args, { detached: true, stdio: 'ignore' });

  const cleanup = async () => {
    try {
      process.kill(-(child.pid as number), 'SIGKILL'); // ASSUMED: child detached nên là leader của process group; SIGTERM chỉ giết process chính, các process con của Chrome vẫn ghi file vào user-data-dir
    } catch {
      // đã thoát
    }
    if (!ownsDir) return;
    await new Promise((r) => setTimeout(r, 500));
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    } catch (e: any) {
      logger.error('[FxaCdp] Failed to remove temp user-data-dir:', e?.message || e);
    }
  };

  try {
    await new Promise((r) => setTimeout(r, 1500));
    await waitForDebugPort(debugPort);
    const wsUrl = await pickPageTarget(debugPort);
    const ws = new WebSocket(wsUrl);

    const result = await new Promise<FxaCapturedLogin | null>((resolve, reject) => {
      let requestId = 0;
      const pending = new Map<number, (result: any) => void>();
      const mimeTypes = new Map<string, string>();
      const urls = new Map<string, string>();
      const statuses = new Map<string, number>();
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, timeoutMs);

      const send = (method: string, params: any = {}) =>
        new Promise<any>((res) => {
          const id = ++requestId;
          pending.set(id, res);
          ws.send(JSON.stringify({ id, method, params }));
        });

      ws.on('open', async () => {
        await send('Network.enable', {});
      });

      ws.on('message', async (raw: Buffer) => {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (msg.id && pending.has(msg.id)) {
          const resolveFn = pending.get(msg.id)!;
          pending.delete(msg.id);
          resolveFn(msg.result);
          return;
        }
        if (msg.method === 'Network.requestWillBeSent') {
          urls.set(msg.params.requestId, msg.params.request.url);
        } else if (msg.method === 'Network.responseReceived') {
          if (msg.params.response.mimeType)
            mimeTypes.set(msg.params.requestId, msg.params.response.mimeType);
          statuses.set(msg.params.requestId, msg.params.response.status);
        } else if (msg.method === 'Network.loadingFinished') {
          const requestId = msg.params.requestId;
          const url = urls.get(requestId) || '';
          const mimeType = mimeTypes.get(requestId) || '';
          // Debug log - có thể xóa sau khi fix
          if (/firefox\.com|mozilla\.(org|com)/.test(url)) {
            if (mimeType.includes('json')) {
              try {
                const dbg = await send('Network.getResponseBody', { requestId });
                const dbgText = dbg?.base64Encoded
                  ? Buffer.from(dbg.body, 'base64').toString()
                  : dbg?.body;
              } catch (e: any) {}
            }
          }
          if (!url.includes(FXA_API_HOST) || !mimeType.includes('application/json')) return;
          if (!/\/(linked_)?account\/(login|create)/.test(url)) return; // ASSUMED: đăng nhập bằng Google đi qua /v1/linked_account/login, trả cùng dạng {uid, sessionToken, email}
          try {
            const body = await send('Network.getResponseBody', { requestId });
            const text = body.base64Encoded
              ? Buffer.from(body.body, 'base64').toString()
              : body.body;
            const json = JSON.parse(text);
            if (typeof json.uid === 'string' && typeof json.sessionToken === 'string') {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                resolve({
                  uid: json.uid,
                  email: json.email ?? '',
                  sessionToken: json.sessionToken,
                });
              }
            }
          } catch (e: any) {
            logger.error('[FxaCdp] Failed to parse login response body:', e?.message || e);
          }
        }
      });

      ws.on('error', (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new AppError(`Chrome CDP WebSocket error: ${err.message}`, 502));
        }
      });

      ws.on('close', () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(null);
        }
      });
    });

    ws.close();
    return result;
  } finally {
    await cleanup();
  }
}
