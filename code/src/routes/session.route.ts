import express, { type Router } from 'express';
import { sessionService } from '../services/session.service';
import { param } from '../utils/guard';
import { handle, json } from '../utils/http';

export function registerSessionRoutes(): Router {
  const router = express.Router();

  router.get('/sessions', handle((_req, res) => json(res, 200, sessionService.list())));
  router.post('/sessions', handle((req, res) => json(res, 201, sessionService.create(req.body ?? {}))));
  router.get('/sessions/:id', handle((req, res) => json(res, 200, sessionService.get(param(req.params.id)))));
  router.put(
    '/sessions/:id',
    handle((req, res) => json(res, 200, sessionService.update(param(req.params.id), req.body ?? {}))),
  );
  router.put(
    '/sessions/:id/workspace',
    handle((req, res) => json(res, 200, sessionService.saveWorkspace(param(req.params.id), req.body ?? {}))),
  );
  router.delete('/sessions/:id', handle((req, res) => json(res, 200, sessionService.remove(param(req.params.id)))));

  return router;
}