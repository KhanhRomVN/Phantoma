import express, { Router } from 'express';
import { queryService } from '../services/query.service';
import { param } from '../utils/guard';
import { handle, json } from '../utils/http';

export function registerQueryRoutes(): Router {
  const router = express.Router();

  router.get('/queries', handle(async (_req, res) => json(res, 200, await queryService.list())));
  router.post(
    '/queries',
    handle(async (req, res) => json(res, 201, await queryService.create(req.body ?? {}))),
  );
  router.get(
    '/queries/:id',
    handle(async (req, res) => json(res, 200, await queryService.get(param(req.params.id)))),
  );
  router.put(
    '/queries/:id',
    handle(async (req, res) =>
      json(res, 200, await queryService.update(param(req.params.id), req.body ?? {})),
    ),
  );
  router.delete(
    '/queries/:id',
    handle(async (req, res) => {
      await queryService.remove(param(req.params.id));
      json(res, 200, { deleted: true });
    }),
  );

  return router;
}