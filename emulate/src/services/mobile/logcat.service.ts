/**
 * ------------------------------------------------------------------
 * Logcat Service
 * ------------------------------------------------------------------
 * Chạy `adb logcat -v threadtime` cho thiết bị (Genymotion/physical)
 * và broadcast từng dòng log qua WebSocket kênh `mobile:logcat-output`.
 * Cũng cung cấp danh sách package cho bộ lọc của Log viewer.
 * ------------------------------------------------------------------
 */

import { spawn, execFile, ChildProcess } from 'child_process';
import { createLogger, F } from '../../utils/logger.util';
import { wssHub } from '../realtime/wss-hub.service';

const logger = createLogger('Logcat');
const CHANNEL = 'mobile:logcat-output';
const ADB_TIMEOUT_MS = 8000;

function runAdb(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('adb', args, { timeout: ADB_TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.toString().trim() || err.message));
      resolve(stdout.toString());
    });
  });
}

function emitLine(line: string): void {
  wssHub.broadcast({ type: CHANNEL, data: line });
}

class LogcatService {
  private proc: ChildProcess | null = null;
  private serial: string | null = null;
  private remainder = '';
  private lineCount = 0;

  async start(serial: string): Promise<void> {
    await this.stop();
    logger.info('Starting logcat', F('serial', serial));

    if (serial.includes(':')) {
      try {
        const out = await runAdb(['connect', serial]);
        logger.info('adb connect', F('serial', serial), F('output', out.trim()));
      } catch (err) {
        logger.warn('adb connect failed', F('serial', serial), F('error', String(err)));
      }
    }

    const proc = spawn('adb', ['-s', serial, 'logcat', '-v', 'threadtime'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.proc = proc;
    this.serial = serial;
    this.remainder = '';
    this.lineCount = 0;

    proc.stdout?.on('data', (chunk: Buffer) => {
      const text = this.remainder + chunk.toString('utf8');
      const lines = text.split(/\r?\n/);
      this.remainder = lines.pop() ?? '';
      for (const line of lines) {
        if (!line) continue;
        this.lineCount++;
        if (this.lineCount === 1) logger.info('First logcat line received', F('serial', serial));
        emitLine(line);
      }
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      const msg = chunk.toString('utf8').trim();
      if (!msg) return;
      logger.error('adb logcat stderr', F('serial', serial), F('error', msg));
      emitLine(`E/AdbLogcat(0): ${msg}`);
    });

    proc.on('error', (err) => {
      logger.error('Failed to spawn adb', F('serial', serial), F('error', err.message));
      emitLine(`E/AdbLogcat(0): Failed to run adb: ${err.message} (is adb in PATH?)`);
      if (this.proc === proc) this.proc = null;
    });

    proc.on('close', (code) => {
      logger.info('logcat exited', F('serial', serial), F('code', String(code)), F('lines', String(this.lineCount)));
      if (this.proc === proc) this.proc = null;
    });
  }

  async stop(): Promise<void> {
    if (!this.proc) return;
    logger.info('Stopping logcat', F('serial', String(this.serial)));
    this.proc.kill();
    this.proc = null;
    this.serial = null;
  }

  async listPackages(serial: string): Promise<string[]> {
    const out = await runAdb(['-s', serial, 'shell', 'pm', 'list', 'packages', '-3']);
    return out
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^package:/, ''))
      .filter(Boolean)
      .sort();
  }
}

export const logcatService = new LogcatService();