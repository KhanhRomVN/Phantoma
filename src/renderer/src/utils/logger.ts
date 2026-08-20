/**
 * Renderer-side logger.
 *
 * - `logger.info/warn/error/debug` send logs over IPC and mirror to console.
 * - `console.*` is overridden to also forward calls over IPC, preserving
 *   the original console behavior.
 */

const originalConsole = {
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

function isApiAvailable(): boolean {
  return !!(window as any).api?.invoke;
}

function sendLog(level: string, args: any[]): void {
  if (!isApiAvailable()) return;
  try {
    (window as any).api.invoke('log:write', level, ...args);
  } catch {
    // Silently fail – don't break the app if IPC isn't ready yet
  }
}

function write(level: string, consoleFn: (...args: any[]) => void, args: any[]): void {
  sendLog(level, args);
  consoleFn(...args);
}

export const logger = {
  info: (...args: any[]) => write('INFO', originalConsole.info, args),
  warn: (...args: any[]) => write('WARN', originalConsole.warn, args),
  error: (...args: any[]) => write('ERROR', originalConsole.error, args),
  debug: (...args: any[]) => write('DEBUG', originalConsole.debug, args),
};

function setupRendererLogger(): void {
  console.info = (...args: any[]) => {
    sendLog('INFO', args);
    originalConsole.info(...args);
  };

  logger.error = (...args: any[]) => {
    sendLog('ERROR', args);
    originalConsole.error(...args);
  };

  logger.warn = (...args: any[]) => {
    sendLog('WARN', args);
    originalConsole.warn(...args);
  };

  console.debug = (...args: any[]) => {
    sendLog('DEBUG', args);
    originalConsole.debug(...args);
  };

  // Capture unhandled errors in renderer
  window.addEventListener('error', (event) => {
    sendLog('ERROR', [
      `[Renderer Uncaught] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
      event.error?.stack,
    ]);
  });

  window.addEventListener('unhandledrejection', (event) => {
    sendLog('ERROR', ['[Renderer Unhandled Rejection]', String(event.reason)]);
  });
}

setupRendererLogger();
