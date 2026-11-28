import type { IdGeneratorPort } from '../../ports/id-generator.port';
import type { ProjectRepositoryPort } from '../../ports/repositories/project.repository.port';
import type { TaskAttachmentRepositoryPort } from '../../ports/repositories/task-attachment.repository.port';
import type { TaskChecklistRepositoryPort } from '../../ports/repositories/task-checklist.repository.port';
import type { TaskDependencyRepositoryPort } from '../../ports/repositories/task-dependency.repository.port';
import type { TaskTagRepositoryPort } from '../../ports/repositories/task-tag.repository.port';
import type { TaskRepositoryPort } from '../../ports/repositories/task.repository.port';
import { found, requireString } from '../../validation/validation';
import type { TaskWithDetails } from '../../models/task.read-models';

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

export class TaskService {
  constructor(
    private readonly tasks: TaskRepositoryPort,
    private readonly tags: TaskTagRepositoryPort,
    private readonly checklist: TaskChecklistRepositoryPort,
    private readonly attachments: TaskAttachmentRepositoryPort,
    private readonly dependencies: TaskDependencyRepositoryPort,
    private readonly projects: ProjectRepositoryPort,
    private readonly ids: IdGeneratorPort,
  ) {}

  private withDetails(taskId: string): TaskWithDetails {
    const task = found(this.tasks.get(taskId), 'task');
    return {
      ...task,
      tags: this.tags.listByTask(taskId),
      checklist: this.checklist.listByTask(taskId),
      attachments: this.attachments.listByTask(taskId),
      dependsOn: this.dependencies.listByTask(taskId),
    };
  }

  private syncTags(taskId: string, items: TaskTag[]): void {
    const keep = new Set<string>();
    for (const item of items) {
      const id = item.id || this.ids.newId();
      this.tags.insert({ id, taskId, label: item.label, color: item.color });
      keep.add(id);
    }
    for (const existing of this.tags.listByTask(taskId)) {
      if (!keep.has(existing.id)) this.tags.remove(existing.id);
    }
  }

  private syncChecklist(taskId: string, items: TaskChecklistItem[]): void {
    const keep = new Set<string>();
    items.forEach((item, index) => {
      const id = item.id || this.ids.newId();
      const existing = this.checklist.listByTask(taskId).find((c) => c.id === id);
      if (existing) {
        this.checklist.update(id, { text: item.text, done: item.done });
      } else {
        this.checklist.insert({ id, taskId, text: item.text, done: item.done, sortOrder: index });
      }
      keep.add(id);
    });
    for (const existing of this.checklist.listByTask(taskId)) {
      if (!keep.has(existing.id)) this.checklist.remove(existing.id);
    }
  }

  private syncAttachments(taskId: string, items: TaskAttachment[]): void {
    this.attachments.removeByTask(taskId);
    items.forEach((item, index) => {
      this.attachments.insert({
        id: this.ids.newId(),
        taskId,
        path: item.path,
        kind: item.kind,
        sortOrder: index,
      });
    });
  }

  private syncDependencies(taskId: string, ids: string[]): void {
    this.dependencies.removeByTask(taskId);
    for (const id of ids) {
      this.dependencies.insert(taskId, id);
    }
  }

  list = (projectId: string): TaskWithDetails[] => {
    found(this.projects.get(projectId), 'project');
    return this.tasks.listByProject(projectId).map((task) => ({
      ...task,
      tags: this.tags.listByTask(task.id),
      checklist: this.checklist.listByTask(task.id),
      attachments: this.attachments.listByTask(task.id),
      dependsOn: this.dependencies.listByTask(task.id),
    }));
  };

  get = (projectId: string, taskId: string): TaskWithDetails => {
    found(this.projects.get(projectId), 'project');
    return this.withDetails(taskId);
  };

  create = (projectId: string, input: TaskInput): TaskWithDetails => {
    found(this.projects.get(projectId), 'project');
    const id = this.ids.newId();
    this.tasks.transaction(() => {
      this.tasks.insert({
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
      if (input.tags?.length) this.syncTags(id, input.tags);
      if (input.checklist?.length) this.syncChecklist(id, input.checklist);
      if (input.attachments?.length) this.syncAttachments(id, input.attachments);
      if (input.dependsOn?.length) this.syncDependencies(id, input.dependsOn);
    });
    return this.withDetails(id);
  };

  update = (projectId: string, taskId: string, input: TaskUpdateInput): TaskWithDetails => {
    found(this.projects.get(projectId), 'project');
    found(this.tasks.get(taskId), 'task');
    this.tasks.transaction(() => {
      this.tasks.update(taskId, {
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
      if (input.tags) this.syncTags(taskId, input.tags);
      if (input.checklist) this.syncChecklist(taskId, input.checklist);
      if (input.attachments) this.syncAttachments(taskId, input.attachments);
      if (input.dependsOn) this.syncDependencies(taskId, input.dependsOn);
    });
    return this.withDetails(taskId);
  };

  remove = (projectId: string, taskId: string) => {
    found(this.projects.get(projectId), 'project');
    found(this.tasks.get(taskId), 'task');
    const deleted = this.tasks.remove(taskId);
    return { deleted };
  };
}