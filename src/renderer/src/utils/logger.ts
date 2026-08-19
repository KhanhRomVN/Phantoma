/**
 * Renderer-side logger with path-based filtering.
 *
 * - Keep console.* capture (no filtering) to mirror legacy behavior.
 * - Use `logger.info/warn/error/debug` for filtered logging.
 *   Filtering is based on the caller's path relative to `src/renderer/src`.
 *
 * Configure via DEFAULT_CONFIG below, or override at runtime:
 *   (window as any).__LOGGER_CONFIG__ = { whitelist: ['modules/Dashboard'], blacklist: [] };
 */

interface LoggerFilterConfig {
  whitelist: string[]; // relative file/folder paths under src/renderer/src
  blacklist: string[];
}

const DEFAULT_CONFIG: LoggerFilterConfig = {
  whitelist: [],
  blacklist: [],
};

const config: LoggerFilterConfig = (window as any).__LOGGER_CONFIG__ ?? DEFAULT_CONFIG;

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

const RENDERER_ROOT_MARKER = 'src/renderer/src/';

function normalizePath(rawPath: string): string | null {
  const path = rawPath.replace(/\\/g, '/').split('?')[0];
  const idx = path.indexOf(RENDERER_ROOT_MARKER);
  if (idx === -1) return null;
  return path.slice(idx + RENDERER_ROOT_MARKER.length);
}

/**
 * Resolve the first caller file outside of this logger, as a path
 * relative to `src/renderer/src`. Returns null when unresolvable
 * (e.g. stack contains no `src/renderer/src` marker).
 */
function getCallerPath(): string | null {
  const stack = new Error().stack;
  if (!stack) return null;

  const lines = stack.split('\n');
  for (const line of lines) {
    const match = line.match(/\(?(.+?):\d+:\d+\)?$/);
    if (!match) continue;
    const file = normalizePath(match[1]);
    if (file && !file.startsWith('utils/logger')) return file;
  }
  return null;
}

function matchesPath(file: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const normalized = pattern.replace(/\\/g, '/').replace(/\/$/, '');
    return file === normalized || file.startsWith(normalized + '/');
  });
}

function isAllowedPath(file: string): boolean {
  if (config.blacklist.length > 0 && matchesPath(file, config.blacklist)) return false;
  if (config.whitelist.length > 0 && !matchesPath(file, config.whitelist)) return false;
  return true;
}

function write(level: string, consoleFn: (...args: any[]) => void, args: any[]): void {
  const caller = getCallerPath();
  if (caller && !isAllowedPath(caller)) return;
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

  console.error = (...args: any[]) => {
    sendLog('ERROR', args);
    originalConsole.error(...args);
  };

  console.warn = (...args: any[]) => {
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