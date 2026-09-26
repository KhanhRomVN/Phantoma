/**
 * ------------------------------------------------------------------
 * PacketCapture - TCP/IP Packet Capture Module
 * ------------------------------------------------------------------
 * Captures network packets using tcpdump for metadata analysis.
 * Does NOT decrypt HTTPS traffic - only captures encrypted packets.
 * 
 * Captures: host, port, packet size, timing, protocol
 * Does NOT capture: plaintext content (encrypted)
 * 
 * Main functions:
 * - start()   : Start tcpdump capture for target process
 * - stop()    : Stop packet capture
 * - parse()   : Parse tcpdump output to events
 * ------------------------------------------------------------------
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import { logger } from '../utils/logger';

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
  private window: BrowserWindow | null = null;
  private isRunning: boolean = false;
  private capturedPackets: PacketEvent[] = [];

  constructor(window: BrowserWindow) {
    super();
    this.window = window;
  }

  public async start(options: PacketCaptureOptions): Promise<void> {
    if (this.isRunning) {
      throw new Error('Packet capture already running');
    }

    // Check if tcpdump is available
    const tcpdumpPath = await this.findTcpdump();
    if (!tcpdumpPath) {
      throw new Error('tcpdump not found. Please install: sudo apt install tcpdump');
    }

    // Build tcpdump filter
    const filter = this.buildFilter(options);
    
    logger.info(`[PacketCapture] Starting capture with filter: ${filter}`);

    // Spawn tcpdump (requires sudo or CAP_NET_RAW capability)
    const args = [
      '-i', options.interface || 'any',
      '-n', // Don't resolve hostnames
      '-tt', // Unix timestamp
      '-vvv', // Very verbose
      '-S', // Absolute sequence numbers
      filter
    ];

    try {
      this.process = spawn('pkexec', ['tcpdump', ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.isRunning = true;

      // Parse stdout
      this.process.stdout?.on('data', (data: Buffer) => {
        this.parseOutput(data.toString());
      });

      // Log errors
      this.process.stderr?.on('data', (data: Buffer) => {
        const err = data.toString();
        if (!err.includes('listening on')) {
          logger.error('[PacketCapture] Error:', err);
        } else {
          logger.info('[PacketCapture]', err.trim());
        }
      });

      // Handle exit
      this.process.on('exit', (code) => {
        logger.info(`[PacketCapture] Process exited with code ${code}`);
        this.isRunning = false;
        this.process = null;
      });

      this.emit('started');
    } catch (error) {
      logger.error('[PacketCapture] Failed to start:', error);
      throw error;
    }
  }

  public stop(): void {
    if (this.process) {
      logger.info('[PacketCapture] Stopping capture');
      this.process.kill('SIGTERM');
      this.process = null;
      this.isRunning = false;
      this.emit('stopped');
    }
  }

  private async findTcpdump(): Promise<string | null> {
    return new Promise((resolve) => {
      const which = spawn('which', ['tcpdump']);
      let path = '';
      which.stdout.on('data', (data) => {
        path += data.toString().trim();
      });
      which.on('exit', (code) => {
        resolve(code === 0 ? path : null);
      });
    });
  }

  private buildFilter(options: PacketCaptureOptions): string {
    const filters: string[] = [];

    if (options.targetHost) {
      filters.push(`host ${options.targetHost}`);
    }

    if (options.filter) {
      filters.push(options.filter);
    } else {
      // Default: capture HTTPS traffic (port 443)
      filters.push('port 443');
    }

    return filters.join(' and ') || 'tcp';
  }

  private parseOutput(output: string): void {
    // Parse tcpdump output lines
    // Example: 1234567890.123456 IP 192.168.1.100.54321 > api.cline.bot.443: Flags [P.], seq 1:100, ack 1, win 65535, length 99
    
    const lines = output.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const packet = this.parseLine(line);
        if (packet) {
          this.capturedPackets.push(packet);
          this.sendToRenderer('packet:captured', packet);
        }
      } catch (error) {
        logger.warn('[PacketCapture] Failed to parse line:', line);
      }
    }
  }

  private parseLine(line: string): PacketEvent | null {
    // Regex for tcpdump output
    // Format: timestamp IP src.port > dst.port: Flags [...], length N
    const tcpdumpRegex = /^(\d+\.\d+)\s+IP\s+([\d\.]+)\.(\d+)\s+>\s+([\d\.]+)\.(\d+):\s+Flags\s+\[([^\]]+)\].*length\s+(\d+)/;
    
    const match = line.match(tcpdumpRegex);
    if (!match) return null;

    const [, timestamp, srcHost, srcPort, dstHost, dstPort, flags, length] = match;

    const packet: PacketEvent = {
      id: `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Math.floor(parseFloat(timestamp) * 1000),
      protocol: parseInt(dstPort) === 443 || parseInt(srcPort) === 443 ? 'TLS' : 'TCP',
      source: { host: srcHost, port: parseInt(srcPort) },
      destination: { host: dstHost, port: parseInt(dstPort) },
      size: parseInt(length),
      flags,
      encrypted: parseInt(dstPort) === 443 || parseInt(srcPort) === 443,
    };

    return packet;
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      packetCount: this.capturedPackets.length,
    };
  }
}
