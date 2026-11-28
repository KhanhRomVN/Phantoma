import type { TaskRepositoryPort } from '../../ports/repositories/task.repository.port';
import type { WorkflowRepositoryPort } from '../../ports/repositories/workflow.repository.port';
import { found } from '../../validation/validation';
import type { Workflow } from '../../../domain/workflow/workflow.types';

export class WorkflowService {
  constructor(
    private readonly workflows: WorkflowRepositoryPort,
    private readonly tasks: TaskRepositoryPort,
  ) {}

  get = (taskId: string): Workflow | null => {
    found(this.tasks.get(taskId), 'task');
    return this.workflows.getByTask(taskId);
  };

  create = (taskId: string, content: string): Workflow => {
    found(this.tasks.get(taskId), 'task');
    const existing = this.workflows.getByTask(taskId);
    if (existing) throw new Error('Workflow already exists for this task');
    const id = `workflow_${taskId}`;
    this.workflows.insert({ id, taskId, content });
    this.tasks.update(taskId, { workflowId: id });
    return found(this.workflows.getByTask(taskId), 'workflow');
  };

  update = (taskId: string, oldContent: string, newContent: string): Workflow => {
    found(this.tasks.get(taskId), 'task');
    const workflow = found(this.workflows.getByTask(taskId), 'workflow');
    if (!oldContent) throw new Error('old_content must not be empty');
    const current = workflow.content;
    const first = current.indexOf(oldContent);
    if (first === -1) throw new Error('old_content not found in workflow');
    if (current.indexOf(oldContent, first + 1) !== -1) {
      throw new Error('old_content matches more than one place in workflow');
    }
    const updated = current.slice(0, first) + newContent + current.slice(first + oldContent.length);
    this.workflows.update(taskId, updated);
    return found(this.workflows.getByTask(taskId), 'workflow');
  };
}