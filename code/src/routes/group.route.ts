import express, { Router } from 'express';
import { groupService } from '../services/group.service';
import { param } from '../utils/guard';
import { handle, json } from '../utils/http';

export function registerGroupRoutes(): Router {
  const router = express.Router();

  router.get('/groups', handle((_req, res) => json(res, 200, groupService.list())));
  router.post('/groups', handle((req, res) => json(res, 201, groupService.create(req.body ?? {}))));
  router.get('/groups/:id', handle((req, res) => json(res, 200, groupService.get(param(req.params.id)))));
  router.put(
    '/groups/:id',
    handle((req, res) => json(res, 200, groupService.update(param(req.params.id), req.body ?? {}))),
  );
  router.delete('/groups/:id', handle((req, res) => json(res, 200, groupService.remove(param(req.params.id)))));

  return router;
}