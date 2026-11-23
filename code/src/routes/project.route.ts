import express, { Router } from 'express';
import { projectService } from '../services/project.service';
import { worktreeService } from '../services/worktree.service';
import { imageService } from '../services/fs/image.service';
import { found, param, requireString } from '../utils/guard';
import { handle, json } from '../utils/http';

export function registerProjectRoutes(): Router {
  const router = express.Router();

  router.get('/projects', handle((_req, res) => json(res, 200, projectService.list())));
  router.post('/projects', handle(async (req, res) => json(res, 201, await projectService.create(req.body ?? {}))));
  router.put(
    '/projects',
    handle(async (req, res) => {
      const list = found(Array.isArray(req.body?.projects) ? req.body.projects : null, 'projects');
      json(res, 200, await projectService.saveAll(list));
    }),
  );
  router.post(
    '/projects/logo/download',
    handle(async (req, res) => {
      json(res, 200, await imageService.downloadProjectLogo(requireString(req.body?.url, 'url')));
    }),
  );
  router.get('/projects/:id', handle((req, res) => json(res, 200, projectService.get(param(req.params.id)))));
  router.put(
    '/projects/:id',
    handle(async (req, res) => json(res, 200, await projectService.update(param(req.params.id), req.body ?? {}))),
  );
  router.delete('/projects/:id', handle((req, res) => json(res, 200, projectService.remove(param(req.params.id)))));

  router.get(
    '/projects/:id/worktrees',
    handle((req, res) => json(res, 200, worktreeService.list(param(req.params.id)))),
  );
  router.post(
    '/projects/:id/worktrees',
    handle(async (req, res) => json(res, 201, await worktreeService.create(param(req.params.id), req.body ?? {}))),
  );
  router.get(
    '/projects/:id/worktrees/:worktreeId',
    handle((req, res) =>
      json(res, 200, worktreeService.get(param(req.params.id), param(req.params.worktreeId))),
    ),
  );
  router.put(
    '/projects/:id/worktrees/:worktreeId',
    handle((req, res) =>
      json(res, 200, worktreeService.update(param(req.params.id), param(req.params.worktreeId), req.body ?? {})),
    ),
  );
  router.delete(
    '/projects/:id/worktrees/:worktreeId',
    handle((req, res) =>
      json(res, 200, worktreeService.remove(param(req.params.id), param(req.params.worktreeId))),
    ),
  );

  return router;
}