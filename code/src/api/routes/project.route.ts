import express, { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { handle } from '../middleware/async-handler.middleware';

export function registerProjectRoutes(c: ProjectController): Router {
  const router = express.Router();

  router.get('/projects', handle(c.list));
  router.post('/projects', handle(c.create));
  router.put('/projects', handle(c.saveAll));
  router.post('/projects/logo/download', handle(c.downloadLogo));
  router.get('/projects/:id', handle(c.get));
  router.put('/projects/:id', handle(c.update));
  router.delete('/projects/:id', handle(c.remove));

  router.get('/projects/:id/worktrees', handle(c.listWorktrees));
  router.post('/projects/:id/worktrees', handle(c.createWorktree));
  router.get('/projects/:id/worktrees/:worktreeId', handle(c.getWorktree));
  router.put('/projects/:id/worktrees/:worktreeId', handle(c.updateWorktree));
  router.delete('/projects/:id/worktrees/:worktreeId', handle(c.removeWorktree));

  return router;
}