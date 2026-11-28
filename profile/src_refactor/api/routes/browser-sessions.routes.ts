import express, { Router } from 'express';
import { handle } from '../../utils/http';
import type { BrowserSessionsController } from '../controllers/browser-sessions.controller';

export function createBrowserSessionsRoutes(c: BrowserSessionsController): Router {
  const router = express.Router();

  router.get('/browser/running', handle(c.running));
  router.get('/browser/forks', handle(c.forks));
  router.post('/profiles/:id/launch', handle(c.launch));
  router.post('/profiles/:id/stop', handle(c.stop));

  return router;
}