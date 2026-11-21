import express, { Router } from 'express';
import { taskService } from '../services/task.service';
import { workflowService } from '../services/workflow.service';
import { param, found } from '../utils/guard';
import { handle, json } from '../utils/http';

export function registerTaskRoutes(): Router {
  const router = express.Router();

  // Tasks
  router.get(
    '/projects/:projectId/tasks',
    handle((req, res) => json(res, 200, taskService.list(param(req.params.projectId)))),
  );
  router.post(
    '/projects/:projectId/tasks',
    handle((req, res) => json(res, 201, taskService.create(param(req.params.projectId), req.body ?? {}))),
  );
  router.get(
    '/projects/:projectId/tasks/:taskId',
    handle((req, res) =>
      json(res, 200, taskService.get(param(req.params.projectId), param(req.params.taskId))),
    ),
  );
  router.put(
    '/projects/:projectId/tasks/:taskId',
    handle((req, res) =>
      json(res, 200, taskService.update(param(req.params.projectId), param(req.params.taskId), req.body ?? {})),
    ),
  );
  router.delete(
    '/projects/:projectId/tasks/:taskId',
    handle((req, res) =>
      json(res, 200, taskService.remove(param(req.params.projectId), param(req.params.taskId))),
    ),
  );

  // Workflows
  router.get(
    '/tasks/:taskId/workflow',
    handle((req, res) => {
      const workflow = workflowService.get(param(req.params.taskId));
      if (!workflow) return json(res, 404, { error: 'Workflow not found' });
      json(res, 200, workflow);
    }),
  );
  router.post(
    '/tasks/:taskId/workflow',
    handle((req, res) => {
      const content = found(req.body?.content, 'content');
      json(res, 201, workflowService.create(param(req.params.taskId), content));
    }),
  );
  router.put(
    '/tasks/:taskId/workflow',
    handle((req, res) => {
      const oldContent = found(req.body?.oldContent, 'oldContent');
      const newContent = found(req.body?.newContent, 'newContent');
      json(res, 200, workflowService.update(param(req.params.taskId), oldContent, newContent));
    }),
  );

  return router;
}