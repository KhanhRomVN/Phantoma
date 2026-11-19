import { execFile } from 'child_process';
import net from 'net';
import { AppError } from './http';

export const LOCAL_HOST = '127.0.0.1';
const LOG_LINES = 50;

export function run(command: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) {
        const detail = (stderr || err.message).trim().split('\n').slice(-2).join(' ');
        reject(new AppError(`${command} ${args.join(' ')} failed: ${detail}`, 502));
        return;
      }
      resolve(stdout);
    });
  });
}

export function probePort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect(port, LOCAL_HOST);
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, LOCAL_HOST, () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

export async function waitForPort(port: number, timeoutMs: number, alive: () => boolean): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (!alive()) return false;
    if (await probePort(port)) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

export function collectLogs(logs: string[], stream: NodeJS.ReadableStream | null): void {
  stream?.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim() === '') continue;
      logs.push(line.trim());
      if (logs.length > LOG_LINES) logs.shift();
    }
  });
}