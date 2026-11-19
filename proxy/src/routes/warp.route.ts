import express, { Router } from 'express';
import { warpService } from '../services/warp.service';
import { handle, json, param } from '../utils/http';

export function registerWarpRoutes(): Router {
  const router = express.Router();

  router.get(
    '/warp',
    handle((_req, res) => json(res, 200, warpService.status())),
  );
  router.post(
    '/warp/proxies',
    handle(async (req, res) => json(res, 201, await warpService.create(req.body ?? {}))),
  );
  router.post(
    '/warp/proxies/:id/start',
    handle(async (req, res) => json(res, 200, await warpService.start(param(req.params.id)))),
  );
  router.post(
    '/warp/proxies/:id/stop',
    handle((req, res) => json(res, 200, warpService.stop(param(req.params.id)))),
  );

  return router;
}