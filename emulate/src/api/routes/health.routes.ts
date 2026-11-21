/**
 * Health check route — mounted at the application root (outside /api/v1).
 */

import { Router } from 'express';
import { SERVICE_NAME } from '../../constants';

export function createHealthRoutes(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: SERVICE_NAME });
  });

  return router;
}
