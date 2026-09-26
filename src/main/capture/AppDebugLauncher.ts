/**
 * ------------------------------------------------------------------
 * AppDebugLauncher - Application Debug Mode Launcher
 * ------------------------------------------------------------------
 * Launches CLI applications with debug/verbose environment variables
 * to enable native application logging.
 * 
 * Sets common debug env vars:
 * - NODE_DEBUG=*
 * - DEBUG=*
 * - RUST_LOG=debug
 * - VERBOSE=1
 * - etc.
 * 
 * Main functions:
 * - launch()  : Launch app with debug env vars
 * - stop()    : Stop debug app
 * - parse()   : Parse debug output to events
 * ------------------------------------------------------------------
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import { logger } from '../utils/logger';

export interface AppDebugOptions {
  executablePath: string;
  args?: string[];
  cwd?: string;
  useSandbox?: boolean;
}

export interface DebugLogEvent {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  module?: string;
}

export class AppDebugLauncher extends EventEmitter {
  private process: ChildProcess | null = null;
  private window: BrowserWindow | null = null;
  private isRunning: boolean = false;

  constructor(window: BrowserWindow) {
    super();
    this.window = window;
  }

  public async launch(options: AppDebugOptions): Promise<void> {
    if (this.isRunning) {
      throw new Error('Debug app already running');
    }

    logger.info(`[AppDebugLauncher] Launching: ${options.executablePath}`);

    // Build debug environment variables
    const debugEnv = {
      ...process.env,
      // Node.js debug
      NODE_DEBUG: '*',
      NODE_DEBUG_NATIVE: '*',
      // Generic debug
      DEBUG: '*',
      VERBOSE: '1',
      VERBOSITY: 'debug',
      LOG_LEVEL: 'debug',
      // Rust debug
      RUST_LOG: 'debug',
      RUST_BACKTRACE: '1',
      // Python debug
      PYTHONVERBOSE: '1',
      PYTHONDEBUG: '1',
      // HTTP/HTTPS debug
      HTTPS_DEBUG: '1',
      HTTP_DEBUG: '1',
      NODE_TLS_REJECT_UNAUTHORIZED: '0', // Allow self-signed certs
    };

    try {
      this.process = spawn(options.executablePath, options.args || [], {
        cwd: options.cwd,
        env: debugEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.isRunning = true;

      // Parse stdout
      this.process.stdout?.on('data', (data: Buffer) => {
        this.parseOutput(data.toString(), 'stdout');
      });

      // Parse stderr (many debug logs go to stderr)
      this.process.stderr?.on('data', (data: Buffer) => {
        this.parseOutput(data.toString(), 'stderr');
      });

      // Handle exit
      this.process.on('exit', (code) => {
        logger.info(`[AppDebugLauncher] Process exited with code ${code}`);
        this.isRunning = false;
        this.process = null;
        this.emit('exited', code);
      });

      this.emit('started', this.process.pid);
    } catch (error) {
      logger.error('[AppDebugLauncher] Failed to launch:', error);
      throw error;
    }
  }

  public stop(): void {
    if (this.process) {
      logger.info('[AppDebugLauncher] Stopping debug app');
      this.process.kill('SIGTERM');
      this.process = null;
      this.isRunning = false;
      this.emit('stopped');
    }
  }

  private parseOutput(output: string, stream: 'stdout' | 'stderr'): void {
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;

      // Try to parse common debug log formats
      const event = this.parseLine(line, stream);
      if (event) {
        this.sendToRenderer('app-debug:log', event);
      }
    }
  }

  private parseLine(line: string, stream: 'stdout' | 'stderr'): DebugLogEvent | null {
    // Detect log level from line content
    let level: 'debug' | 'info' | 'warn' | 'error' = 'info';
    let module: string | undefined;

    // Common patterns
    const patterns = [
      // [DEBUG] module: message
      /^\[(\w+)\]\s+(\w+):\s+(.+)$/,
      // DEBUG module: message
      /^(\w+)\s+(\w+):\s+(.+)$/,
      // module DEBUG: message
      /^(\w+)\s+(\w+):\s+(.+)$/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, levelOrModule, moduleOrLevel, message] = match;
        
        // Determine which is level and which is module
        const levelKeywords = ['debug', 'info', 'warn', 'warning', 'error', 'fatal'];
        if (levelKeywords.includes(levelOrModule.toLowerCase())) {
          level = levelOrModule.toLowerCase() as any;
          module = moduleOrLevel;
        } else {
          module = levelOrModule;
          level = moduleOrLevel.toLowerCase() as any;
        }

        return {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
          level,
          message,
          module,
        };
      }
    }

    // No pattern matched - treat as plain log
    // Guess level from content
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('error') || lowerLine.includes('fail')) {
      level = 'error';
    } else if (lowerLine.includes('warn')) {
      level = 'warn';
    } else if (lowerLine.includes('debug') || lowerLine.includes('verbose')) {
      level = 'debug';
    }

    return {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      level,
      message: line,
    };
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      pid: this.process?.pid,
    };
  }

  public getPid(): number | undefined {
    return this.process?.pid;
  }
}
