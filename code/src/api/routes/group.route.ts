import express, { Router } from 'express';
import { GroupController } from '../controllers/group.controller';
import { handle } from '../middleware/async-handler.middleware';

export function registerGroupRoutes(c: GroupController): Router {
  const router = express.Router();

  router.get('/groups', handle(c.list));
  router.post('/groups', handle(c.create));
  router.get('/groups/:id', handle(c.get));
  router.put('/groups/:id', handle(c.update));
  router.delete('/groups/:id', handle(c.remove));

  return router;
}