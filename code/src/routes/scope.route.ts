import express, { Router } from 'express';
import { scopeService } from '../services/scope.service';
import { param, found } from '../utils/guard';
import { handle, json } from '../utils/http';

export function registerScopeRoutes(): Router {
  const router = express.Router();

  router.get(
    '/worktrees/:worktreeId/scopes',
    handle((req, res) => json(res, 200, scopeService.list(param(req.params.worktreeId)))),
  );
  router.put(
    '/worktrees/:worktreeId/scopes',
    handle((req, res) => {
      const paths = found(Array.isArray(req.body?.paths) ? req.body.paths : null, 'paths');
      json(res, 200, scopeService.set(param(req.params.worktreeId), paths));
    }),
  );
  router.get(
    '/worktrees/:worktreeId/scopes/:scopeId',
    handle((req, res) =>
      json(res, 200, scopeService.get(param(req.params.worktreeId), param(req.params.scopeId))),
    ),
  );
  router.delete(
    '/worktrees/:worktreeId/scopes/:scopeId',
    handle((req, res) =>
      json(res, 200, scopeService.remove(param(req.params.worktreeId), param(req.params.scopeId))),
    ),
  );

  return router;
}