import express, { Router } from 'express';
import { ScopeController } from '../controllers/scope.controller';
import { handle } from '../middleware/async-handler.middleware';

export function registerScopeRoutes(c: ScopeController): Router {
  const router = express.Router();

  router.get('/worktrees/:worktreeId/scopes', handle(c.list));
  router.put('/worktrees/:worktreeId/scopes', handle(c.set));
  router.get('/worktrees/:worktreeId/scopes/:scopeId', handle(c.get));
  router.delete('/worktrees/:worktreeId/scopes/:scopeId', handle(c.remove));

  return router;
}