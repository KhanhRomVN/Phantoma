import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { logger } from '../utils/logger';
import { getProjectSlug } from './TaskStorage';

const TASK_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function getWorkflowFilePath(projectPath: string, taskId: string): string {
  if (!TASK_ID_PATTERN.test(taskId)) {
    throw new Error(`Invalid task id: ${taskId}`);
  }
  return path.join(
    app.getPath('home'),
    '.phantoma',
    'code',
    getProjectSlug(projectPath),
    'workflows',
    `workflow_${taskId}.md`,
  );
}

function writeFileAtomic(filePath: string, content: string) {
  const tmpPath = `${filePath}.tmp`;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    logger.error('[WorkflowStorage] Write failed:', err);
    throw err;
  }
}

class WorkflowStorageService {
  public getWorkflowId(taskId: string): string {
    return `workflow_${taskId}`;
  }

  public exists(projectPath: string, taskId: string): boolean {
    return fs.existsSync(getWorkflowFilePath(projectPath, taskId));
  }

  public getWorkflow(projectPath: string, taskId: string): string | undefined {
    const filePath = getWorkflowFilePath(projectPath, taskId);
    if (!fs.existsSync(filePath)) return undefined;
    return fs.readFileSync(filePath, 'utf-8');
  }

  public createWorkflow(projectPath: string, taskId: string, content: string): string {
    const filePath = getWorkflowFilePath(projectPath, taskId);
    if (fs.existsSync(filePath)) {
      throw new Error('Workflow already exists for this task');
    }
    writeFileAtomic(filePath, content);
    return this.getWorkflowId(taskId);
  }

  public updateWorkflow(
    projectPath: string,
    taskId: string,
    oldContent: string,
    newContent: string,
  ): string {
    const filePath = getWorkflowFilePath(projectPath, taskId);
    if (!fs.existsSync(filePath)) {
      throw new Error('Workflow not found');
    }
    if (!oldContent) {
      throw new Error('old_content must not be empty');
    }
    const current = fs.readFileSync(filePath, 'utf-8');
    const first = current.indexOf(oldContent);
    if (first === -1) {
      throw new Error('old_content not found in workflow');
    }
    if (current.indexOf(oldContent, first + 1) !== -1) {
      throw new Error('old_content matches more than one place in workflow');
    }
    const updated = current.slice(0, first) + newContent + current.slice(first + oldContent.length);
    writeFileAtomic(filePath, updated);
    return updated;
  }
}

export const workflowStorage = new WorkflowStorageService();