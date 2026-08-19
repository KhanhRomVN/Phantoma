import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.join(process.cwd(), 'log.log');

// ─── Write stream (single open, many writes, no per-call open/close overhead) ─
let logStream: fs.WriteStream | null = null;
let streamErrorLogged = false;

function getLogStream(): fs.WriteStream | null {
  if (logStream) return logStream;
  try {
    // Clear file on first open (equivalent to old clearLogFile)
    logStream = fs.createWriteStream(LOG_FILE, { flags: 'w' });
    logStream.on('error', (err) => {
      if (!streamErrorLogged) {
        streamErrorLogged = true;
        // Use process.stderr.__originalWrite to bypass our own override
        const orig = (process.stderr as any).__originalWrite || process.stderr.write;
        orig.call(process.stderr, `[Logger] Stream error: ${err.message}\n`);
      }
    });
    return logStream;
  } catch (e: any) {
    if (!streamErrorLogged) {
      streamErrorLogged = true;
      process.stderr.write(`[Logger] Failed to open log file: ${e.message}\n`);
    }
    return null;
  }
}

// ─── Write helpers ──────────────────────────────────────────────────────────

function formatMessage(args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

function writeToLog(level: string, ...args: any[]): void {
  const stream = getLogStream();
  if (!stream) return;
  try {
    const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
    const message = formatMessage(args);
    const entry = `[${timestamp}] [${level}] ${message}\n`;
    stream.write(entry);
  } catch (e: any) {
    if (!streamErrorLogged) {
      streamErrorLogged = true;
      process.stderr.write(`[Logger] Write failed: ${e.message}\n`);
    }
  }
}

/**
 * Write log entry from renderer process (called via IPC).
 */
function writeLogFromRenderer(level: string, args: any[]): void {
  writeToLog(`RENDERER_${level}`, ...args);
}

// ─── Console override ───────────────────────────────────────────────────────

// Flag to prevent duplicate capture: when console.* is calling originalLog,
// the resulting stdout/stderr write should NOT be captured again.
let inConsoleCall = false;

function setupLogger(): void {
  // Save originals
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  console.log = (...args: any[]) => {
    writeToLog('LOG', ...args);
    inConsoleCall = true;
    try { originalLog(...args); } finally { inConsoleCall = false; }
  };

  console.error = (...args: any[]) => {
    writeToLog('ERROR', ...args);
    inConsoleCall = true;
    try { originalError(...args); } finally { inConsoleCall = false; }
  };

  console.warn = (...args: any[]) => {
    writeToLog('WARN', ...args);  
    inConsoleCall = true;
    try { originalWarn(...args); } finally { inConsoleCall = false; }
  };

  console.info = (...args: any[]) => {
    writeToLog('INFO', ...args);
    inConsoleCall = true;
    try { originalInfo(...args); } finally { inConsoleCall = false; }
  };

  console.debug = (...args: any[]) => {
    writeToLog('DEBUG', ...args);
    inConsoleCall = true;
    try { originalDebug(...args); } finally { inConsoleCall = false; }
  };

  // ── Capture direct stdout/stderr writes (child processes, native modules) ──

  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  // Stash originals for error logging in getLogStream
  (process.stdout as any).__originalWrite = originalStdoutWrite;
  (process.stderr as any).__originalWrite = originalStderrWrite;

  process.stdout.write = function (chunk: any, ...rest: any[]): boolean {
    if (!inConsoleCall) {
      const str = typeof chunk === 'string' ? chunk : chunk.toString();
      writeToLog('STDOUT', str);
    }
    return originalStdoutWrite(chunk, ...rest);
  } as any;

  process.stderr.write = function (chunk: any, ...rest: any[]): boolean {
    if (!inConsoleCall) {
      const str = typeof chunk === 'string' ? chunk : chunk.toString();
      writeToLog('STDERR', str);
    }
    return originalStderrWrite(chunk, ...rest);
  } as any;

  // ── Process-level events ──────────────────────────────────────────────────

  process.on('uncaughtException', (err) => {
    writeToLog('UNCAUGHT_EXCEPTION', err.message, err.stack || '');
  });

  process.on('unhandledRejection', (reason) => {
    writeToLog('UNHANDLED_REJECTION', String(reason));
  });

  process.on('exit', (code) => {
    writeToLog('EXIT', `Process exited with code ${code}`);
    // Close stream to flush any buffered data
    if (logStream) {
      try { logStream.end(); } catch { /* ignore */ }
      logStream = null;
    }
  });

  // First log entry — confirms logger is active
  writeToLog('SYSTEM', 'Logger initialized');
}

export { setupLogger, writeLogFromRenderer, LOG_FILE };
