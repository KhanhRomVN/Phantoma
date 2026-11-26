import { execFile } from 'child_process';
import * as net from 'net';
import { createLogger, F } from '../../utils/logger.util';
import type { TransparentProxyInfo } from '../../types/mobile.type';

const logger = createLogger('TransparentProxy');
const CMD_TIMEOUT_MS = 10000;
const IFACE_RE = /^[a-zA-Z0-9_.:-]{1,15}$/;

interface Session extends TransparentProxyInfo {
  servers: net.Server[];
  rules: string[][];
}

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: CMD_TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.toString().trim() || err.message));
      resolve(stdout.toString());
    });
  });
}

// ASSUMED: sudo chạy được không cần mật khẩu (sudo -n) — upgrade path: setcap/polkit rule
const sudo = (args: string[]) => run('sudo', ['-n', ...args]);

const swapFlag = (rule: string[], from: string, to: string) =>
  rule.map((a) => (a === from ? to : a));

function parseSni(buf: Buffer): string | null {
  if (buf.length < 44 || buf[0] !== 0x16 || buf[5] !== 0x01) return null;
  let p = 5 + 4 + 2 + 32;
  p += 1 + buf[p];
  if (p + 2 > buf.length) return null;
  p += 2 + buf.readUInt16BE(p);
  if (p + 1 > buf.length) return null;
  p += 1 + buf[p];
  if (p + 2 > buf.length) return null;
  const extEnd = Math.min(p + 2 + buf.readUInt16BE(p), buf.length);
  p += 2;
  while (p + 4 <= extEnd) {
    const type = buf.readUInt16BE(p);
    const len = buf.readUInt16BE(p + 2);
    p += 4;
    if (type === 0 && p + 5 <= buf.length) {
      const nameLen = buf.readUInt16BE(p + 3);
      return buf.toString('ascii', p + 5, p + 5 + nameLen);
    }
    p += len;
  }
  return null;
}

function parseHost(text: string): string | null {
  const m = text.match(/\r\nhost:\s*([^\r\n]+)/i);
  return m ? m[1].trim() : null;
}

function handleConnection(
  socket: net.Socket,
  targetPort: number,
  proxyPort: number,
  isTls: boolean,
) {
  socket.on('error', () => socket.destroy());
  socket.once('data', (chunk: Buffer) => {
    socket.pause();
    const text = chunk.toString('latin1');
    const host = isTls ? parseSni(chunk) : parseHost(text);
    if (!host) return socket.destroy();

    const upstream = net.connect(proxyPort, '127.0.0.1');
    upstream.on('error', () => socket.destroy());
    socket.on('close', () => upstream.destroy());

    if (isTls) {
      upstream.once('connect', () => {
        upstream.write(
          `CONNECT ${host}:${targetPort} HTTP/1.1\r\nHost: ${host}:${targetPort}\r\n\r\n`,
        );
      });
      let buf = Buffer.alloc(0);
      const onData = (d: Buffer) => {
        buf = Buffer.concat([buf, d]);
        const end = buf.indexOf('\r\n\r\n');
        if (end < 0) return;
        upstream.pause();
        upstream.off('data', onData);
        if (!buf.toString('latin1', 0, end).includes(' 200')) {
          socket.destroy();
          return upstream.destroy();
        }
        const rest = buf.subarray(end + 4);
        if (rest.length) socket.write(rest);
        upstream.write(chunk);
        socket.pipe(upstream);
        upstream.pipe(socket);
      };
      upstream.on('data', onData);
      return;
    }

    const nl = text.indexOf('\r\n');
    const m = nl > 0 ? text.slice(0, nl).match(/^(\S+) (\S+) (HTTP\/\d\.\d)$/) : null;
    if (!m) {
      socket.destroy();
      return upstream.destroy();
    }
    // ASSUMED: chỉ viết lại request-line đầu tiên — upgrade path: parse từng request khi keep-alive
    const target = m[2].startsWith('http') ? m[2] : `http://${host}${m[2]}`;
    const rewritten = Buffer.from(`${m[1]} ${target} ${m[3]}${text.slice(nl)}`, 'latin1');
    upstream.once('connect', () => {
      upstream.write(rewritten);
      socket.pipe(upstream);
      upstream.pipe(socket);
    });
  });
}

function listen(targetPort: number, proxyPort: number, isTls: boolean): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((s) => handleConnection(s, targetPort, proxyPort, isTls));
    server.once('error', reject);
    server.listen(0, '0.0.0.0', () => resolve(server));
  });
}

class TransparentProxyService {
  private sessions = new Map<string, Session>();

  async start(id: string, iface: string, proxyPort: number): Promise<TransparentProxyInfo> {
    const existing = this.sessions.get(id);
    if (existing) return existing;
    if (!IFACE_RE.test(iface)) throw new Error(`Invalid interface name: ${iface}`);

    const httpServer = await listen(80, proxyPort, false);
    const tlsServer = await listen(443, proxyPort, true);
    const httpPort = (httpServer.address() as net.AddressInfo).port;
    const tlsPort = (tlsServer.address() as net.AddressInfo).port;
    const session: Session = {
      iface,
      httpPort,
      tlsPort,
      proxyPort,
      servers: [httpServer, tlsServer],
      rules: [80, 443].map((dport) => [
        '-t',
        'nat',
        '-A',
        'PREROUTING',
        '-p',
        'tcp',
        '-i',
        iface,
        '--dport',
        String(dport),
        '-j',
        'REDIRECT',
        '--to-port',
        String(dport === 80 ? httpPort : tlsPort),
      ]),
    };
    this.sessions.set(id, session);

    try {
      await sudo(['sysctl', '-w', 'net.ipv4.ip_forward=1']);
      for (const rule of session.rules) {
        await sudo(['iptables', ...swapFlag(rule, '-A', '-C')]).catch(() =>
          sudo(['iptables', ...rule]),
        );
      }
      return session;
    } catch (err) {
      await this.stop(id);
      throw err;
    }
  }

  async stop(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) return;
    this.sessions.delete(id);
    for (const rule of session.rules) {
      await sudo(['iptables', ...swapFlag(rule, '-A', '-D')]).catch((err) =>
        logger.warn('iptables delete failed', F('error', String(err))),
      );
    }
    await Promise.all(session.servers.map((s) => new Promise<void>((r) => s.close(() => r()))));
  }

  status(id: string): TransparentProxyInfo | null {
    return this.sessions.get(id) ?? null;
  }
}

export const transparentProxyService = new TransparentProxyService();
