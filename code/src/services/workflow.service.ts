import { workflowRepository } from '../repositories/workflow.repository';
import { taskRepository } from '../repositories/task.repository';
import { found } from '../utils/guard';
import type { Workflow } from '../domain/mappers';

export const workflowService = {
  get: (taskId: string): Workflow | null => {
    found(taskRepository.get(taskId), 'task');
    return workflowRepository.getByTask(taskId);
  },

  create: (taskId: string, content: string): Workflow => {
    const task = found(taskRepository.get(taskId), 'task');
    const existing = workflowRepository.getByTask(taskId);
    if (existing) throw new Error('Workflow already exists for this task');
    const id = `workflow_${taskId}`;
    workflowRepository.insert({ id, taskId, content });
    taskRepository.update(taskId, { workflowId: id });
    return found(workflowRepository.getByTask(taskId), 'workflow');
  },

  update: (taskId: string, oldContent: string, newContent: string): Workflow => {
    found(taskRepository.get(taskId), 'task');
    const workflow = found(workflowRepository.getByTask(taskId), 'workflow');
    if (!oldContent) throw new Error('old_content must not be empty');
    const current = workflow.content;
    const first = current.indexOf(oldContent);
    if (first === -1) throw new Error('old_content not found in workflow');
    if (current.indexOf(oldContent, first + 1) !== -1) {
      throw new Error('old_content matches more than one place in workflow');
    }
    const updated = current.slice(0, first) + newContent + current.slice(first + oldContent.length);
    workflowRepository.update(taskId, updated);
    return found(workflowRepository.getByTask(taskId), 'workflow');
  },
};