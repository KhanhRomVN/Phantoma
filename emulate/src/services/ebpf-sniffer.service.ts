/**
 * ------------------------------------------------------------------
 * EBPF TLS Sniffer Service
 * ------------------------------------------------------------------
 * Uses eBPF uprobes (via ecapture/sslsniff) to capture plaintext SSL/TLS
 * traffic from arbitrary processes (CLI apps, daemons, etc.).
 *
 * Unlike MITM proxies, this works at the kernel level and does not require
 * modifying client certificates or proxy settings. It reads data directly
 * from OpenSSL/GnuTLS/NSS memory buffers before encryption happens.
 *
 * Requires:
 * - Linux Kernel >= 4.18 with BTF support
 * - Root privileges or CAP_BPF + CAP_PERFMON
 * - 'ecapture' binary installed in PATH
 * ------------------------------------------------------------------
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import readline from 'readline';
import { logger } from '../utils/logger';

export interface EbpfEvent {
  type: 'request' | 'response' | 'error';
  timestamp: number;
  pid?: number;
  comm?: string; // Process name
  fd?: number; // File descriptor
  len?: number; // Data length
  buf?: string; // Plaintext content (base64 decoded if needed, usually raw string for text protocols)
  direction?: 'uprobe_enter' | 'uprobe_exit';
}

class EbpfSnifferService extends EventEmitter {
  private process: ChildProcess | null = null;
  private isRunning = false;
  private targetPid?: number; // Optional filter by PID

  constructor() {
    super();
  }

  /**
   * Start capturing TLS traffic using ecapture.
   * @param options.pid Filter by specific Process ID. If undefined, captures all.
   * @param options.sudoPassword Password for sudo authentication via stdin (-S flag).
   */
  public async start(options: { pid?: number; sudoPassword?: string }): Promise<boolean> {
    if (this.isRunning) {
      logger.warn('[EbpfSniffer] Already running. Stop first.');
      return false;
    }

    this.targetPid = options.pid;

    // Construct arguments for ecapture tls
    // IMPORTANT: Current eCapture builds do NOT support '--output json'.
    // Default mode is '-m text' which outputs human-readable logs/plain text buffers.
    // We must adapt parsing accordingly. Using strict PID filter requires root/sudo.
    const args = ['tls', '-m', 'text']; // Explicitly set model to text

    if (options.pid) {
      args.push('--pid', String(options.pid));
    }

    try {
      // Use sudo -S to read password from stdin, avoiding interactive terminal prompts.
      const sudoArgs = ['-S', 'ecapture', ...args];

      this.process = spawn('sudo', sudoArgs, {
        stdio: ['pipe', 'pipe', 'pipe'], // Pipe stdin for password, stdout/stderr for data/logs
        env: { ...process.env, TERM: 'dumb' },
      });

      // --- SUDO PASSWORD HANDLING ---
      // Must write immediately and close stream to prevent hanging or double-prompting.
      if (this.process.stdin) {
        const stdinStream = this.process.stdin;

        // Attach error handler BEFORE writing to catch early EPIPE (wrong password/immediate exit)
        stdinStream.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EPIPE') {
            logger.warn(
              '[EbpfSniffer] Stdin closed prematurely (likely auth failure or instant exit).',
            );
          } else {
            logger.error('[EbpfSniffer] Unexpected stdin error:', err.message);
          }
        });

        if (options.sudoPassword) {
          stdinStream.write(`${options.sudoPassword}\n`);
          stdinStream.end();
        } else {
          logger.warn('[EbpfSniffer] No sudo password provided. Closing stdin.');
          stdinStream.end();
        }
      }

      if (!this.process.stdout || !this.process.stderr) {
        throw new Error('Failed to pipe stdout/stderr from ecapture');
      }

      this.setupListeners();
      this.isRunning = true;

      return true;
    } catch (err: any) {
      logger.error('[EbpfSniffer] Failed to start:', err.message);
      this.cleanup();
      return false;
    }
  }

  /**
   * Stop the sniffer and cleanup resources.
   */
  public stop(): void {
    if (!this.isRunning || !this.process) return;
    this.process.kill('SIGINT'); // Graceful shutdown

    // Force kill after timeout if it doesn't exit
    setTimeout(() => {
      if (this.process && !this.process.killed) {
        this.process.kill('SIGKILL');
      }
    }, 2000);

    this.cleanup();
  }

  private setupListeners(): void {
    if (!this.process?.stdout) return;

    const rl = readline.createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity,
    });

    rl.on('line', (line: string) => {
      if (!line.trim()) return;

      // Attempt to parse as JSON first (some builds/versions may support it via env or specific flags not shown in help)
      try {
        const data = JSON.parse(line);
        this.handleRawEvent(data);
        return;
      } catch (err) {
        // Not JSON — likely raw text/log output from '-m text' mode.
        // For now, we log it so you can see the actual format and adapt parsing later.
        // We also emit a simplified event if it looks like HTTP traffic pattern heuristics apply,
        // but safest is to just log for debugging purposes initially.

        // Heuristic: Check if it contains typical HTTP markers to avoid logging pure noise
        if (
          line.includes('GET ') ||
          line.includes('POST ') ||
          line.includes('HTTP/') ||
          line.includes('Host:')
        ) {
          // Create a pseudo-event for UI compatibility if needed immediately,
          // though proper parsing requires knowing exact delimiters of your eCapture version.
          // Emitting raw buffer for now allows inspection in DevTools/WSS hub if wired up correctly.
          this.emit('ebpf:data', {
            type: 'request', // Default assumption
            timestamp: Date.now(),
            buf: line, // Pass raw text
            comm: 'ecapture-text-mode',
            direction: 'uprobe_enter',
          });
        }
      }
    });

    this.process.stderr?.on('data', (chunk: Buffer) => {
      const msg = chunk.toString().trim();

      // Ignore sudo authentication prompts/noise to prevent false error emissions
      if (msg.includes('[sudo]') || msg.toLowerCase().includes('password')) {
        return;
      }

      if (msg.includes('Error') || msg.includes('Permission denied') || msg.includes('failed')) {
        logger.error('[EbpfSniffer Stderr]', msg);
        this.emit('ebpf:error', { message: msg });
      }
    });

    this.process.on('exit', (code) => {
      this.isRunning = false;
      this.process = null;
      this.emit('ebpf:stopped', { code });
    });
  }

  /**
   * Parse ecapture JSON output and normalize it into our internal EbpfEvent structure.
   *
   * Sample ecapture JSON structure varies but typically looks like:
   * {
   *   "timestamp": "...",
   *   "comm": "curl",
   *   "pid": 1234,
   *   "fd": 3,
   *   "len": 1024,
   *   "buf": "GET / HTTP/1.1\r\n...",
   *   "direction": "uprobe_enter" // or exit
   * }
   */
  private handleRawEvent(raw: any): void {
    // Basic validation
    if (!raw.buf && !raw.len) return;

    const event: EbpfEvent = {
      type: 'request', // Default assumption, refined below based on context heuristics
      timestamp: Date.now(),
      pid: raw.pid,
      comm: raw.comm,
      fd: raw.fd,
      len: raw.len,
      buf: raw.buf,
      direction: raw.direction || raw.event_type, // Handle different field names across versions
    };

    // Heuristic: Determine if it's Request or Response based on content prefix
    // This is imperfect but works for HTTP-like protocols captured via SSL_read/write
    const content = typeof event.buf === 'string' ? event.buf : '';

    if (content.startsWith('HTTP/') || content.match(/^HTTP\/\d\.\d \d{3}/)) {
      event.type = 'response';
    } else if (
      content.match(/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH)\s/) ||
      content.includes('\r\nHost:')
    ) {
      event.type = 'request';
    } else {
      // For non-HTTP TCP streams or encrypted chunks that look like garbage,
      // we might still want to show them as generic data packets.
      // However, since we are specifically looking for TLS plaintext,
      // anything starting with standard methods is likely a request.
      event.type = 'request';
    }

    // Emit standardized event compatible with frontend network inspector
    this.emit('ebpf:data', event);
  }

  private cleanup(): void {
    this.isRunning = false;
    this.process = null;
    this.removeAllListeners();
  }

  public getStatus(): boolean {
    return this.isRunning;
  }
}

export const ebpfSniffer = new EbpfSnifferService();
