import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { createLogger, F } from '../../utils/logger.util';
import { wssHub } from '../realtime/wss-hub.service';

const logger = createLogger('SslBypass');
const CHANNEL = 'mobile:ssl-bypass-output';
// ASSUMED: assets/ nằm cạnh dist/ (build) và cạnh src/ (dev), giống arm-translation.service.ts
const SCRIPT_PATH = path.join(__dirname, '..', '..', 'assets', 'frida-ssl-bypass.js');

function emitLine(serial: string, packageName: string, line: string): void {
  wssHub.broadcast({ type: CHANNEL, data: { serial, packageName, line } });
}

class SslBypassService {
  private procs = new Map<string, ChildProcess>();

  private key(serial: string, packageName: string): string {
    return `${serial}::${packageName}`;
  }

  isRunning(serial: string, packageName: string): boolean {
    return this.procs.has(this.key(serial, packageName));
  }

  async start(serial: string, packageName: string): Promise<void> {
    const key = this.key(serial, packageName);
    if (this.procs.has(key)) return;

    const proc = spawn('frida', ['-U', '-f', packageName, '-l', SCRIPT_PATH, '--no-pause'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.procs.set(key, proc);

    proc.stdout?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split(/\r?\n/)) {
        if (line) emitLine(serial, packageName, line);
      }
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      const msg = chunk.toString('utf8').trim();
      if (msg) {
        logger.error(
          'frida stderr',
          F('serial', serial),
          F('package', packageName),
          F('error', msg),
        );
        emitLine(serial, packageName, `[stderr] ${msg}`);
      }
    });
    proc.on('error', (err) => {
      logger.error('Failed to spawn frida', F('error', err.message));
      emitLine(
        serial,
        packageName,
        `[error] Failed to run frida: ${err.message} (is frida-tools installed?)`,
      );
      this.procs.delete(key);
    });
    proc.on('close', (code) => {
      this.procs.delete(key);
    });
  }

  async stop(serial: string, packageName: string): Promise<void> {
    const key = this.key(serial, packageName);
    const proc = this.procs.get(key);
    if (!proc) return;
    proc.kill();
    this.procs.delete(key);
  }
}

export const sslBypassService = new SslBypassService();
