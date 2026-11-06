import { useCodeStore } from '../hooks/useCodeStore';
import { taskService } from './task.service';
import { buildOrchestratorTaskContext } from '../prompts/multi-agent/orchestrator/task-context';

export async function loadOrchestratorTaskContext(): Promise<string> {
  const state = useCodeStore.getState();
  const projectPath = state.projects.find((p) => p.id === state.currentProjectId)?.path;
  if (!projectPath) return '';
  try {
    const tasks = await taskService.list(projectPath);
    return buildOrchestratorTaskContext(tasks, state.activeWorkspaceSessionId ?? null);
  } catch (e) {
    console.warn('[OrchestratorTaskContext] Failed to load tasks:', e);
    return '';
  }
}