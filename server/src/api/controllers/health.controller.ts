import type { Request, Response } from 'express';
import { SERVICE_NAME } from '../../constants';
import { sendSuccess } from '../../utils/http-response.util';

/** Liveness probe. */
export const healthHandler = (_req: Request, res: Response): void => {
  sendSuccess(res, { status: 'ok', service: SERVICE_NAME });
};
