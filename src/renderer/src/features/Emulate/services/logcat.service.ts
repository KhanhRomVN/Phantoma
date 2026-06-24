// Logcat Service - Android logcat management
import { LogEntry, LogLevel } from '../types/log.types';

export interface LogcatOptions {
  serial: string;
  onLog?: (entry: LogEntry) => void;
  onError?: (error: Error) => void;
}

export class LogcatService {
  private listeners: Map<string, (data: string) => void> = new Map();
  private isRunning: boolean = false;

  async start(serial: string): Promise<void> {
    if (this.isRunning) return;
    try {
      await window.api.invoke('mobile:start-logcat', serial);
      this.isRunning = true;
    } catch (error) {
      throw new Error(`Failed to start logcat: ${error}`);
    }
  }

  async stop(serial: string): Promise<void> {
    if (!this.isRunning) return;
    try {
      await window.api.invoke('mobile:stop-logcat', serial);
      this.isRunning = false;
    } catch (error) {
      throw new Error(`Failed to stop logcat: ${error}`);
    }
  }

  subscribe(serial: string, callback: (entry: LogEntry) => void): () => void {
    const handler = (event: unknown, data: string) => {
      const entry = this.parseLogLine(data);
      if (entry) callback(entry);
    };

    if (window.api?.on) {
      window.api.on('mobile:logcat-output', handler);
    }

    this.listeners.set(serial, handler);

    return () => {
      if (window.api?.off) {
        window.api.off('mobile:logcat-output', handler);
      }
      this.listeners.delete(serial);
    };
  }

  parseLogLine(line: string): LogEntry | null {
    const match = line.match(
      /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+(.+?):\s+(.*)$/
    );
    if (match) {
      return {
        timestamp: match[1],
        pid: match[2],
        level: match[4] as LogLevel,
        tag: match[5],
        message: match[6],
        raw: line,
      };
    }

    const simpleMatch = line.match(/^([VDIWEF])\/(.+?)\(\s*(\d+)\):\s+(.*)$/);
    if (simpleMatch) {
      return {
        timestamp: new Date().toLocaleTimeString(),
        pid: simpleMatch[3],
        level: simpleMatch[1] as LogLevel,
        tag: simpleMatch[2],
        message: simpleMatch[4],
        raw: line,
      };
    }

    const timeMatch = line.match(
      /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+([VDIWEF])\/(.+?)\(\s*(\d+)\):\s+(.*)$/
    );
    if (timeMatch) {
      return {
        timestamp: timeMatch[1],
        pid: timeMatch[4],
        level: timeMatch[2] as LogLevel,
        tag: timeMatch[3],
        message: timeMatch[5],
        raw: line,
      };
    }

    return {
      timestamp: new Date().toLocaleTimeString(),
      pid: '?',
      level: 'I',
      tag: 'RAW',
      message: line,
      raw: line,
    };
  }

  async listPackages(serial: string): Promise<string[]> {
    try {
      const packages = await window.api.invoke('mobile:list-packages', serial);
      return packages.sort();
    } catch (error) {
      throw new Error(`Failed to list packages: ${error}`);
    }
  }

  async detectEmulators(): Promise<
    Array<{ name: string; serial: string; type: 'vm' | 'physical' | 'running-vm' }>
  > {
    try {
      const [vms, connected] = await Promise.all([
        window.api.invoke('mobile:list-genymotion-vms'),
        window.api.invoke('mobile:detect-emulators'),
      ]);

      const list: Array<{ name: string; serial: string; type: 'vm' | 'physical' | 'running-vm' }> =
        [];

      connected.forEach((dev: unknown) => {
        const d = dev as { name?: string; serial?: string; type?: string };
        list.push({
          name: d.name || d.serial || 'Unknown',
          serial: d.serial || 'unknown',
          type: d.type === 'physical' ? 'physical' : 'running-vm',
        });
      });

      vms.forEach((vm: string) => {
        if (!connected.some((d: unknown) => {
          const dev = d as { name?: string; id?: string };
          return dev.name === vm || dev.id === vm;
        })) {
          list.push({ name: vm, serial: vm, type: 'vm' });
        }
      });

      return list;
    } catch (error) {
      throw new Error(`Failed to detect emulators: ${error}`);
    }
  }

  async enableWirelessAdb(serial: string): Promise<{ success: boolean; ip?: string; error?: string }> {
    try {
      const result = await window.api.invoke('mobile:enable-wireless-adb', serial);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async connectWireless(ip: string, port: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await window.api.invoke('mobile:connect-wireless', ip, port);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getLevelColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      V: 'text-zinc-500',
      D: 'text-slate-400',
      I: 'text-cyan-400',
      W: 'text-amber-400',
      E: 'text-red-400',
      F: 'text-red-400',
    };
    return colors[level] || 'text-foreground';
  }

  getLevelBgColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      V: 'bg-zinc-500/5',
      D: 'bg-slate-500/5',
      I: 'bg-cyan-500/5',
      W: 'bg-amber-500/5',
      E: 'bg-red-500/5',
      F: 'bg-red-500/5',
    };
    return colors[level] || 'bg-muted/10';
  }

  getLevelLabel(level: LogLevel): string {
    const labels: Record<LogLevel, string> = {
      V: 'Verbose',
      D: 'Debug',
      I: 'Info',
      W: 'Warning',
      E: 'Error',
      F: 'Fatal',
    };
    return labels[level] || level;
  }

  isRunningStatus(): boolean {
    return this.isRunning;
  }
}

export const logcatService = new LogcatService();
export default logcatService;