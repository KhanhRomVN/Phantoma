import express, { Router } from 'express';
import { handle } from '../../utils/http';
import type { SessionsController } from '../controllers/sessions.controller';

const BASE = '/profiles/:profileId/sessions';

export function createSessionsRoutes(c: SessionsController): Router {
  const router = express.Router();

  router.get(BASE, handle(c.list));
  router.get(`${BASE}/:id`, handle(c.get));
  router.post(BASE, handle(c.start));
  router.put(`${BASE}/:id`, handle(c.update));
  router.post(`${BASE}/:id/end`, handle(c.end));
  router.delete(`${BASE}/:id`, handle(c.remove));

  return router;
}