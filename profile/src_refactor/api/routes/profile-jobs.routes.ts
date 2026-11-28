import express, { Router } from 'express';
import { handle } from '../../utils/http';
import type { ProfileJobsController } from '../controllers/profile-jobs.controller';

export function createProfileJobsRoutes(c: ProfileJobsController): Router {
  const router = express.Router();

  router.post('/profiles/transfer/jobs', handle(c.startTransfer));
  router.get('/profiles/transfer/jobs/:id', handle(c.getTransfer));
  router.post('/profiles/transfer/jobs/:id/cancel', handle(c.cancelTransfer));

  router.post('/profiles/import/jobs', handle(c.startImport));
  router.get('/profiles/import/jobs/:id', handle(c.getImport));
  router.post('/profiles/import/jobs/:id/cancel', handle(c.cancelImport));

  return router;
}