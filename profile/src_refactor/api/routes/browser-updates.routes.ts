import express, { Router } from 'express';
import { handle } from '../../utils/http';
import type { BrowserUpdatesController } from '../controllers/browser-updates.controller';

export function createBrowserUpdatesRoutes(c: BrowserUpdatesController): Router {
  const router = express.Router();

  router.get('/browser/updates', handle(c.status));
  router.post('/browser/updates/check', handle(c.check));
  router.post('/browser/updates/:id/install', handle(c.install));

  return router;
}