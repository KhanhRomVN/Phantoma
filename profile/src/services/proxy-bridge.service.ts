import net from 'net';
import { createLogger } from '../utils/logger';

const logger = createLogger('ProxyBridge');

const HANDSHAKE_TIMEOUT_MS = 15000;

// ASSUMED: an https upstream is treated as a plain HTTP CONNECT proxy (no TLS to the proxy itself) — upgrade path: tls.connect when protocol is https
export interface UpstreamProxy {
  protocol: 'socks5' | 'http' | 'https';
  host: string;
  port: number;
  user: string;
  pass: string;
}

export interface ProxyBridge {
  port: number;
  close: () => void;
}

const errMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

class Reader {
  private buf = Buffer.alloc(0);
  private error: Error | null = null;
  private wake: (() => void) | null = null;

  private readonly onData = (d: Buffer): void => {
    this.buf = Buffer.concat([this.buf, d]);
    this.notify();
  };
  private readonly onError = (e: Error): void => {
    this.error = e;
    this.notify();
  };
  private readonly onClose = (): void => {
    if (!this.error) this.error = new Error('connection closed');
    this.notify();
  };

  constructor(private readonly socket: net.Socket) {
    socket.on('data', this.onData);
    socket.on('error', this.onError);
    socket.on('close', this.onClose);
  }

  private notify(): void {
    const w = this.wake;
    this.wake = null;
    w?.();
  }

  private async fill(): Promise<void> {
    if (this.error) throw this.error;
    await new Promise<void>((resolve) => {
      this.wake = resolve;
    });
  }

  async read(n: number): Promise<Buffer> {
    while (this.buf.length < n) await this.fill();
    const out = this.buf.subarray(0, n);
    this.buf = this.buf.subarray(n);
    return out;
  }

  async readHead(): Promise<string> {
    let end = this.buf.indexOf('\r\n\r\n');
    while (end === -1) {
      await this.fill();
      end = this.buf.indexOf('\r\n\r\n');
    }
    const head = this.buf.subarray(0, end).toString('latin1');
    this.buf = this.buf.subarray(end + 4);
    return head;
  }

  detach(): Buffer {
    this.socket.off('data', this.onData);
    this.socket.off('error', this.onError);
    this.socket.off('close', this.onClose);
    this.socket.pause();
    return this.buf;
  }
}

async function handshakeSocks5(
  up: UpstreamProxy,
  socket: net.Socket,
  r: Reader,
  host: string,
  port: number,
): Promise<void> {
  socket.write(Buffer.from(up.user ? [5, 2, 0, 2] : [5, 1, 0]));
  const choice = await r.read(2);
  if (choice[0] !== 5 || choice[1] === 0xff)
    throw new Error('upstream SOCKS5: no acceptable authentication method');
  if (choice[1] === 2) {
    const u = Buffer.from(up.user);
    const p = Buffer.from(up.pass);
    socket.write(Buffer.concat([Buffer.from([1, u.length]), u, Buffer.from([p.length]), p]));
    const res = await r.read(2);
    if (res[1] !== 0) throw new Error('upstream SOCKS5: authentication failed');
  }
  const h = Buffer.from(host);
  socket.write(
    Buffer.concat([Buffer.from([5, 1, 0, 3, h.length]), h, Buffer.from([port >> 8, port & 255])]),
  );
  const head = await r.read(4);
  if (head[1] !== 0) throw new Error(`upstream SOCKS5: connect failed (code ${head[1]})`);
  const addrLen = head[3] === 1 ? 4 : head[3] === 4 ? 16 : (await r.read(1))[0];
  await r.read(addrLen + 2);
}

async function handshakeHttp(
  up: UpstreamProxy,
  socket: net.Socket,
  r: Reader,
  host: string,
  port: number,
): Promise<void> {
  const auth = up.user
    ? `Proxy-Authorization: Basic ${Buffer.from(`${up.user}:${up.pass}`).toString('base64')}\r\n`
    : '';
  socket.write(`CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\n${auth}\r\n`);
  const head = await r.readHead();
  if (!/^HTTP\/1\.[01] 200/.test(head))
    throw new Error(`upstream HTTP proxy refused: ${head.split('\r\n')[0]}`);
}

async function dialUpstream(up: UpstreamProxy, host: string, port: number): Promise<net.Socket> {
  const socket = net.connect(up.port, up.host);
  socket.setTimeout(HANDSHAKE_TIMEOUT_MS, () =>
    socket.destroy(new Error('upstream handshake timeout')),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('error', reject);
    });
    const r = new Reader(socket);
    if (up.protocol === 'socks5') await handshakeSocks5(up, socket, r, host, port);
    else await handshakeHttp(up, socket, r, host, port);
    const left = r.detach();
    socket.setTimeout(0);
    if (left.length) socket.unshift(left);
    return socket;
  } catch (err) {
    socket.destroy();
    throw err;
  }
}

function serve(client: net.Socket, up: UpstreamProxy, sockets: Set<net.Socket>): void {
  sockets.add(client);
  client.once('close', () => sockets.delete(client));
  const r = new Reader(client);

  const run = async (): Promise<void> => {
    const greet = await r.read(2);
    await r.read(greet[1]);
    client.write(Buffer.from([5, 0]));
    const head = await r.read(4);
    if (head[0] !== 5 || head[1] !== 1) throw new Error('unsupported SOCKS request');
    let host: string;
    if (head[3] === 1) host = Array.from(await r.read(4)).join('.');
    else if (head[3] === 3) host = (await r.read((await r.read(1))[0])).toString();
    else {
      const b = await r.read(16);
      host = Array.from({ length: 8 }, (_, i) => b.readUInt16BE(i * 2).toString(16)).join(':');
    }
    const port = (await r.read(2)).readUInt16BE(0);
    const upstream = await dialUpstream(up, host, port);
    sockets.add(upstream);
    upstream.once('close', () => sockets.delete(upstream));
    client.write(Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]));
    const left = r.detach();
    if (left.length) upstream.write(left);
    const closeBoth = (): void => {
      client.destroy();
      upstream.destroy();
    };
    client.on('error', closeBoth);
    upstream.on('error', closeBoth);
    client.on('close', closeBoth);
    upstream.on('close', closeBoth);
    client.pipe(upstream);
    upstream.pipe(client);
  };

  run().catch((err) => {
    logger.warn(`Bridge connection failed: ${errMessage(err)}`);
    client.destroy();
  });
}

export function startProxyBridge(up: UpstreamProxy): Promise<ProxyBridge> {
  return new Promise((resolve, reject) => {
    const sockets = new Set<net.Socket>();
    const server = net.createServer((client) => serve(client, up, sockets));
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      resolve({
        port,
        close: () => {
          server.close();
          for (const s of sockets) s.destroy();
        },
      });
    });
  });
}
