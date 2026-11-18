import express, { Router } from 'express';
import { browserUpdateService } from '../services/browser-update.service';
import { param } from '../utils/guard';
import { handle, json } from '../utils/http';

export function registerBrowserUpdateRoutes(): Router {
  const router = express.Router();

  router.get(
    '/browser/updates',
    handle(async (_req, res) => json(res, 200, await browserUpdateService.status())),
  );
  router.post(
    '/browser/updates/check',
    handle(async (_req, res) => json(res, 200, await browserUpdateService.status(true))),
  );
  router.post(
    '/browser/updates/:id/install',
    handle(async (req, res) => {
      const version = typeof req.body?.version === 'string' ? req.body.version : undefined;
      json(res, 202, await browserUpdateService.install(param(req.params.id), version));
    }),
  );

  return router;
}