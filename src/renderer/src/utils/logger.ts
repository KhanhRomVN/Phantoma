/**
 * ------------------------------------------------------------------
 * Renderer Logger
 * ------------------------------------------------------------------
 * Logger cho renderer process - override console methods và gửi
 * logs về main process qua IPC để ghi vào file log.log
 * 
 * Hàm chính:
 * - setupRendererLogger() : Override console và setup IPC logging
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
type LogLevel = 'LOG' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

// ─── Original console methods ───────────────────────────────────────────
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

// ─── Flag to prevent duplicate logging ─────────────────────────────────
let inConsoleCall = false;

// ─── Send log to main process via IPC ──────────────────────────────────
function sendLogToMain(level: LogLevel, ...args: any[]): void {
  try {
    // Check if window.api is available (should be exposed by preload)
    if (typeof window !== 'undefined' && (window as any).api?.invoke) {
      (window as any).api.invoke('log:write', level, ...args).catch((err: Error) => {
        // Fallback to original console if IPC fails
        originalConsole.error('[RendererLogger] Failed to send log to main:', err);
      });
    }
  } catch (err) {
    // Silent fail - don't let logging errors break the app
    originalConsole.error('[RendererLogger] Exception sending log:', err);
  }
}

// ─── Mirror and write helper ────────────────────────────────────────────
function mirrorAndWrite(
  level: LogLevel,
  consoleFn: (...args: any[]) => void,
  args: any[]
): void {
  // Send to main process
  sendLogToMain(level, ...args);

  // Mirror to browser console
  inConsoleCall = true;
  try {
    consoleFn(...args);
  } finally {
    inConsoleCall = false;
  }
}

// ─── Logger object (can be used instead of console) ────────────────────
export const logger = {
  log: (...args: any[]) => sendLogToMain('LOG', ...args),
  error: (...args: any[]) => sendLogToMain('ERROR', ...args),
  warn: (...args: any[]) => sendLogToMain('WARN', ...args),
  info: (...args: any[]) => sendLogToMain('INFO', ...args),
  debug: (...args: any[]) => sendLogToMain('DEBUG', ...args),
};

// ─── Setup renderer logger ──────────────────────────────────────────────
export function setupRendererLogger(): void {
  // Override console methods
  console.log = (...args: any[]) => {
    mirrorAndWrite('LOG', originalConsole.log, args);
  };

  console.error = (...args: any[]) => {
    mirrorAndWrite('ERROR', originalConsole.error, args);
  };

  console.warn = (...args: any[]) => {
    mirrorAndWrite('WARN', originalConsole.warn, args);
  };

  console.info = (...args: any[]) => {
    mirrorAndWrite('INFO', originalConsole.info, args);
  };

  console.debug = (...args: any[]) => {
    mirrorAndWrite('DEBUG', originalConsole.debug, args);
  };

  // ── Catch unhandled errors ──────────────────────────────────────────────
  window.addEventListener('error', (event) => {
    sendLogToMain('ERROR', `[Unhandled Error] ${event.message}`, event.error?.stack || '');
  });

  window.addEventListener('unhandledrejection', (event) => {
    sendLogToMain('ERROR', `[Unhandled Promise Rejection] ${event.reason}`);
  });

  // Confirm logger is active
  console.info('[RendererLogger] Renderer logger initialized');
}

// ─── Auto-initialize when imported ──────────────────────────────────────
setupRendererLogger();
