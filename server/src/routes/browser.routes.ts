import express, { Router } from 'express';
import { browserForkService } from '../services/browser-fork.service';
import { browserUpdateService } from '../services/browser-update.service';
import { AppError } from '../utils/api-error';
import { handle, param } from '../utils/handle';
import { json } from '../utils/response';

export function registerBrowserRoutes(): Router {
  const router = express.Router();

  router.get(
    '/browser/forks',
    handle(async (_req, res) => json(res, 200, await browserForkService.list())),
  );
  router.get(
    '/browser/forks/:id/path',
    handle(async (req, res) => {
      const exe = browserForkService.findPath(param(req.params.id));
      if (!exe) throw new AppError('fork build not found', 404);
      json(res, 200, { path: exe });
    }),
  );
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