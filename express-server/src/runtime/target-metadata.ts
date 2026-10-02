/**
 * ------------------------------------------------------------------
 * Target Metadata Registry
 * ------------------------------------------------------------------
 * Thay thế targetMetadata Map trong src/main/ipc/target.handlers.ts.
 * Quản lý metadata target (title, favicon, platform, url) và phát
 * event target:status-changed qua runtimeBus thay vì webContents.send.
 * ------------------------------------------------------------------
 */

import { runtimeBus } from './event-bus';

export interface TargetMetadata {
  id: string;
  title: string;
  favicon?: string;
  platform?: string;
  url?: string;
}

const targetMetadata = new Map<string, TargetMetadata>();

export function registerTargetMetadata(data: TargetMetadata): void {
  targetMetadata.set(data.id, data);
  runtimeBus.emitEvent('target:status-changed', {
    targetId: data.id,
    status: 'running',
    target: data,
  });
}

export function unregisterTargetMetadata(targetId: string): void {
  targetMetadata.delete(targetId);
  runtimeBus.emitEvent('target:status-changed', {
    targetId,
    status: 'stopped',
  });
}

export function getTargetMetadata(targetId: string): TargetMetadata | undefined {
  return targetMetadata.get(targetId);
}

export function listTargetMetadata(): TargetMetadata[] {
  return Array.from(targetMetadata.values());
}

/** Phát event target:status-changed — dùng trong app-launcher. */
export function emitTargetStatusChanged(
  targetId: string,
  status: 'running' | 'stopped',
  target?: TargetMetadata,
): void {
  runtimeBus.emitEvent('target:status-changed', { targetId, status, target });
}