import express, { Router } from 'express';
import { handle } from '../../utils/http';
import type { SourcesController } from '../controllers/sources.controller';

export function createSourcesRoutes(c: SourcesController): Router {
  const router = express.Router();

  router.get('/sources', handle(c.list));
  router.post('/sources', handle(c.create));
  router.post('/sources/import', handle(c.importExisting));
  router.post('/sources/sync', handle(c.syncLocal));
  router.get('/sources/:id', handle(c.get));
  router.post('/sources/:id/sync', handle(c.sync));
  router.put('/sources/:id', handle(c.update));
  router.delete('/sources/:id', handle(c.remove));

  return router;
}