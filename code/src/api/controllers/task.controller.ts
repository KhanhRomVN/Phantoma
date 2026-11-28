import { Request, Response } from 'express';
import type { TaskService } from '../../application/services/tasks/task.service';
import type { WorkflowService } from '../../application/services/tasks/workflow.service';
import { found } from '../../application/validation/validation';
import { param } from '../http/params';
import { json } from '../http/envelope';

export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly workflowService: WorkflowService,
  ) {}

  list = (req: Request, res: Response): void => json(res, 200, this.taskService.list(param(req.params.projectId)));

  create = (req: Request, res: Response): void =>
    json(res, 201, this.taskService.create(param(req.params.projectId), req.body ?? {}));

  get = (req: Request, res: Response): void =>
    json(res, 200, this.taskService.get(param(req.params.projectId), param(req.params.taskId)));

  update = (req: Request, res: Response): void =>
    json(res, 200, this.taskService.update(param(req.params.projectId), param(req.params.taskId), req.body ?? {}));

  remove = (req: Request, res: Response): void =>
    json(res, 200, this.taskService.remove(param(req.params.projectId), param(req.params.taskId)));

  getWorkflow = (req: Request, res: Response): void => {
    const workflow = this.workflowService.get(param(req.params.taskId));
    if (!workflow) return json(res, 404, { error: 'Workflow not found' });
    json(res, 200, workflow);
  };

  createWorkflow = (req: Request, res: Response): void => {
    const content = found(req.body?.content, 'content');
    json(res, 201, this.workflowService.create(param(req.params.taskId), content));
  };

  updateWorkflow = (req: Request, res: Response): void => {
    const oldContent = found(req.body?.oldContent, 'oldContent');
    const newContent = found(req.body?.newContent, 'newContent');
    json(res, 200, this.workflowService.update(param(req.params.taskId), oldContent, newContent));
  };
}