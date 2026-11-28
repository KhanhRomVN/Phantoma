/**
 * ------------------------------------------------------------------
 * Logger Utility (CODE)
 * ------------------------------------------------------------------
 * Simple structured logger with timestamp and context.
 * ------------------------------------------------------------------
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogContext {
  [key: string]: any;
}

class Logger {
  constructor(private context: string) {}

  private format(level: LogLevel, message: string, ctx?: LogContext): string {
    const timestamp = new Date().toISOString();
    const ctxStr = ctx ? ' | ' + Object.entries(ctx).map(([k, v]) => `${k}=${v}`).join(', ') : '';
    return `[${level.padEnd(5)}] [${this.context}] ${message}${ctxStr}`;
  }

  info(message: string, ctx?: LogContext): void {
    console.log(this.format('INFO', message, ctx));
  }

  warn(message: string, ctx?: LogContext): void {
    console.warn(this.format('WARN', message, ctx));
  }

  error(message: string, error?: any, ctx?: LogContext): void {
    console.error(this.format('ERROR', message, ctx));
    if (error) console.error(error);
  }

  debug(message: string, ctx?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.format('DEBUG', message, ctx));
    }
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}

export const logger = createLogger('App');