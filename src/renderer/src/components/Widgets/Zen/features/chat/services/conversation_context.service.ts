/**
 * ------------------------------------------------------------------
 * Conversation Context Service
 * ------------------------------------------------------------------
 * Resolve moduleId của conversation từ feature context hiện tại.
 *
 * Main functions:
 * - getModuleIdFromContext() : Trả về moduleId (code/emulate/recon/legacy)
 * ------------------------------------------------------------------
 */

import { resolveConversationModuleId } from '../registries/module.registry';

/**
 * Get moduleId from feature context
 * This should be called with proper context from parent component
 */
export function getModuleIdFromContext(sessionId: number, folderPath: string | null): string {
  const scoped = resolveConversationModuleId();
  if (scoped) return scoped;

  // Try to get from global feature context
  const feature = (window as any).__activeFeature;
  const targetId = (window as any).__activeTargetId;
  const projectId = (window as any).__currentProjectId;

  if (feature === 'emulate' && targetId) {
    return `emulate:${targetId}`;
  } else if (feature === 'code' && projectId) {
    return `code:${projectId}`;
  } else if (feature === 'recon' && targetId) {
    return `recon:${targetId}`;
  }

  // Fallback to old format (will be migrated)
  const safeFolderPath = folderPath || 'global';
  return `legacy:${sessionId}:${safeFolderPath}`;
}
