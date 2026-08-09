/**
 * Renderer-side logger hook.
 * Overrides console.* to forward all logs to main process via IPC,
 * so they appear in the unified log.log file alongside main process logs.
 *
 * Import this file once at the very top of main.tsx (before any other imports
 * that may trigger console calls).
 */

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

function setupRendererLogger(): void {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  console.log = (...args: any[]) => {
    sendLog('LOG', args);
    originalLog(...args);
  };

  console.error = (...args: any[]) => {
    sendLog('ERROR', args);
    originalError(...args);
  };

  console.warn = (...args: any[]) => {
    sendLog('WARN', args);
    originalWarn(...args);
  };

  console.info = (...args: any[]) => {
    sendLog('INFO', args);
    originalInfo(...args);
  };

  console.debug = (...args: any[]) => {
    sendLog('DEBUG', args);
    originalDebug(...args);
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

export {};