/**
 * ------------------------------------------------------------------
 * history-context.service
 * ------------------------------------------------------------------
 * Nơi DUY NHẤT trong History đọc workspace/module context
 * (window globals + Code store). Component/hook không tự đọc global.
 *
 * Precedence (giữ nguyên hành vi cũ):
 *   1. workspace folder path (ConversationService)
 *   2. Code project path (explorerRoot ?? path)
 *   3. module ID theo feature/target/project
 * ------------------------------------------------------------------
 */

import { useCodeStore } from '@renderer/modules/Code/shared/stores/code.store';
import type { HistoryScope } from '../types';
import { resolveConversationModuleId } from '../../chat/registries/module.registry';
import { getWorkspaceFolderPath } from '@renderer/components/Widgets/Zen/shared/conversations/conversation-storage.service';

interface ZenWindowGlobals {
  __activeFeature?: string;
  __activeTargetId?: string;
  __currentProjectId?: string;
  __activeDesignId?: string;
  __zenWorkspaceFolderPath?: string;
}

const getGlobals = (): ZenWindowGlobals => window as unknown as ZenWindowGlobals;

/** Module ID theo context hiện tại. */
function getCurrentModuleId(): string | null {
  const scoped = resolveConversationModuleId();
  if (scoped) return scoped;

  const g = getGlobals();
  const feature = g.__activeFeature;
  const targetId = g.__activeTargetId;
  const projectId = g.__currentProjectId;

  if (feature === 'emulate' && targetId) return `emulate:${targetId}`;
  if (feature === 'code' && projectId) return `code:${projectId}`;
  if (feature === 'recon' && targetId) return `recon:${targetId}`;
  if (feature === 'design' && g.__activeDesignId) return `design:${g.__activeDesignId}`;

  return null;
}

/**
 * Resolve scope lưu conversation (dùng CHUNG key với Chat).
 * Trả về null khi không xác định được scope.
 */
export function resolveHistoryScope(): HistoryScope | null {
  const scopedModuleId = getCurrentModuleId();
  if (scopedModuleId && /^(code|emulate):/.test(scopedModuleId)) {
    return { kind: 'module', key: scopedModuleId };
  }

  const folderPath = getWorkspaceFolderPath();
  if (folderPath) return { kind: 'workspace', key: folderPath };

  // Fallback: đọc trực tiếp từ Code store (project path thật) — đảm bảo
  // cùng key hash với Chat kể cả khi __zenWorkspaceFolderPath chưa được set.
  try {
    const state = useCodeStore.getState();
    const project = state.projects?.find((p) => p.id === state.currentProjectId);
    const root = project?.explorerRoot ?? project?.path;
    if (root) {
      getGlobals().__zenWorkspaceFolderPath = root;
      return { kind: 'workspace', key: root };
    }
  } catch {
    // ignore
  }

  const moduleId = getCurrentModuleId();
  return moduleId ? { kind: 'module', key: moduleId } : null;
}
