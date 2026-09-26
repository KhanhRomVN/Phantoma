/**
 * ------------------------------------------------------------------
 * EbpfCapture - eBPF-based HTTPS Capture Module
 * ------------------------------------------------------------------
 * Captures plaintext HTTPS traffic using eBPF (ecapture tool).
 * Hooks SSL_write/SSL_read at kernel level BEFORE encryption.
 * 
 * Captures: Full plaintext HTTP/HTTPS requests and responses
 * Preserves: SSL/TLS signatures (no re-encryption)
 * 
 * Requirements: Linux kernel 4.18+, root/CAP_BPF capability
 * 
 * Main functions:
 * - start()   : Start eBPF capture for target process
 * - stop()    : Stop eBPF capture
 * - parse()   : Parse ecapture output to HTTP events
 * ------------------------------------------------------------------
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import { logger } from '../utils/logger';

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
  private window: BrowserWindow | null = null;
  private isRunning: boolean = false;
  private buffer: string = '';

  constructor(window: BrowserWindow) {
    super();
    this.window = window;
  }

  public async start(options: EbpfCaptureOptions): Promise<void> {
    if (this.isRunning) {
      throw new Error('eBPF capture already running');
    }

    // Check if ecapture is available
    const ecapturePath = await this.findEcapture();
    if (!ecapturePath) {
      throw new Error(
        'ecapture not found. Install: https://github.com/gojue/ecapture'
      );
    }

    logger.info(
      `[EbpfCapture] Starting capture for PID ${options.targetPid} (exe: ${options.targetExe || 'n/a'})`,
    );

    // ecapture 'tls' subcommand hooks SSL_write/SSL_read.
    // Binary must have caps: cap_bpf,cap_perfmon,cap_sys_admin (set once via setcap).
    const args = [
      'tls',
      '--pid', options.targetPid.toString(),
      '--hex', // Output hex for binary data
    ];

    logger.info(`[EbpfCapture] Spawning: ${ecapturePath} ${args.join(' ')}`);

    try {
      this.process = spawn(ecapturePath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // ecapture writes debug/info logs; keep locale predictable
          LC_ALL: 'C',
        },
      });

      this.isRunning = true;

      // Parse stdout (ecapture writes captured events to stdout)
      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        logger.debug('[EbpfCapture] stdout chunk:', text.slice(0, 200));
        this.buffer += text;
        this.parseBuffer();
      });

      // ecapture writes progress/errors to stderr — log verbatim
      this.process.stderr?.on('data', (data: Buffer) => {
        logger.warn('[EbpfCapture] stderr:', data.toString());
      });

      this.process.on('error', (err) => {
        logger.error('[EbpfCapture] Spawn error:', err);
        this.isRunning = false;
        this.process = null;
      });

      // Handle exit
      this.process.on('exit', (code, signal) => {
        logger.info(
          `[EbpfCapture] Process exited with code ${code}, signal ${signal ?? 'none'}`,
        );
        this.isRunning = false;
        this.process = null;
      });

      this.emit('started');
    } catch (error) {
      logger.error('[EbpfCapture] Failed to start:', error);
      throw error;
    }
  }

  public stop(): void {
    if (this.process) {
      logger.info('[EbpfCapture] Stopping capture');
      this.process.kill('SIGTERM');
      this.process = null;
      this.isRunning = false;
      this.emit('stopped');
    }
  }

  private async findEcapture(): Promise<string | null> {
    // Check common install locations first, then PATH. setcap requires the
    // exact binary path, and pkexec/polkit inject a different PATH.
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
        // not present, try next
      }
    }

    return new Promise((resolve) => {
      const which = spawn('which', ['ecapture']);
      let path = '';
      which.stdout.on('data', (data) => {
        path += data.toString().trim();
      });
      which.on('exit', (code) => {
        resolve(code === 0 ? path : null);
      });
    });
  }

  private parseBuffer(): void {
    // Parse ecapture output format
    // Example:
    // [SSL_write] [PID:12345] [TID:67890]
    // GET /api/chat HTTP/1.1
    // Host: api.cline.bot
    // ...
    
    const lines = this.buffer.split('\n');
    let currentEvent: Partial<HttpsEvent> | null = null;
    let headers: Record<string, string> = {};
    let body = '';
    let inBody = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect SSL_write/SSL_read
      if (line.includes('[SSL_write]') || line.includes('[SSL_read]')) {
        // Save previous event
        if (currentEvent) {
          currentEvent.headers = headers;
          currentEvent.body = body;
          this.sendEvent(currentEvent as HttpsEvent);
        }

        // Start new event
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

      // Parse HTTP request line
      if (line.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+/)) {
        const [method, url] = line.split(' ');
        currentEvent.method = method;
        currentEvent.url = url;
        continue;
      }

      // Parse HTTP response status
      if (line.match(/^HTTP\/\d\.\d\s+(\d+)/)) {
        const match = line.match(/^HTTP\/\d\.\d\s+(\d+)/);
        if (match) {
          currentEvent.statusCode = parseInt(match[1]);
        }
        continue;
      }

      // Parse headers
      if (!inBody && line.includes(':')) {
        const colonIdx = line.indexOf(':');
        const key = line.substring(0, colonIdx).trim();
        const value = line.substring(colonIdx + 1).trim();
        headers[key] = value;
        continue;
      }

      // Empty line = end of headers
      if (line.trim() === '' && Object.keys(headers).length > 0) {
        inBody = true;
        continue;
      }

      // Body content
      if (inBody) {
        body += line + '\n';
      }
    }

    // Keep incomplete data in buffer
    this.buffer = lines[lines.length - 1] || '';
  }

  private sendEvent(event: HttpsEvent): void {
    logger.debug('[EbpfCapture] Captured event:', event.type, event.url || event.statusCode);
    this.sendToRenderer('ebpf:https-event', event);
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
    };
  }
}
