import { useEffect, useState } from 'react';
import { TASKS_CHANGED_EVENT } from '../services/task.service';
import { workflowService } from '../services/workflow.service';

export interface WorkflowSubTask {
  text: string;
  done: boolean;
}

// ASSUMED: workflow is free-form Markdown; every list item ("- ", "* ", "1. ", optional [ ]/[x]) is a sub-task
const ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(?:\[([ xX])\]\s+)?(.+?)\s*$/;

export const parseWorkflowSubTasks = (content: string): WorkflowSubTask[] =>
  content.split(/\r?\n/).flatMap((line) => {
    const m = ITEM.exec(line);
    return m ? [{ text: m[2], done: m[1] === 'x' || m[1] === 'X' }] : [];
  });

export function useWorkflowSubTasks(
  projectPath: string | undefined,
  taskId: string | undefined,
  workflowId: string | null | undefined,
): WorkflowSubTask[] {
  const [items, setItems] = useState<WorkflowSubTask[]>([]);

  useEffect(() => {
    if (!projectPath || !taskId || !workflowId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const load = () =>
      workflowService
        .get(projectPath, taskId)
        .then((info) => {
          if (!cancelled) setItems(parseWorkflowSubTasks(info.content));
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        });
    void load();
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === projectPath) void load();
    };
    window.addEventListener(TASKS_CHANGED_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(TASKS_CHANGED_EVENT, onChange);
    };
  }, [projectPath, taskId, workflowId]);

  return items;
}