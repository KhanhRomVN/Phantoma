/**
 * ------------------------------------------------------------------
 * EbpfCapture (port từ src/main/capture/EbpfCapture.ts)
 * ------------------------------------------------------------------
 * Thay BrowserWindow + webContents.send → runtimeBus.emitEvent.
 * ------------------------------------------------------------------
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { runtimeBus } from '../event-bus';
import { createLogger } from '../../utils/logger';

const logger = createLogger('EbpfCapture');

export interface EbpfCaptureOptions {
  targetPid: number;
  targetExe?: string;
}

export interface HttpsEvent {
  id: string;
  timestamp: number;
  type: 'request' | 'response';
  method?: string;
  url?: string;
  headers: Record<string, string>;
  body: string;
  statusCode?: number;
}

export class EbpfCapture extends EventEmitter {
  private process: ChildProcess | null = null;
  private isRunning = false;
  private buffer = '';

  constructor(_window?: unknown) {
    super();
  }

  public async start(options: EbpfCaptureOptions): Promise<void> {
    if (this.isRunning) {
      throw new Error('eBPF capture already running');
    }

    const ecapturePath = await this.findEcapture();
    if (!ecapturePath) {
      throw new Error('ecapture not found. Install: https://github.com/gojue/ecapture');
    }

    logger.info(
      `Starting capture for PID ${options.targetPid} (exe: ${options.targetExe || 'n/a'})`,
    );

    const args = ['tls', '--pid', options.targetPid.toString(), '--hex'];

    logger.info(`Spawning: ${ecapturePath} ${args.join(' ')}`);

    try {
      this.process = spawn(ecapturePath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, LC_ALL: 'C' },
      });

      this.isRunning = true;

      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        logger.debug(`stdout chunk: ${text.slice(0, 200)}`);
        this.buffer += text;
        this.parseBuffer();
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        logger.warn(`stderr: ${data.toString()}`);
      });

      this.process.on('error', (err) => {
        logger.error('Spawn error', { err: String(err) });
        this.isRunning = false;
        this.process = null;
      });

      this.process.on('exit', (code, signal) => {
        logger.info(`Process exited with code ${code}, signal ${signal ?? 'none'}`);
        this.isRunning = false;
        this.process = null;
      });

      this.emit('started');
    } catch (error) {
      logger.error('Failed to start', { err: String(error) });
      throw error;
    }
  }

  public stop(): void {
    if (this.process) {
      logger.info('Stopping capture');
      this.process.kill('SIGTERM');
      this.process = null;
      this.isRunning = false;
      this.emit('stopped');
    }
  }

  private async findEcapture(): Promise<string | null> {
    const candidates = [
      '/usr/local/bin/ecapture',
      '/usr/bin/ecapture',
      '/opt/ecapture/ecapture',
    ];

    const { accessSync, constants } = await import('fs');
    for (const candidate of candidates) {
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        // try next
      }
    }

    return new Promise((resolve) => {
      const which = spawn('which', ['ecapture']);
      let p = '';
      which.stdout.on('data', (data) => {
        p += data.toString().trim();
      });
      which.on('exit', (code) => {
        resolve(code === 0 ? p : null);
      });
    });
  }

  private parseBuffer(): void {
    const lines = this.buffer.split('\n');
    let currentEvent: Partial<HttpsEvent> | null = null;
    let headers: Record<string, string> = {};
    let body = '';
    let inBody = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('[SSL_write]') || line.includes('[SSL_read]')) {
        if (currentEvent) {
          currentEvent.headers = headers;
          currentEvent.body = body;
          this.sendEvent(currentEvent as HttpsEvent);
        }

        currentEvent = {
          id: `ebpf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
          type: line.includes('[SSL_write]') ? 'request' : 'response',
        };
        headers = {};
        body = '';
        inBody = false;
        continue;
      }

      if (!currentEvent) continue;

      if (line.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+/)) {
        const [method, url] = line.split(' ');
        currentEvent.method = method;
        currentEvent.url = url;
        continue;
      }

      if (line.match(/^HTTP\/\d\.\d\s+(\d+)/)) {
        const match = line.match(/^HTTP\/\d\.\d\s+(\d+)/);
        if (match) {
          currentEvent.statusCode = parseInt(match[1]);
        }
        continue;
      }

      if (!inBody && line.includes(':')) {
        const colonIdx = line.indexOf(':');
        const key = line.substring(0, colonIdx).trim();
        const value = line.substring(colonIdx + 1).trim();
        headers[key] = value;
        continue;
      }

      if (line.trim() === '' && Object.keys(headers).length > 0) {
        inBody = true;
        continue;
      }

      if (inBody) {
        body += line + '\n';
      }
    }

    this.buffer = lines[lines.length - 1] || '';
  }

  private sendEvent(event: HttpsEvent): void {
    logger.debug(`Captured event: ${event.type} ${event.url || event.statusCode}`);
    runtimeBus.emitEvent('ebpf:https-event', event);
  }

  public getStatus() {
    return { isRunning: this.isRunning };
  }
}