import dns from 'dns';
import net from 'net';
import tls from 'tls';

export interface ProbeTarget {
  protocol: string;
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface ProbeResult {
  ok: boolean;
  latencyMs: number | null;
  message: string;
  exitIp: string;
}

const TARGET_HOST = 'api.ipify.org';
const TARGET_PORT = 80;
const HEAD_END = '\r\n\r\n';

class Reader {
  private buf: Buffer = Buffer.alloc(0);
  private waiters: (() => void)[] = [];
  private error: Error | null = null;
  private closed = false;

  constructor(socket: net.Socket) {
    socket.on('data', (d: Buffer) => {
      this.buf = Buffer.concat([this.buf, d]);
      this.wake();
    });
    socket.on('error', (e: Error) => {
      this.error = e;
      this.wake();
    });
    socket.on('close', () => {
      this.closed = true;
      this.wake();
    });
  }

  private wake(): void {
    const pending = this.waiters;
    this.waiters = [];
    for (const resolve of pending) resolve();
  }

  private async until<T>(pick: () => T | null, onClosed: () => T | null): Promise<T> {
    for (;;) {
      const value = pick();
      if (value !== null) return value;
      if (this.error) throw this.error;
      if (this.closed) {
        const last = onClosed();
        if (last !== null) return last;
        throw new Error('Connection closed by proxy');
      }
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
  }

  take(n: number): Promise<Buffer> {
    return this.until(
      () => {
        if (this.buf.length < n) return null;
        const out = this.buf.subarray(0, n);
        this.buf = this.buf.subarray(n);
        return out;
      },
      () => null,
    );
  }

  takeUntil(delimiter: string): Promise<Buffer> {
    return this.until(
      () => {
        const idx = this.buf.indexOf(delimiter);
        if (idx === -1) return null;
        const end = idx + delimiter.length;
        const out = this.buf.subarray(0, end);
        this.buf = this.buf.subarray(end);
        return out;
      },
      () => null,
    );
  }

  drain(): Promise<Buffer> {
    return this.until(
      () => null,
      () => this.buf,
    );
  }
}

function openSocket(p: ProbeTarget, timeoutMs: number): Promise<{ socket: net.Socket; reader: Reader }> {
  return new Promise((resolve, reject) => {
    const secure = p.protocol === 'https';
    const socket: net.Socket = secure
      ? tls.connect({
          host: p.host,
          port: p.port,
          servername: net.isIP(p.host) ? undefined : p.host,
          rejectUnauthorized: false, // ASSUMED: proxy endpoints often use self-signed certs — upgrade path: make this a per-proxy setting
        })
      : net.connect({ host: p.host, port: p.port });
    const reader = new Reader(socket);
    socket.setNoDelay(true);
    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => socket.destroy(new Error('Connection timed out')));
    const onError = (e: Error): void => reject(e);
    socket.once('error', onError);
    socket.once(secure ? 'secureConnect' : 'connect', () => {
      socket.removeListener('error', onError);
      resolve({ socket, reader });
    });
  });
}

async function handshakeHttp(p: ProbeTarget, socket: net.Socket, reader: Reader): Promise<void> {
  let auth = '';
  if (p.username) {
    const token = Buffer.from(p.username + ':' + p.password).toString('base64');
    auth = `Proxy-Authorization: Basic ${token}\r\n`;
  }
  socket.write(`CONNECT ${TARGET_HOST}:${TARGET_PORT} HTTP/1.1\r\nHost: ${TARGET_HOST}:${TARGET_PORT}\r\n${auth}\r\n`);
  const head = (await reader.takeUntil(HEAD_END)).toString('latin1');
  const status = parseInt(head.split(' ')[1] ?? '', 10);
  if (status === 407) throw new Error('Proxy authentication failed (407)');
  if (status !== 200) throw new Error(`Proxy refused CONNECT (${Number.isNaN(status) ? 'bad response' : status})`);
}

async function handshakeSocks5(p: ProbeTarget, socket: net.Socket, reader: Reader): Promise<void> {
  const useAuth = p.username !== '';
  socket.write(Buffer.from(useAuth ? [5, 2, 0, 2] : [5, 1, 0]));
  const choice = await reader.take(2);
  if (choice[0] !== 5) throw new Error('Not a SOCKS5 server');
  if (choice[1] === 0xff) throw new Error('SOCKS5: no acceptable authentication method');
  if (choice[1] === 2) {
    const user = Buffer.from(p.username);
    const pass = Buffer.from(p.password);
    socket.write(Buffer.concat([Buffer.from([1, user.length]), user, Buffer.from([pass.length]), pass]));
    const res = await reader.take(2);
    if (res[1] !== 0) throw new Error('SOCKS5 authentication failed');
  }
  const host = Buffer.from(TARGET_HOST);
  socket.write(
    Buffer.concat([Buffer.from([5, 1, 0, 3, host.length]), host, Buffer.from([TARGET_PORT >> 8, TARGET_PORT & 255])]),
  );
  const head = await reader.take(4);
  if (head[1] !== 0) throw new Error(`SOCKS5 connect failed (code ${head[1]})`);
  if (head[3] === 1) await reader.take(6);
  else if (head[3] === 4) await reader.take(18);
  else {
    const len = (await reader.take(1))[0];
    await reader.take(len + 2);
  }
}

async function handshakeSocks4(p: ProbeTarget, socket: net.Socket, reader: Reader): Promise<void> {
  const { address } = await dns.promises.lookup(TARGET_HOST, { family: 4 });
  const ip = address.split('.').map(Number);
  const user = Buffer.from(p.username);
  socket.write(
    Buffer.concat([Buffer.from([4, 1, TARGET_PORT >> 8, TARGET_PORT & 255, ...ip]), user, Buffer.from([0])]),
  );
  const res = await reader.take(8);
  if (res[1] !== 90) throw new Error(`SOCKS4 request rejected (code ${res[1]})`);
}

function extractIp(body: string): string {
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return '';
  try {
    const parsed = JSON.parse(body.slice(start, end + 1)) as { ip?: unknown };
    return typeof parsed.ip === 'string' ? parsed.ip : '';
  } catch {
    return '';
  }
}

// Opens a tunnel through the proxy to api.ipify.org:80 and reads the exit IP — verifies reachability, auth and real egress
export async function probeProxy(p: ProbeTarget, timeoutMs: number): Promise<ProbeResult> {
  const started = Date.now();
  let socket: net.Socket | null = null;
  try {
    const opened = await openSocket(p, timeoutMs);
    socket = opened.socket;
    const { reader } = opened;
    if (p.protocol === 'socks5') await handshakeSocks5(p, socket, reader);
    else if (p.protocol === 'socks4') await handshakeSocks4(p, socket, reader);
    else await handshakeHttp(p, socket, reader);

    socket.write(
      `GET /?format=json HTTP/1.1\r\nHost: ${TARGET_HOST}\r\nUser-Agent: phantoma-proxy-check\r\nConnection: close\r\n\r\n`,
    );
    const head = (await reader.takeUntil(HEAD_END)).toString('latin1');
    const status = parseInt(head.split(' ')[1] ?? '', 10);
    if (status !== 200) throw new Error(`Target returned ${Number.isNaN(status) ? 'invalid response' : status}`);
    const exitIp = extractIp((await reader.drain()).toString('utf8'));
    const latencyMs = Date.now() - started;
    return { ok: true, latencyMs, message: exitIp ? 'Exit IP resolved' : 'Connected', exitIp };
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : 'Connection failed';
    return { ok: false, latencyMs: null, message, exitIp: '' };
  } finally {
    socket?.destroy();
  }
}