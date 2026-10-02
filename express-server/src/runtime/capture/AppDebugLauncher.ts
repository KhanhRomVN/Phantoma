/**
 * ------------------------------------------------------------------
 * AppDebugLauncher (port từ src/main/capture/AppDebugLauncher.ts)
 * ------------------------------------------------------------------
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { runtimeBus } from '../event-bus';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AppDebugLauncher');

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
  private isRunning = false;

  constructor(_window?: unknown) {
    super();
  }

  public async launch(options: AppDebugOptions): Promise<void> {
    if (this.isRunning) {
      throw new Error('Debug app already running');
    }

    logger.info(`Launching: ${options.executablePath}`);

    const debugEnv = {
      ...process.env,
      NODE_DEBUG: '*',
      NODE_DEBUG_NATIVE: '*',
      DEBUG: '*',
      VERBOSE: '1',
      VERBOSITY: 'debug',
      LOG_LEVEL: 'debug',
      RUST_LOG: 'debug',
      RUST_BACKTRACE: '1',
      PYTHONVERBOSE: '1',
      PYTHONDEBUG: '1',
      HTTPS_DEBUG: '1',
      HTTP_DEBUG: '1',
      NODE_TLS_REJECT_UNAUTHORIZED: '0',
    };

    try {
      this.process = spawn(options.executablePath, options.args || [], {
        cwd: options.cwd,
        env: debugEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.isRunning = true;

      this.process.stdout?.on('data', (data: Buffer) => {
        this.parseOutput(data.toString(), 'stdout');
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        this.parseOutput(data.toString(), 'stderr');
      });

      this.process.on('exit', (code) => {
        logger.info(`Process exited with code ${code}`);
        this.isRunning = false;
        this.process = null;
        this.emit('exited', code);
      });

      this.emit('started', this.process.pid);
    } catch (error) {
      logger.error('Failed to launch', { err: String(error) });
      throw error;
    }
  }

  public stop(): void {
    if (this.process) {
      logger.info('Stopping debug app');
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
      const event = this.parseLine(line, stream);
      if (event) {
        runtimeBus.emitEvent('app-debug:log', event);
      }
    }
  }

  private parseLine(line: string, _stream: 'stdout' | 'stderr'): DebugLogEvent | null {
    let level: 'debug' | 'info' | 'warn' | 'error' = 'info';
    let module: string | undefined;

    const patterns = [
      /^\[(\w+)\]\s+(\w+):\s+(.+)$/,
      /^(\w+)\s+(\w+):\s+(.+)$/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, levelOrModule, moduleOrLevel, message] = match;
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

  public getStatus() {
    return { isRunning: this.isRunning, pid: this.process?.pid };
  }

  public getPid(): number | undefined {
    return this.process?.pid;
  }
}