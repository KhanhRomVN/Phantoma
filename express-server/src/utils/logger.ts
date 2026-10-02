/**
 * ------------------------------------------------------------------
 * Logger
 * ------------------------------------------------------------------
 * Structured, leveled, colorized logger.
 * Mirrors the output format of the Go pkg/logger implementation:
 * [LEVEL] [file:line] message | key=value | key=value
 *
 * Main exports:
 * - createLogger(context) : Factory function tạo logger với context
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External ─
import path from 'path';

// ─── Constants ─────────────────────────────────────────────────────────

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[91m',
  yellow: '\x1b[93m',
  green: '\x1b[92m',
  cyan: '\x1b[96m',
  white: '\x1b[97m',
  gray: '\x1b[90m',
};

type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LEVEL_COLOR: Record<Level, string> = {
  DEBUG: COLORS.cyan,
  INFO: COLORS.green,
  WARN: COLORS.yellow,
  ERROR: COLORS.red,
};

const MIN_LEVEL: Record<string, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentMinLevel = () =>
  MIN_LEVEL[(process.env.LOG_LEVEL || 'DEBUG').toUpperCase()] ?? 0;

// ─── Helpers ───────────────────────────────────────────────────────────

function getCallerLocation(): string {
  const obj: any = {};
  Error.captureStackTrace(obj);
  // stack[0]=Error, [1]=getCallerLocation, [2]=log(), [3]=debug/info/warn/error, [4]=caller
  const line = (obj.stack as string).split('\n')[4] || '';
  const match =
    line.match(/\((.+):(\d+):\d+\)/) || line.match(/at\s+(.+):(\d+):\d+/);
  if (match) {
    return `${shortenPath(match[1])}:${match[2]}`;
  }
  return 'unknown';
}

// Trim absolute path down to a project-relative one, mirroring trimPath() in Go.
function shortenPath(p: string): string {
  for (const anchor of ['/src/', '/internal/', '/pkg/', '/cmd/']) {
    const idx = p.indexOf(anchor);
    if (idx !== -1) return p.slice(idx + 1);
  }
  return path.basename(p);
}

type FieldValue = string | number | boolean | null | undefined | object | Error;

interface Field {
  key: string;
  val: FieldValue;
}

// F creates a structured field. Usage: logger.info('msg', F('id', userId))
export const F = (key: string, val: FieldValue): Field => ({ key, val });

// Since returns a duration-in-ms field measured from t.
export const Since = (t: number): Field => ({
  key: 'duration',
  val: `${Date.now() - t}ms`,
});

function isTerminal(w: NodeJS.WritableStream): boolean {
  return Boolean((w as any).isTTY);
}

// ─── Class ──────────────────────────────────────────────────────────────

export class Logger {
  constructor(private context?: string) {}

  withContext(ctx: string): Logger {
    return new Logger(ctx);
  }

  private log(level: Level, msg: string, fields: Field[] = []) {
    if ((MIN_LEVEL[level] ?? 0) < currentMinLevel()) return;

    const noColor = !isTerminal(process.stdout);
    const caller = getCallerLocation();
    const fieldsStr = fields
      .map((f) => `${f.key}=${formatVal(f.val)}`)
      .join(' | ');

    let out = '';
    if (noColor) {
      out += `[${padLevel(level)}] [${caller}] `;
      if (this.context) out += `[${this.context}] `;
      out += msg;
      if (fieldsStr) out += ` | ${fieldsStr}`;
    } else {
      const lc = LEVEL_COLOR[level];
      out += `${lc}[${padLevel(level)}]${COLORS.reset} `;
      out += `${COLORS.gray}[${caller}]${COLORS.reset} `;
      if (this.context) out += `${COLORS.gray}[${this.context}]${COLORS.reset} `;
      out += `${COLORS.white}${msg}${COLORS.reset}`;
      if (fieldsStr) out += `${COLORS.gray} | ${fieldsStr}${COLORS.reset}`;
    }

    process.stdout.write(out + '\n');
  }

  debug(msg: string, ...fields: Field[]) { this.log('DEBUG', msg, fields); }
  info(msg: string, ...fields: Field[]) { this.log('INFO', msg, fields); }
  warn(msg: string, ...fields: Field[]) { this.log('WARN', msg, fields); }
  error(msg: string, ...fields: Field[]) { this.log('ERROR', msg, fields); }
}

function padLevel(level: Level): string {
  return level.padEnd(5);
}

function formatVal(v: FieldValue): string {
  if (v instanceof Error) return v.message;
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

// ─── Default logger + factory ──────────────────────────────────────────

export const logger = new Logger();
export const createLogger = (context: string) => new Logger(context);