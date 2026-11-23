import { Router } from 'express';
import { healthHandler } from '../controllers/health.controller';

export function createHealthRoutes(): Router {
  const router = Router();
  router.get('/', healthHandler);
  return router;
}
