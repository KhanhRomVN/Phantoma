/**
 * ------------------------------------------------------------------
 * Orchestrator Task Context Service
 * ------------------------------------------------------------------
 * Nạp danh sách task của project hiện tại và dựng chuỗi ngữ cảnh task
 * để đưa vào system prompt của orchestrator agent.
 *
 * Main functions:
 * - loadOrchestratorTaskContext() : Lấy task theo project/session/branch và build context
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { taskService } from '../../shared/services/task.service';

// ── Stores ──
import { useCodeStore } from '../../shared/stores/code.store';

// ── Utils ──
import { buildOrchestratorTaskContext } from '../prompts/orchestrator/task-context';

// ─── Functions ───────────────────────────────────────────────────────────────
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