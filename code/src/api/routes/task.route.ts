import express, { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { handle } from '../middleware/async-handler.middleware';

export function registerTaskRoutes(c: TaskController): Router {
  const router = express.Router();

  router.get('/projects/:projectId/tasks', handle(c.list));
  router.post('/projects/:projectId/tasks', handle(c.create));
  router.get('/projects/:projectId/tasks/:taskId', handle(c.get));
  router.put('/projects/:projectId/tasks/:taskId', handle(c.update));
  router.delete('/projects/:projectId/tasks/:taskId', handle(c.remove));

  router.get('/tasks/:taskId/workflow', handle(c.getWorkflow));
  router.post('/tasks/:taskId/workflow', handle(c.createWorkflow));
  router.put('/tasks/:taskId/workflow', handle(c.updateWorkflow));

  return router;
}