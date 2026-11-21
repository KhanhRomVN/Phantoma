/**
 * ------------------------------------------------------------------
 * eBPF Controller
 * ------------------------------------------------------------------
 * Endpoints for the eBPF TLS sniffer (plaintext HTTPS capture via uprobes):
 *  - generic start/stop/status
 *  - CLI capture: launch a CLI target and attach the sniffer to its PID
 * ------------------------------------------------------------------
 */

import type { Request, Response } from 'express';
import { AppError } from '../../errors/app.error';
import { createLogger, F } from '../../utils/logger.util';
import { getErrorMessage } from '../../utils/error.util';
import { fail } from '../../utils/http-response.util';
import { ebpfCaptureService } from '../../services/cli/ebpf-capture.service';

const logger = createLogger('EbpfController');

export const ebpfController = {
  /**
   * POST /runtime/ebpf/start
   * Start capturing plaintext HTTPS traffic. Body: { pid?: number } — optional PID filter.
   */
  async start(req: Request, res: Response): Promise<void> {
    const { pid } = req.body ?? {};
    try {
      const success = await ebpfCaptureService.startGeneric(pid);

      if (success) {
        res.json({
          success: true,
          message: 'eBPF sniffer started. Capturing SSL/TLS plaintext.',
          filteredByPid: !!pid,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to start eBPF sniffer. Check logs for permission/kernel issues.',
        });
      }
    } catch (err) {
      logger.error('eBPF start error', F('error', getErrorMessage(err)));
      res.status(500).json({ success: false, error: getErrorMessage(err) });
    }
  },

  /** POST /runtime/ebpf/stop — stop the active eBPF capture session. */
  stop(_req: Request, res: Response): void {
    try {
      ebpfCaptureService.stopGeneric();
      res.json({ success: true, message: 'eBPF sniffer stopped.' });
    } catch (err) {
      logger.error('eBPF stop error', F('error', getErrorMessage(err)));
      res.status(500).json({ success: false, error: getErrorMessage(err) });
    }
  },

  /** GET /runtime/ebpf/status — current status of the eBPF sniffer. */
  status(_req: Request, res: Response): void {
    res.json({
      running: ebpfCaptureService.isRunning(),
      timestamp: Date.now(),
    });
  },

  /**
   * POST /runtime/ebpf
   * Launch a CLI target and attach the eBPF TLS sniffer to its PID.
   * Body: { targetId, executablePath, sudoPassword?, platform? }
   * (executablePath holds the full command line stored for the CLI target.)
   */
  async startCli(req: Request, res: Response): Promise<void> {
    const { targetId, executablePath, sudoPassword, platform } = req.body ?? {};
    if (!targetId || !executablePath) {
      fail(res, 400, 'targetId and executablePath are required');
      return;
    }

    try {
      const { pid } = await ebpfCaptureService.startCli({ targetId, executablePath, sudoPassword, platform });
      res.json({
        success: true,
        message: `CLI target launched (PID ${pid}) with eBPF capture attached.`,
        metadata: { pid },
      });
    } catch (err) {
      if (err instanceof AppError) {
        fail(res, err.statusCode, err.message);
        return;
      }
      logger.error('CLI eBPF start error', F('error', getErrorMessage(err)));
      fail(res, 500, getErrorMessage(err));
    }
  },

  /** POST /runtime/cli/:targetId/stop — stop the sniffer and terminate the CLI target. */
  async stopCli(req: Request, res: Response): Promise<void> {
    try {
      await ebpfCaptureService.stopCli(req.params.targetId);
      res.json({ success: true });
    } catch (err) {
      logger.error('CLI stop error', F('error', getErrorMessage(err)));
      fail(res, 500, getErrorMessage(err));
    }
  },
};
