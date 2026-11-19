import express, { Router } from 'express';
import { serviceService } from '../services/service.service';
import { param } from '../utils/guard';
import { handle, json } from '../utils/http';

export function registerServiceRoutes(): Router {
  const router = express.Router();

  router.get('/services', handle(async (_req, res) => json(res, 200, await serviceService.list())));
  router.post(
    '/services',
    handle(async (req, res) => json(res, 201, await serviceService.create(req.body ?? {}))),
  );
  router.get(
    '/services/:id',
    handle(async (req, res) => json(res, 200, await serviceService.get(param(req.params.id)))),
  );
  router.put(
    '/services/:id',
    handle(async (req, res) =>
      json(res, 200, await serviceService.update(param(req.params.id), req.body ?? {})),
    ),
  );
  router.delete(
    '/services/:id',
    handle(async (req, res) => {
      await serviceService.remove(param(req.params.id));
      json(res, 200, { deleted: true });
    }),
  );

  return router;
}