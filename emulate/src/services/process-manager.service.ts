/**
 * ------------------------------------------------------------------
 * Process Manager Service
 * ------------------------------------------------------------------
 * Centralized management of spawned browser processes (Chrome/Electron/etc.).
 * Allows other services (like WSS Hub) to trigger cleanup when connections die.
 * ------------------------------------------------------------------
 */

import { ChildProcess } from 'child_process';
import { cdpService } from './cdp.service';
import { logger } from '../utils/logger';

interface ManagedProcess {
  pid: number;
  port: number;
  targetId: string;
  child?: ChildProcess; // Optional reference if we need to interact further
}

class ProcessManagerService {
  private processes: Map<string, ManagedProcess> = new Map(); // key: targetId

  /**
   * Register a newly launched process.
   */
  public register(targetId: string, pid: number, port: number): void {
    this.processes.set(targetId, { pid, port, targetId });
  }

  /**
   * Unregister and kill a specific target's process.
   */
  public async terminate(targetId: string): Promise<boolean> {
    const proc = this.processes.get(targetId);
    if (!proc) {
      logger.warn(`[ProcMgr] No process found for target ${targetId}`);
      return false;
    }

    try {
      // 1. Disconnect CDP first to stop traffic flow gracefully
      await cdpService.disconnect(targetId).catch(() => {});

      // 2. Kill the OS process group
      // Using negative PID sends signal to entire process group started by spawn(detached: true)
      process.kill(-proc.pid, 'SIGTERM');
      this.processes.delete(targetId);
      return true;
    } catch (err: any) {
      if (err.code === 'ESRCH') {
        // Process already dead, just clean up registry
        this.processes.delete(targetId);
        return true;
      }
      logger.error(`[ProcMgr] Failed to terminate target ${targetId}:`, err.message);
      return false;
    }
  }

  /**
   * Terminate ALL managed processes. Useful when all clients disconnect.
   */
  public async terminateAll(): Promise<void> {
    const ids = Array.from(this.processes.keys());
    if (ids.length === 0) return;
    await Promise.allSettled(ids.map((id) => this.terminate(id)));

    // Ensure map is empty
    this.processes.clear();
  }

  /**
   * Check if any processes are currently running.
   */
  public hasActiveProcesses(): boolean {
    return this.processes.size > 0;
  }

  /**
   * Get list of active targets (for health checks).
   */
  public getActiveTargets() {
    return Array.from(this.processes.values()).map((p) => ({
      targetId: p.targetId,
      pid: p.pid,
      port: p.port,
      alive: this.isAlive(p.pid),
    }));
  }

  private isAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}

export const processManager = new ProcessManagerService();
