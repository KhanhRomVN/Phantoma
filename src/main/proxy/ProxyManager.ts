import { ProxyServer, BreakpointRule, PendingBreakpoint } from './ProxyServer';
import { findAvailablePort } from '../utils/net';
import { BrowserWindow } from 'electron';

interface ProxySession {
  id: string; // usually appId
  port: number;
  server: ProxyServer;
}

export class ProxyManager {
  private sessions: Map<string, ProxySession> = new Map();
  private mainWindow: BrowserWindow | null = null;

  constructor() {}

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
    for (const session of this.sessions.values()) {
      session.server.setWindow(window);
    }
  }

  async createSession(id: string): Promise<number> {
    if (this.sessions.has(id)) {
      return this.sessions.get(id)!.port;
    }

    const maxRetries = 5;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const startPort = 8081 + attempt * 10;
      try {
        const port = await findAvailablePort(startPort);
        const server = new ProxyServer();

        if (this.mainWindow) {
          server.setWindow(this.mainWindow);
        }

        await server.start(port);

        this.sessions.set(id, {
          id,
          port,
          server,
        });

        return port;
      } catch (err: any) {
        lastError = err;
        if (!err.message?.includes('EADDRINUSE')) {
          throw err;
        }
      }
    }

    throw lastError || new Error('Failed to create session after max retries');
  }

  getSession(id: string): ProxySession | undefined {
    return this.sessions.get(id);
  }

  async stopSession(id: string) {
    const session = this.sessions.get(id);
    if (session) {
      await session.server.stop();
      this.sessions.delete(id);
    }
  }

  async stopAll() {
    const stopPromises: Promise<void>[] = [];
    for (const [, session] of this.sessions) {
      stopPromises.push(
        session.server.stop().catch((err) => {
          console.error(`[ProxyManager] Error stopping session:`, err);
        })
      );
    }
    await Promise.all(stopPromises);
    this.sessions.clear();
  }

  // Forward methods to specific session
  setIntercept(id: string, enabled: boolean) {
    const session = this.sessions.get(id);
    if (session) {
      session.server.setIntercept(enabled);
      return true;
    }
    return false;
  }

  setInterceptAll(enabled: boolean) {
    for (const session of this.sessions.values()) {
      session.server.setIntercept(enabled);
    }
    return true;
  }

  setBreakpointRules(rules: BreakpointRule[]) {
    for (const session of this.sessions.values()) {
      session.server.setBreakpointRules(rules);
    }
  }

  resolveBreakpoint(requestId: string, edited: PendingBreakpoint | null): boolean {
    for (const session of this.sessions.values()) {
      if (session.server.resolveBreakpoint(requestId, edited)) return true;
    }
    return false;
  }

  async forwardRequest(requestId: string): Promise<boolean> {
    for (const session of this.sessions.values()) {
      const result = await session.server.forwardRequest(requestId);
      if (result) return true;
    }
    return false;
  }

  async dropRequest(requestId: string): Promise<boolean> {
    for (const session of this.sessions.values()) {
      const result = await session.server.dropRequest(requestId);
      if (result) return true;
    }
    return false;
  }
}
