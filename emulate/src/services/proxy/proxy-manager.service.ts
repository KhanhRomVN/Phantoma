/**
 * ------------------------------------------------------------------
 * Proxy Manager (Moved from Phantoma/server)
 * ------------------------------------------------------------------
 * Quản lý vòng đời của các ProxyServer instances.
 * ------------------------------------------------------------------
 */

import { ProxyServer } from './proxy-server.service';
import type { BreakpointRule, PendingBreakpoint } from '../../types/proxy.type';
import { logger } from '../../utils/logger.util';
import { findAvailablePort } from '../../utils/network.util';
import { PROXY_BASE_PORT, PROXY_MAX_RETRIES, PROXY_PORT_RETRY_STEP } from '../../constants';

export interface ProxySession {
  id: string;
  port: number;
  server: ProxyServer;
}

export class ProxyManager {
  private sessions: Map<string, ProxySession> = new Map();
  private sessionCreatedListeners: Array<(sessionId: string, session: ProxySession) => void> = [];

  /**
   * Subscribe to newly created sessions (fires once per session, after it started).
   * Used to bridge a session's events to other subsystems without patching this class.
   */
  onSessionCreated(listener: (sessionId: string, session: ProxySession) => void): void {
    this.sessionCreatedListeners.push(listener);
  }

  async createSession(id: string): Promise<number> {
    if (this.sessions.has(id)) {
      return this.sessions.get(id)!.port;
    }

    const maxRetries = PROXY_MAX_RETRIES;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const startPort = PROXY_BASE_PORT + attempt * PROXY_PORT_RETRY_STEP;
      try {
        const port = await findAvailablePort(startPort);
        const server = new ProxyServer();

        await server.start(port);

        const session: ProxySession = { id, port, server };
        this.sessions.set(id, session);
        this.sessionCreatedListeners.forEach((listener) => listener(id, session));
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