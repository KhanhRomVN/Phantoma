/**
 * ------------------------------------------------------------------
 * Proxy Controller
 * ------------------------------------------------------------------
 * HTTP handlers controlling MITM proxy sessions: lifecycle, intercept
 * mode, breakpoint rules and forwarding/dropping paused requests.
 *
 * Response shapes here are intentionally the legacy plain ones
 * ({ success } / { error }) the existing frontend relies on.
 * ------------------------------------------------------------------
 */

import type { Request, Response } from 'express';
import { createLogger } from '../../utils/logger.util';
import { proxyManager } from '../../services/proxy/proxy-manager.service';
import type { BreakpointRule } from '../../types';

const logger = createLogger('ProxyController');

export const proxyController = {
  /** POST /sessions — create a new proxy session. */
  async createSession(req: Request, res: Response): Promise<void> {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }
    try {
      const port = await proxyManager.createSession(id);
      res.json({ success: true, sessionId: id, port });
    } catch (err) {
      logger.error('Failed to create session', { err: String(err) });
      res.status(500).json({ error: 'Failed to create session' });
    }
  },

  /** DELETE /sessions/:id — stop one session. */
  async stopSession(req: Request, res: Response): Promise<void> {
    try {
      await proxyManager.stopSession(req.params.id);
      res.json({ success: true });
    } catch (err) {
      logger.error('Failed to stop session', { err: String(err) });
      res.status(500).json({ error: 'Failed to stop session' });
    }
  },

  /** POST /sessions/stop-all — stop every session. */
  async stopAllSessions(_req: Request, res: Response): Promise<void> {
    try {
      await proxyManager.stopAll();
      res.json({ success: true });
    } catch (err) {
      logger.error('Failed to stop all sessions', { err: String(err) });
      res.status(500).json({ error: 'Failed to stop all sessions' });
    }
  },

  /** POST /sessions/:id/intercept — toggle intercept mode for a session. */
  setIntercept(req: Request, res: Response): void {
    const success = proxyManager.setIntercept(req.params.id, !!req.body.enabled);
    res.json({ success });
  },

  /** POST /breakpoints/rules — set breakpoint rules globally. */
  setBreakpointRules(req: Request, res: Response): void {
    const rules: BreakpointRule[] = req.body.rules || [];
    proxyManager.setBreakpointRules(rules);
    res.json({ success: true, count: rules.length });
  },

  /** POST /breakpoints/resolve — resolve a pending breakpoint. */
  resolveBreakpoint(req: Request, res: Response): void {
    const { requestId, edited } = req.body;
    const success = proxyManager.resolveBreakpoint(requestId, edited || null);
    res.json({ success });
  },

  /** POST /requests/:id/forward — forward a paused request. */
  async forwardRequest(req: Request, res: Response): Promise<void> {
    const success = await proxyManager.forwardRequest(req.params.id);
    res.json({ success });
  },

  /** POST /requests/:id/drop — drop a paused request. */
  async dropRequest(req: Request, res: Response): Promise<void> {
    const success = await proxyManager.dropRequest(req.params.id);
    res.json({ success });
  },
};
