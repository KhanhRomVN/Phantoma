import { BrowserWindow } from 'electron';
import { CdpManager } from './cdp-manager';
import { EventEmitter } from 'events';

export interface CdpTargetInfo {
  id: string;
  port: number;
  title?: string;
  url?: string;
  active: boolean;
  connected: boolean;
  lastActivity: number;
}

export class CdpManagerPool extends EventEmitter {
  private managers: Map<string, CdpManager> = new Map();
  private targetInfo: Map<string, CdpTargetInfo> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    // Start heartbeat for all connections
    this.heartbeatInterval = setInterval(() => this.heartbeatCheck(), 30000);
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
    // Propagate to all existing managers
    for (const manager of this.managers.values()) {
      manager.setMainWindow(window);
    }
  }

  public getOrCreateManager(targetId: string, port: number): CdpManager {
    console.log(`[CDP DEBUG] getOrCreateManager() called for target ${targetId}, port ${port}`);
    
    if (this.managers.has(targetId)) {
      console.log(`[CDP DEBUG] Manager already exists for ${targetId}`);
      const manager = this.managers.get(targetId)!;
      // Update port if changed
      const info = this.targetInfo.get(targetId);
      if (info && info.port !== port) {
        info.port = port;
        this.targetInfo.set(targetId, info);
        // Reconnect with new port
        this.connectManager(targetId, port).catch(console.error);
      }
      return manager;
    }

    // Create new manager
    console.log(`[CDP DEBUG] Creating new manager for ${targetId}`);
    const manager = new CdpManager();
    if (this.mainWindow) {
      manager.setMainWindow(this.mainWindow);
    }

    this.managers.set(targetId, manager);
    this.targetInfo.set(targetId, {
      id: targetId,
      port,
      active: true,
      connected: false,
      lastActivity: Date.now(),
    });

    // Auto-connect
    console.log(`[CDP DEBUG] Auto-connecting manager for ${targetId}`);
    this.connectManager(targetId, port).catch(console.error);

    this.emit('manager-created', { targetId, port });
    return manager;
  }

  private async connectManager(targetId: string, port: number, retries = 3): Promise<boolean> {
    const manager = this.managers.get(targetId);
    if (!manager) return false;

    const info = this.targetInfo.get(targetId);
    if (!info) return false;

    try {
      const success = await manager.connect(port, retries, 1000);
      if (success) {
        info.connected = true;
        info.active = true;
        info.lastActivity = Date.now();
        this.targetInfo.set(targetId, info);
        this.emit('manager-connected', { targetId, port });
        return true;
      }
      info.connected = false;
      this.targetInfo.set(targetId, info);
      return false;
    } catch (error) {
      info.connected = false;
      this.targetInfo.set(targetId, info);
      console.error(`[CDP Pool] Failed to connect target ${targetId}:`, error);
      return false;
    }
  }

  public async disconnectManager(targetId: string): Promise<void> {
    const manager = this.managers.get(targetId);
    if (!manager) return;

    try {
      if (manager.ws && manager.ws.readyState === 1) {
        manager.ws.close();
      }
      manager.isConnected = false;
      manager.ws = null;
    } catch (error) {
      console.error(`[CDP Pool] Error disconnecting target ${targetId}:`, error);
    }

    const info = this.targetInfo.get(targetId);
    if (info) {
      info.connected = false;
      info.active = false;
      this.targetInfo.set(targetId, info);
    }

    this.emit('manager-disconnected', { targetId });
  }

  public getManager(targetId: string): CdpManager | undefined {
    return this.managers.get(targetId);
  }

  public getTargetInfo(targetId: string): CdpTargetInfo | undefined {
    return this.targetInfo.get(targetId);
  }

  public getAllTargets(): CdpTargetInfo[] {
    return Array.from(this.targetInfo.values());
  }

  public async reconnectManager(targetId: string): Promise<boolean> {
    const info = this.targetInfo.get(targetId);
    if (!info) return false;

    await this.disconnectManager(targetId);
    return this.connectManager(targetId, info.port, 5);
  }

  public async reconnectAll(): Promise<void> {
    for (const [targetId, info] of this.targetInfo) {
      if (info.active) {
        await this.reconnectManager(targetId);
      }
    }
  }

  private async heartbeatCheck(): Promise<void> {
    const now = Date.now();
    const idleTimeout = 120000; // 2 minutes

    for (const [targetId, info] of this.targetInfo) {
      if (!info.connected || !info.active) continue;

      const idleTime = now - info.lastActivity;
      if (idleTime > idleTimeout) {
        // Check if connection is still alive
        const manager = this.managers.get(targetId);
        if (manager && manager.ws) {
          // Send a lightweight ping
          try {
            await manager.send('Runtime.evaluate', {
              expression: '1+1',
              returnByValue: true,
            });
            info.lastActivity = Date.now();
            this.targetInfo.set(targetId, info);
          } catch (error) {
            // Connection might be dead, attempt reconnect
            console.warn(`[CDP Pool] Heartbeat failed for ${targetId}, reconnecting...`);
            await this.reconnectManager(targetId);
          }
        }
      }
    }
  }

  public async cleanupInactiveTargets(maxIdleTime = 300000): Promise<void> {
    // 5 minutes idle = cleanup
    const now = Date.now();

    for (const [targetId, info] of this.targetInfo) {
      if (!info.active) continue;
      if (now - info.lastActivity > maxIdleTime) {
        // Deactivate but don't delete
        info.active = false;
        this.targetInfo.set(targetId, info);
        await this.disconnectManager(targetId);
        this.emit('target-deactivated', { targetId });
      }
    }
  }

  public removeTarget(targetId: string): void {
    this.disconnectManager(targetId);
    this.managers.delete(targetId);
    this.targetInfo.delete(targetId);
    this.emit('target-removed', { targetId });
  }

  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const [targetId] of this.managers) {
      this.removeTarget(targetId);
    }

    this.managers.clear();
    this.targetInfo.clear();
  }
}

// Singleton instance
export const cdpManagerPool = new CdpManagerPool();