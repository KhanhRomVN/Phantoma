import express, { Router } from 'express';
import { handle } from '../../utils/http';
import type { QueriesController } from '../controllers/queries.controller';

export function createQueriesRoutes(c: QueriesController): Router {
  const router = express.Router();

  router.get('/queries', handle(c.list));
  router.post('/queries', handle(c.create));
  router.get('/queries/:id', handle(c.get));
  router.put('/queries/:id', handle(c.update));
  router.delete('/queries/:id', handle(c.remove));

  return router;
}