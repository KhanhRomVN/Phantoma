/**
 * ------------------------------------------------------------------
 * Trạng thái ứng dụng
 * ------------------------------------------------------------------
 * Trạng thái có th��� thay đổi dùng chung cho tiến trình chính. Theo dõi
 * tiến trình con đang hoạt động và URL proxy để dọn dẹp.
 *
 * Hàm chính:
 * - setActiveChildProcess() : Đặt tiến trình con đang hoạt động
 * - setActiveProxyUrl()     : Đặt URL proxy đang hoạt động
 * - clearActiveState()      : Đặt lại tất cả trạng thái hoạt động
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Node.js ──
import { ChildProcess } from 'child_process';

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface AppState {
  activeChildProcess: ChildProcess | null;
  activeProxyUrl: string | null;
  // Map targetId -> child process for multiple concurrent sessions
  targetProcesses: Map<string, ChildProcess>;
}

// ─── Constants ──────────────────────────────────────────────────────────
export const appState: AppState = {
  activeChildProcess: null,
  activeProxyUrl: null,
  targetProcesses: new Map(),
};

export function setActiveChildProcess(process: ChildProcess | null): void {
  appState.activeChildProcess = process;
}

export function setActiveProxyUrl(url: string | null): void {
  appState.activeProxyUrl = url;
}

export function getActiveChildProcess(): ChildProcess | null {
  return appState.activeChildProcess;
}

export function getActiveProxyUrl(): string | null {
  return appState.activeProxyUrl;
}

export function clearActiveState(): void {
  appState.activeChildProcess = null;
  appState.activeProxyUrl = null;
}

// ─── Target Process Management ──────────────────────────────────────────

export function setTargetProcess(targetId: string, process: ChildProcess): void {
  // Kill old process for this target if exists
  const oldProcess = appState.targetProcesses.get(targetId);
  if (oldProcess && !oldProcess.killed) {
    console.log(`[State] Killing old process for target ${targetId}`);
    oldProcess.kill();
  }
  appState.targetProcesses.set(targetId, process);
}

export function getTargetProcess(targetId: string): ChildProcess | null {
  return appState.targetProcesses.get(targetId) || null;
}

export function removeTargetProcess(targetId: string): void {
  const process = appState.targetProcesses.get(targetId);
  if (process && !process.killed) {
    process.kill();
  }
  appState.targetProcesses.delete(targetId);
}

export function clearAllTargetProcesses(): void {
  appState.targetProcesses.forEach((process, targetId) => {
    if (!process.killed) {
      console.log(`[State] Killing process for target ${targetId}`);
      process.kill();
    }
  });
  appState.targetProcesses.clear();
}