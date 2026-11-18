import express, { Router } from 'express';
import { checkService } from '../services/check.service';
import { proxyService } from '../services/proxy.service';
import { sourceService } from '../services/source.service';
import { handle, json, param } from '../utils/http';

export function registerSourceRoutes(): Router {
  const router = express.Router();

  router.get(
    '/sources',
    handle((_req, res) => json(res, 200, sourceService.list())),
  );
  router.post(
    '/sources',
    handle((req, res) => json(res, 201, sourceService.create(req.body ?? {}))),
  );
  router.get(
    '/sources/:id',
    handle((req, res) => json(res, 200, sourceService.get(param(req.params.id)))),
  );
  router.put(
    '/sources/:id',
    handle((req, res) => json(res, 200, sourceService.update(param(req.params.id), req.body ?? {}))),
  );
  router.delete(
    '/sources/:id',
    handle((req, res) => {
      sourceService.remove(param(req.params.id));
      json(res, 200, { deleted: true });
    }),
  );
  router.get(
    '/sources/:id/stats',
    handle((req, res) => json(res, 200, proxyService.stats(param(req.params.id)))),
  );
  router.post(
    '/sources/:id/test',
    handle(async (req, res) => json(res, 200, await checkService.testSource(param(req.params.id)))),
  );

  return router;
}