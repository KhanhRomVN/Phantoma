/**
 * ------------------------------------------------------------------
 * PacketCapture (port từ src/main/capture/PacketCapture.ts)
 * ------------------------------------------------------------------
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { runtimeBus } from '../event-bus';
import { createLogger } from '../../utils/logger';

const logger = createLogger('PacketCapture');

export interface PacketCaptureOptions {
  targetPid?: number;
  targetHost?: string;
  filter?: string;
  interface?: string;
}

export interface PacketEvent {
  id: string;
  timestamp: number;
  protocol: 'TCP' | 'UDP' | 'TLS' | 'QUIC';
  source: { host: string; port: number };
  destination: { host: string; port: number };
  size: number;
  flags?: string;
  encrypted: boolean;
}

export class PacketCapture extends EventEmitter {
  private process: ChildProcess | null = null;
  private isRunning = false;
  private capturedPackets: PacketEvent[] = [];

  constructor(_window?: unknown) {
    super();
  }

  public async start(options: PacketCaptureOptions): Promise<void> {
    if (this.isRunning) {
      throw new Error('Packet capture already running');
    }

    const tcpdumpPath = await this.findTcpdump();
    if (!tcpdumpPath) {
      throw new Error('tcpdump not found. Please install: sudo apt install tcpdump');
    }

    const filter = this.buildFilter(options);
    logger.info(`Starting capture with filter: ${filter}`);

    const args = [
      '-i', options.interface || 'any',
      '-n',
      '-tt',
      '-vvv',
      '-S',
      filter,
    ];

    try {
      this.process = spawn('pkexec', ['tcpdump', ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.isRunning = true;

      this.process.stdout?.on('data', (data: Buffer) => {
        this.parseOutput(data.toString());
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const err = data.toString();
        if (!err.includes('listening on')) {
          logger.error(`Error: ${err}`);
        } else {
          logger.info(err.trim());
        }
      });

      this.process.on('exit', (code) => {
        logger.info(`Process exited with code ${code}`);
        this.isRunning = false;
        this.process = null;
      });

      this.emit('started');
    } catch (error) {
      logger.error('Failed to start', { err: String(error) });
      throw error;
    }
  }

  public stop(): void {
    if (this.process) {
      logger.info('Stopping capture');
      this.process.kill('SIGTERM');
      this.process = null;
      this.isRunning = false;
      this.emit('stopped');
    }
  }

  private async findTcpdump(): Promise<string | null> {
    return new Promise((resolve) => {
      const which = spawn('which', ['tcpdump']);
      let p = '';
      which.stdout.on('data', (data) => {
        p += data.toString().trim();
      });
      which.on('exit', (code) => {
        resolve(code === 0 ? p : null);
      });
    });
  }

  private buildFilter(options: PacketCaptureOptions): string {
    const filters: string[] = [];
    if (options.targetHost) filters.push(`host ${options.targetHost}`);
    if (options.filter) filters.push(options.filter);
    else filters.push('port 443');
    return filters.join(' and ') || 'tcp';
  }

  private parseOutput(output: string): void {
    const lines = output.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const packet = this.parseLine(line);
        if (packet) {
          this.capturedPackets.push(packet);
          runtimeBus.emitEvent('packet:captured', packet);
        }
      } catch {
        logger.warn(`Failed to parse line: ${line}`);
      }
    }
  }

  private parseLine(line: string): PacketEvent | null {
    const tcpdumpRegex =
      /^(\d+\.\d+)\s+IP\s+([\d\.]+)\.(\d+)\s+>\s+([\d\.]+)\.(\d+):\s+Flags\s+\[([^\]]+)\].*length\s+(\d+)/;
    const match = line.match(tcpdumpRegex);
    if (!match) return null;

    const [, timestamp, srcHost, srcPort, dstHost, dstPort, flags, length] = match;

    return {
      id: `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Math.floor(parseFloat(timestamp) * 1000),
      protocol: parseInt(dstPort) === 443 || parseInt(srcPort) === 443 ? 'TLS' : 'TCP',
      source: { host: srcHost, port: parseInt(srcPort) },
      destination: { host: dstHost, port: parseInt(dstPort) },
      size: parseInt(length),
      flags,
      encrypted: parseInt(dstPort) === 443 || parseInt(srcPort) === 443,
    };
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      packetCount: this.capturedPackets.length,
    };
  }
}