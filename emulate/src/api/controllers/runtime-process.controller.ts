/**
 * ------------------------------------------------------------------
 * Runtime Process Controller
 * ------------------------------------------------------------------
 * Launching / terminating target processes and runtime health.
 * ------------------------------------------------------------------
 */

import type { Request, Response } from 'express';
import { createLogger, F } from '../../utils/logger.util';
import { getErrorMessage } from '../../utils/error.util';
import { chromeLauncherService } from '../../services/browser/chrome-launcher.service';
import { processManager } from '../../services/runtime/process-manager.service';
import { ebpfCaptureService } from '../../services/cli/ebpf-capture.service';

const logger = createLogger('RuntimeProcess');

export const runtimeProcessController = {
  /** POST /runtime/launch */
  async launch(req: Request, res: Response): Promise<void> {
    const { targetId, mode, proxyUrl, customUrl, userDataDir } = req.body;

    try {
      if (mode === 'cdp') {
        const { debugPort, pid, url } = await chromeLauncherService.launch({
          targetId,
          proxyUrl,
          customUrl,
          userDataDir,
        });

        res.json({
          success: true,
          sessionId: `sess_cdp_${targetId}`,
          message: `Chrome launched successfully on port ${debugPort}`,
          metadata: { debugPort, pid, url },
        });
        return;
      }

      if (mode === 'mitm-normal') {
        // Placeholder for MITM launch logic
        res.json({
          success: false,
          error: 'MITM launch logic not yet implemented in this route.',
        });
        return;
      }

      res.status(400).json({ error: `Unsupported mode: ${mode}` });
    } catch (err) {
      logger.error('Failed to launch', F('error', getErrorMessage(err)));
      res.status(500).json({
        success: false,
        error: getErrorMessage(err) || 'Failed to launch browser',
      });
    }
  },

  /** POST /runtime/terminate — delegates to ProcessManager. */
  async terminate(req: Request, res: Response): Promise<void> {
    const { targetId } = req.body ?? {};

    try {
      if (targetId) {
        await processManager.terminate(targetId);
      } else {
        await processManager.terminateAll();
      }
      // Dừng eBPF sniffer nếu target bị terminate là target đang sở hữu nó
      ebpfCaptureService.releaseIfOwner(targetId);
      res.json({ success: true });
    } catch (err) {
      logger.error('Terminate error', F('error', getErrorMessage(err)));
      res.status(500).json({ success: false, error: getErrorMessage(err) });
    }
  },

  /** GET /runtime/health — delegates to ProcessManager. */
  health(_req: Request, res: Response): void {
    res.json({
      healthy: true,
      timestamp: Date.now(),
      targets: processManager.getActiveTargets(),
    });
  },

  /** POST /runtime/targets/register — register a target to an active runtime session. */
  registerTarget(req: Request, res: Response): void {
    const { targetId } = req.body;

    // TODO: Store mapping between targetId and current active sessions/proxies

    res.json({
      success: true,
      message: `Target ${targetId} registered for runtime monitoring.`,
    });
  },
};
