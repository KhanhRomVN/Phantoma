/**
 * ------------------------------------------------------------------
 * Proxy Manager (Moved from Phantoma/server)
 * ------------------------------------------------------------------
 * Quản lý vòng đời của các ProxyServer instances.
 * ------------------------------------------------------------------
 */

import { ProxyServer, BreakpointRule, PendingBreakpoint } from './proxy-server';
import { logger } from '../utils/logger';
import * as net from 'net';

interface ProxySession {
  id: string;
  port: number;
  server: ProxyServer;
}

/**
 * Helper to find an available port starting from a base port.
 */
async function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, '0.0.0.0', () => {
      const address = server.address();
      if (address && typeof address !== 'string') {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Could not determine port')));
      }
    });
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

export class ProxyManager {
  private sessions: Map<string, ProxySession> = new Map();

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
        
        // Forward events from ProxyServer to global listeners if needed
        // For now, we just keep the reference
        
        await server.start(port);

        this.sessions.set(id, { id, port, server });
        return port;
      } catch (err: any) {
        lastError = err;
        if (!err.message?.includes('EADDRINUSE')) {
          throw err;
        }
        logger.warn(`Port ${startPort} in use, retrying...`);
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
          logger.error('Error stopping session', { err: String(err) });
        }),
      );
    }
    await Promise.all(stopPromises);
    this.sessions.clear();
  }

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

export const proxyManager = new ProxyManager();