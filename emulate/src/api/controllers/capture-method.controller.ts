/**
 * ------------------------------------------------------------------
 * Capture Method Controller
 * ------------------------------------------------------------------
 * Serves the static catalogue of capture methods per platform.
 * ------------------------------------------------------------------
 */

import type { Request, Response } from 'express';
import { getCaptureMethodsForPlatform } from '../../services/runtime/capture-method.service';
import type { Platform } from '../../types';

export const captureMethodController = {
  listByPlatform(req: Request, res: Response): void {
    const platform = req.params.platform as Platform;
    const methods = getCaptureMethodsForPlatform(platform);

    res.json({ platform, methods });
  },
};
