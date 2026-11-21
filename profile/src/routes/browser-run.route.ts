import express, { Router } from 'express';
import { browserForkService } from '../services/browser-fork.service';
import { browserRunService } from '../services/browser-run.service';
import { param } from '../utils/guard';
import { handle, json } from '../utils/http';

export function registerBrowserRunRoutes(): Router {
  const router = express.Router();

  router.get(
    '/browser/running',
    handle(async (_req, res) => json(res, 200, await browserRunService.list())),
  );
  router.get(
    '/browser/forks',
    handle(async (_req, res) => json(res, 200, await browserForkService.list())),
  );
  router.post(
    '/profiles/:id/launch',
    handle(async (req, res) =>
      json(res, 201, await browserRunService.launch(param(req.params.id), req.body ?? {})),
    ),
  );
  router.post(
    '/profiles/:id/stop',
    handle(async (req, res) => json(res, 200, await browserRunService.stop(param(req.params.id)))),
  );

  return router;
}