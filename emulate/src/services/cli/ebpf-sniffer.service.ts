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

import { spawn, execFile, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import readline from 'readline';
import { logger } from '../../utils/logger.util';
import type { EbpfEvent } from '../../types/ebpf.type';

class EbpfSnifferService extends EventEmitter {
  private process: ChildProcess | null = null;
  private isRunning = false;
  private targetPid?: number; // Optional filter by PID
  private connTimer?: NodeJS.Timeout;
  private seenConns = new Set<string>();

  constructor() {
    super();
  }

  /**
   * Start capturing TLS traffic using ecapture.
   * @param options.pid Filter by specific Process ID. If undefined, captures all.
   * @param options.sudoPassword Password for sudo authentication via stdin (-S flag).
   */
  public async start(options: {
    pid?: number;
    sudoPassword?: string;
    libssl?: string;
  }): Promise<boolean> {
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

    // ASSUMED: ecapture `--libssl` accepts a binary with statically linked OpenSSL (e.g. node)
    if (options.libssl) {
      args.push('--libssl', options.libssl);
    }

    try {
      // Use sudo -S to read password from stdin, avoiding interactive terminal prompts.
      const sudoArgs = ['-S', 'ecapture', ...args];
      console.log(`[DEBUG] [EbpfSniffer] spawn: sudo ${sudoArgs.join(' ')} (pid filter: ${options.pid ?? 'none'})`);
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
      this.startConnWatch();

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

    let pending: { type: 'request' | 'response'; timestamp: number; conn: string; lines: string[] } | null = null;
    let flushTimer: NodeJS.Timeout | undefined;
    let glueNext = false;
    let seq = 0;
    const lastReqId = new Map<string, string>();
    const headerRe = /^\[[^\]]+\]\s+\S+\s+(request|response)\s+\S+\s+->\s+\S+.*?connection="([^"]*)"/;

    const flushPending = (): void => {
      if (flushTimer) clearTimeout(flushTimer);
      if (!pending) return;
      const msg = pending;
      pending = null;
      console.log(`[DEBUG] [EbpfSniffer emit] type=${msg.type} lines=${msg.lines.length} bytes=${msg.lines.join('\n').length}`);
      const [startLine = '', ...rest] = msg.lines;
      const headers: Record<string, string> = {};
      let bodyFrom = 0;
      for (; bodyFrom < rest.length; bodyFrom++) {
        const h = /^([A-Za-z][\w-]*):\s?(.*)$/.exec(rest[bodyFrom]);
        if (!h || h[1].toLowerCase() === 'data') break;
        headers[h[1]] = h[2];
      }
      let id: string;
      if (msg.type === 'request') {
        id = `ebpf-${msg.conn}-${++seq}`;
        lastReqId.set(msg.conn, id);
      } else {
        id = lastReqId.get(msg.conn) ?? `ebpf-${msg.conn}-${++seq}`;
      }
      const reqLine = /^(\S+)\s+(\S+)\s+HTTP\//.exec(startLine);
      const resLine = /^HTTP\/\S+\s+(\d{3})/.exec(startLine);
      this.emit('ebpf:data', {
        id,
        type: msg.type,
        timestamp: msg.timestamp,
        comm: 'ecapture-text-mode',
        direction: msg.type === 'request' ? 'uprobe_enter' : 'uprobe_exit',
        method: reqLine?.[1],
        url: reqLine?.[2],
        statusCode: resLine ? Number(resLine[1]) : undefined,
        headers,
        body: rest.slice(bodyFrom).join('\n'),
        buf: msg.lines.join('\n'),
      });
    };

    // ASSUMED: ecapture text mode xuất 1 dòng header `[ts] http/1.1 request|response src -> dst ...` rồi tới các dòng HTTP; gom theo header, flush sau 200ms im lặng
    const consumeTextLine = (line: string): boolean => {
      const m = headerRe.exec(line);
      if (m) {
        flushPending();
        pending = { type: m[1] as 'request' | 'response', timestamp: Date.now(), conn: m[2], lines: [] };
      } else if (pending) {
        if (/^[0-9a-f]{1,8}$/i.test(line.trim())) {
          glueNext = true;
          return true;
        }
        const last = pending.lines[pending.lines.length - 1];
        if (glueNext && last !== undefined && last.startsWith('data:') && !last.endsWith('}') && !line.startsWith('data:')) {
          pending.lines[pending.lines.length - 1] = last + line;
        } else {
          pending.lines.push(line);
        }
        glueNext = false;
      } else {
        return false;
      }
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(flushPending, 200);
      return true;
    };

    const rl = readline.createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity,
    });

    rl.on('line', (line: string) => {
      if (!line.trim()) return;
      console.log(`[DEBUG] [EbpfSniffer stdout] ${line.slice(0, 300)}`);
      if (consumeTextLine(line)) return;

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
      console.log(`[DEBUG] [EbpfSniffer stderr] ${msg.slice(0, 500)}`);

      // Ignore sudo authentication prompts/noise to prevent false error emissions
      if (msg.includes('[sudo]') || msg.toLowerCase().includes('password')) {
        return;
      }

      if (msg.includes('Error') || msg.includes('Permission denied') || msg.includes('failed')) {
        logger.error('[EbpfSniffer Stderr]', msg);
        this.emit('ebpf:error', { message: msg });
      }
    });

    this.process.on('exit', (code, signal) => {
      console.log(`[DEBUG] [EbpfSniffer] ecapture exited: code=${code} signal=${signal}`);
      this.stopConnWatch();
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

  // polling 250ms, có thể sót kết nối rất ngắn — upgrade path: kprobe tcp_v4_connect/tcp_v6_connect
  private startConnWatch(): void {
    if (!this.targetPid) return;
    const pid = this.targetPid;
    this.seenConns.clear();
    this.connTimer = setInterval(() => {
      execFile('ss', ['-tnpH'], (err, stdout) => {
        if (err) return;
        const live = new Set<string>();
        for (const line of stdout.split('\n')) {
          if (!line.includes(`pid=${pid},`)) continue;
          const cols = line.trim().split(/\s+/);
          const key = `${cols[0]} ${cols[3]} -> ${cols[4]}`;
          live.add(key);
          if (!this.seenConns.has(key)) {
            this.seenConns.add(key);
            console.log(`[DEBUG] [EbpfSniffer conn] NEW ${key}`);
          }
        }
        for (const key of this.seenConns) {
          if (!live.has(key)) {
            this.seenConns.delete(key);
            console.log(`[DEBUG] [EbpfSniffer conn] CLOSED ${key}`);
          }
        }
      });
    }, 250);
  }

  private stopConnWatch(): void {
    if (this.connTimer) clearInterval(this.connTimer);
    this.connTimer = undefined;
    this.seenConns.clear();
  }

  private cleanup(): void {
    this.stopConnWatch();
    this.isRunning = false;
    this.process = null;
    this.removeAllListeners();
  }

  public getStatus(): boolean {
    return this.isRunning;
  }
}

export const ebpfSniffer = new EbpfSnifferService();
