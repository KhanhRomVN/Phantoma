import { taskRepository } from '../repositories/task.repository';
import { taskTagRepository } from '../repositories/task-tag.repository';
import { taskChecklistRepository } from '../repositories/task-checklist.repository';
import { taskAttachmentRepository } from '../repositories/task-attachment.repository';
import { taskDependencyRepository } from '../repositories/task-dependency.repository';
import { projectRepository } from '../repositories/project.repository';
import { found, requireString } from '../utils/guard';
import { newId } from '../utils/http';
import type { TaskWithDetails } from '../domain/mappers';

export interface TaskTag {
  id: string;
  label: string;
  color: string;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskAttachment {
  path: string;
  kind: 'file' | 'folder';
}

export interface TaskInput {
  title: string;
  description?: string;
  status?: 'todo' | 'progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  sessionId?: string | null;
  branchName?: string | null;
  startDate?: number | null;
  startTime?: string | null;
  endDate?: number | null;
  endTime?: string | null;
  tags?: TaskTag[];
  checklist?: TaskChecklistItem[];
  attachments?: TaskAttachment[];
  dependsOn?: string[];
}

export interface TaskUpdateInput extends Partial<TaskInput> {
  archived?: boolean;
  workflowId?: string | null;
  sortOrder?: number;
}

function withDetails(taskId: string): TaskWithDetails {
  const task = found(taskRepository.get(taskId), 'task');
  return {
    ...task,
    tags: taskTagRepository.listByTask(taskId),
    checklist: taskChecklistRepository.listByTask(taskId),
    attachments: taskAttachmentRepository.listByTask(taskId),
    dependsOn: taskDependencyRepository.listByTask(taskId),
  };
}

function syncTags(taskId: string, items: TaskTag[]): void {
  const keep = new Set<string>();
  for (const item of items) {
    const id = item.id || newId();
    taskTagRepository.insert({ id, taskId, label: item.label, color: item.color });
    keep.add(id);
  }
  for (const existing of taskTagRepository.listByTask(taskId)) {
    if (!keep.has(existing.id)) taskTagRepository.remove(existing.id);
  }
}

function syncChecklist(taskId: string, items: TaskChecklistItem[]): void {
  const keep = new Set<string>();
  items.forEach((item, index) => {
    const id = item.id || newId();
    const existing = taskChecklistRepository.listByTask(taskId).find((c) => c.id === id);
    if (existing) {
      taskChecklistRepository.update(id, { text: item.text, done: item.done });
    } else {
      taskChecklistRepository.insert({ id, taskId, text: item.text, done: item.done, sortOrder: index });
    }
    keep.add(id);
  });
  for (const existing of taskChecklistRepository.listByTask(taskId)) {
    if (!keep.has(existing.id)) taskChecklistRepository.remove(existing.id);
  }
}

function syncAttachments(taskId: string, items: TaskAttachment[]): void {
  taskAttachmentRepository.removeByTask(taskId);
  items.forEach((item, index) => {
    taskAttachmentRepository.insert({
      id: newId(),
      taskId,
      path: item.path,
      kind: item.kind,
      sortOrder: index,
    });
  });
}

function syncDependencies(taskId: string, ids: string[]): void {
  taskDependencyRepository.removeByTask(taskId);
  for (const id of ids) {
    taskDependencyRepository.insert(taskId, id);
  }
}

export const taskService = {
  list: (projectId: string): TaskWithDetails[] => {
    found(projectRepository.get(projectId), 'project');
    return taskRepository.listByProject(projectId).map((task) => ({
      ...task,
      tags: taskTagRepository.listByTask(task.id),
      checklist: taskChecklistRepository.listByTask(task.id),
      attachments: taskAttachmentRepository.listByTask(task.id),
      dependsOn: taskDependencyRepository.listByTask(task.id),
    }));
  },

  get: (projectId: string, taskId: string): TaskWithDetails => {
    found(projectRepository.get(projectId), 'project');
    return withDetails(taskId);
  },

  create: (projectId: string, input: TaskInput): TaskWithDetails => {
    found(projectRepository.get(projectId), 'project');
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    taskRepository.transaction(() => {
      taskRepository.insert({
        id,
        projectId,
        title: requireString(input.title, 'title'),
        description: input.description,
        status: input.status,
        priority: input.priority,
        sessionId: input.sessionId,
        branchName: input.branchName,
        startDate: input.startDate,
        startTime: input.startTime,
        endDate: input.endDate,
        endTime: input.endTime,
      });
      if (input.tags?.length) syncTags(id, input.tags);
      if (input.checklist?.length) syncChecklist(id, input.checklist);
      if (input.attachments?.length) syncAttachments(id, input.attachments);
      if (input.dependsOn?.length) syncDependencies(id, input.dependsOn);
    });
    return withDetails(id);
  },

  update: (projectId: string, taskId: string, input: TaskUpdateInput): TaskWithDetails => {
    found(projectRepository.get(projectId), 'project');
    found(taskRepository.get(taskId), 'task');
    taskRepository.transaction(() => {
      taskRepository.update(taskId, {
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        sessionId: input.sessionId,
        branchName: input.branchName,
        startDate: input.startDate,
        startTime: input.startTime,
        endDate: input.endDate,
        endTime: input.endTime,
        archived: input.archived,
        workflowId: input.workflowId,
        sortOrder: input.sortOrder,
      });
      if (input.tags) syncTags(taskId, input.tags);
      if (input.checklist) syncChecklist(taskId, input.checklist);
      if (input.attachments) syncAttachments(taskId, input.attachments);
      if (input.dependsOn) syncDependencies(taskId, input.dependsOn);
    });
    return withDetails(taskId);
  },

  remove: (projectId: string, taskId: string) => {
    found(projectRepository.get(projectId), 'project');
    found(taskRepository.get(taskId), 'task');
    const deleted = taskRepository.remove(taskId);
    return { deleted };
  },
};