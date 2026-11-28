import express, { type Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { handle } from '../middleware/async-handler.middleware';

export function registerSessionRoutes(c: SessionController): Router {
  const router = express.Router();

  router.get('/sessions', handle(c.list));
  router.post('/sessions', handle(c.create));
  router.get('/sessions/:id', handle(c.get));
  router.put('/sessions/:id', handle(c.update));
  router.put('/sessions/:id/workspace', handle(c.saveWorkspace));
  router.delete('/sessions/:id', handle(c.remove));

  return router;
}