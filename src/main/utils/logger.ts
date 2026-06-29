import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.join(process.cwd(), 'log.log');

// Clear log file on startup
function clearLogFile() {
  try {
    fs.writeFileSync(LOG_FILE, '', { flag: 'w' });
    console.log(`[Logger] Log file cleared: ${LOG_FILE}`);
  } catch (e) {
    // Silently fail if can't write
  }
}

// Write to log file with timestamp
function writeToLog(level: string, ...args: any[]) {
  try {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    const entry = `[${timestamp}] [${level}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, entry);
  } catch (e) {
    // Ignore write errors
  }
}

// Override console methods
function setupLogger() {
  clearLogFile();

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  console.log = (...args: any[]) => {
    writeToLog('LOG', ...args);
    originalLog(...args);
  };

  console.error = (...args: any[]) => {
    writeToLog('ERROR', ...args);
    originalError(...args);
  };

  console.warn = (...args: any[]) => {
    writeToLog('WARN', ...args);
    originalWarn(...args);
  };

  console.info = (...args: any[]) => {
    writeToLog('INFO', ...args);
    originalInfo(...args);
  };

  console.debug = (...args: any[]) => {
    writeToLog('DEBUG', ...args);
    originalDebug(...args);
  };

  // Also capture process stderr for child processes (Frida, etc.)
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk: any, ...rest: any[]) => {
    const str = typeof chunk === 'string' ? chunk : chunk.toString();
    writeToLog('STDERR', str);
    return originalStderrWrite(chunk, ...rest);
  };

  // Capture stdout for child processes
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: any, ...rest: any[]) => {
    const str = typeof chunk === 'string' ? chunk : chunk.toString();
    // Only log non-console output to avoid duplication with console.log
    if (!str.startsWith('[LOG]') && !str.startsWith('[ERROR]') && 
        !str.startsWith('[WARN]') && !str.startsWith('[INFO]') &&
        !str.startsWith('[DEBUG]')) {
      writeToLog('STDOUT', str);
    }
    return originalStdoutWrite(chunk, ...rest);
  };

  // Log uncaught exceptions
  process.on('uncaughtException', (err) => {
    writeToLog('UNCAUGHT_EXCEPTION', err.message, err.stack);
  });

  process.on('unhandledRejection', (reason) => {
    writeToLog('UNHANDLED_REJECTION', String(reason));
  });

  // Log process exit
  process.on('exit', (code) => {
    writeToLog('EXIT', `Process exited with code ${code}`);
  });

  console.log('[Logger] ===== LOGGING INITIALIZED =====');
  console.log('[Logger] Log file: ' + LOG_FILE);
}

export { setupLogger, LOG_FILE };