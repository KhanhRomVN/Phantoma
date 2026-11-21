/**
 * ------------------------------------------------------------------
 * CDP Controller
 * ------------------------------------------------------------------
 * Chrome DevTools Protocol session control and browser-control tools.
 * ------------------------------------------------------------------
 */

import type { Request, Response } from 'express';
import { CDP_DEFAULT_PORT } from '../../constants';
import { createLogger, F } from '../../utils/logger.util';
import { getErrorMessage } from '../../utils/error.util';
import { cdpService } from '../../services/browser/cdp.service';
import { executeBrowserTool } from '../../services/browser/browser-control.service';
import { processManager } from '../../services/runtime/process-manager.service';

const logger = createLogger('CdpController');

const DEFAULT_SESSION_KEY = 'default';

export const cdpController = {
  /** POST /runtime/cdp/connect */
  async connect(req: Request, res: Response): Promise<void> {
    const { port: requestedPort, targetId, expectedUrl } = req.body;

    // AUTO-DETECT PORT: Retrieve from ProcessManager if available.
    // Falls back to requestedPort or default 9222 if no active process is tracked.
    let actualPort = requestedPort || CDP_DEFAULT_PORT;
    const trackedTarget = processManager.getActiveTargets().find((t) => t.targetId === targetId);

    if (trackedTarget && trackedTarget.alive) {
      actualPort = trackedTarget.port;
    }

    try {
      const success = await cdpService.connect(actualPort, targetId || DEFAULT_SESSION_KEY, expectedUrl);

      if (success) {
        res.json({ success: true, message: `Connected to CDP on port ${actualPort}` });
      } else {
        res.status(500).json({ success: false, error: 'Failed to establish CDP connection' });
      }
    } catch (err) {
      logger.error('CDP connect error', F('error', getErrorMessage(err)));
      res.status(500).json({ success: false, error: getErrorMessage(err) });
    }
  },

  /** POST /runtime/cdp/disconnect */
  async disconnect(req: Request, res: Response): Promise<void> {
    const { targetId } = req.body;

    try {
      await cdpService.disconnect(targetId || DEFAULT_SESSION_KEY);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: getErrorMessage(err) });
    }
  },

  /** POST /runtime/cdp/reload — reload the page attached to a CDP session. */
  async reload(req: Request, res: Response): Promise<void> {
    const { targetId } = req.body ?? {};
    try {
      const ok = await cdpService.reload(targetId || DEFAULT_SESSION_KEY);
      res.json({ success: ok });
    } catch (err) {
      logger.error('CDP reload error', F('error', getErrorMessage(err)));
      res.status(500).json({ success: false, error: getErrorMessage(err) });
    }
  },

  /** POST /runtime/cdp/navigate — navigate the attached page to a new URL. */
  async navigate(req: Request, res: Response): Promise<void> {
    const { targetId, url } = req.body ?? {};
    if (!url) {
      res.status(400).json({ success: false, error: 'url is required' });
      return;
    }

    try {
      const ok = await cdpService.navigate(targetId || DEFAULT_SESSION_KEY, url);
      res.json({ success: ok });
    } catch (err) {
      logger.error('CDP navigate error', F('error', getErrorMessage(err)));
      res.status(500).json({ success: false, error: getErrorMessage(err) });
    }
  },

  /** POST /runtime/cdp/inject-border — inject visual border overlay onto the controlled tab. */
  async injectBorder(req: Request, res: Response): Promise<void> {
    const { targetId, color } = req.body ?? {};
    try {
      const ok = await cdpService.injectBorder(targetId || DEFAULT_SESSION_KEY, color);
      res.json({ success: ok });
    } catch (err) {
      logger.error('CDP inject-border error', F('error', getErrorMessage(err)));
      res.status(500).json({ success: false, error: getErrorMessage(err) });
    }
  },

  /** GET /runtime/cdp/state — current CDP connection state (all sessions or one target). */
  state(req: Request, res: Response): void {
    const targetId = typeof req.query.targetId === 'string' ? req.query.targetId : undefined;
    try {
      res.json({ success: true, data: cdpService.getState(targetId) });
    } catch (err) {
      res.status(500).json({ success: false, error: getErrorMessage(err) });
    }
  },

  /** POST /runtime/browser/:tool — run a browser-control tool on the target's CDP session. */
  async executeTool(req: Request, res: Response): Promise<void> {
    const { targetId, params } = req.body ?? {};
    try {
      const output = await executeBrowserTool(req.params.tool, targetId || DEFAULT_SESSION_KEY, params ?? {});
      res.json({ success: true, data: { output } });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getErrorMessage(err) });
    }
  },
};
