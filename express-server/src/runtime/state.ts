/**
 * ------------------------------------------------------------------
 * Runtime State (port từ src/main/shared/state.ts)
 * ------------------------------------------------------------------
 * Theo dõi tiến trình con đang hoạt động và capture instance cho
 * từng target. Bỏ hoàn toàn phụ thuộc Electron.
 * ------------------------------------------------------------------
 */

import type { ChildProcess } from 'child_process';

export interface CaptureInstance {
  type: 'ebpf' | 'pcap' | 'app-debug' | 'frida' | 'cdp';
  instance: any;
  pid?: number;
  targetId: string;
}

export interface AppState {
  activeChildProcess: ChildProcess | null;
  activeProxyUrl: string | null;
  targetProcesses: Map<string, ChildProcess>;
  activeCaptures: Map<string, CaptureInstance>;
}

export const appState: AppState = {
  activeChildProcess: null,
  activeProxyUrl: null,
  targetProcesses: new Map(),
  activeCaptures: new Map(),
};

export function clearActiveState(): void {
  appState.activeChildProcess = null;
  appState.activeProxyUrl = null;
}

export function setTargetProcess(targetId: string, proc: ChildProcess): void {
  const old = appState.targetProcesses.get(targetId);
  if (old && !old.killed) old.kill();
  appState.targetProcesses.set(targetId, proc);
}

export function removeTargetProcess(targetId: string): void {
  const proc = appState.targetProcesses.get(targetId);
  if (proc && !proc.killed) proc.kill();
  appState.targetProcesses.delete(targetId);
}

export function clearAllTargetProcesses(): void {
  appState.targetProcesses.forEach((proc) => {
    if (!proc.killed) proc.kill();
  });
  appState.targetProcesses.clear();
}

export function setCaptureInstance(targetId: string, capture: CaptureInstance): void {
  const old = appState.activeCaptures.get(targetId);
  if (old?.instance?.stop) old.instance.stop();
  appState.activeCaptures.set(targetId, capture);
}

export function removeCaptureInstance(targetId: string): void {
  const capture = appState.activeCaptures.get(targetId);
  if (capture?.instance?.stop) capture.instance.stop();
  appState.activeCaptures.delete(targetId);
}

export function clearAllCaptureInstances(): void {
  appState.activeCaptures.forEach((capture) => {
    if (capture?.instance?.stop) capture.instance.stop();
  });
  appState.activeCaptures.clear();
}