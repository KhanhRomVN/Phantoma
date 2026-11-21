import { useCodeStore } from '../hooks/useCodeStore';
import { taskService } from './task.service';
import { buildOrchestratorTaskContext } from '../prompts/multi-agent/orchestrator/task-context';

export async function loadOrchestratorTaskContext(): Promise<string> {
  const state = useCodeStore.getState();
  const project = state.projects.find((p) => p.id === state.currentProjectId);
  const projectPath = project?.path;
  if (!projectPath) return '';
  const sessionId = state.activeWorkspaceSessionId ?? null;
  const branchName =
    project?.branches?.find((b) => b.sessions?.some((s) => s.id === sessionId))?.name ?? null;
  try {
    const tasks = await taskService.list(projectPath);
    return buildOrchestratorTaskContext(tasks, sessionId, branchName);
  } catch (e) {
    console.warn('[OrchestratorTaskContext] Failed to load tasks:', e);
    return '';
  }
}