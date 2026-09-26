/**
 * ------------------------------------------------------------------
 * Trạng thái ứng dụng
 * ------------------------------------------------------------------
 * Trạng thái có th��� thay đổi dùng chung cho tiến trình chính. Theo dõi
 * tiến trình con đang hoạt động và URL proxy để dọn dẹp.
 *
 * Hàm chính:
 * - clearActiveState()      : Đặt lại tất cả trạng thái hoạt động
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Node.js ──
import { ChildProcess } from 'child_process';

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface CaptureInstance {
  type: 'ebpf' | 'pcap' | 'app-debug' | 'frida' | 'cdp';
  instance: any; // EbpfCapture | PacketCapture | AppDebugLauncher | FridaHandler | CdpProxy
  pid?: number;
  targetId: string;
}

export interface AppState {
  activeChildProcess: ChildProcess | null;
  activeProxyUrl: string | null;
  // Map targetId -> child process for multiple concurrent sessions
  targetProcesses: Map<string, ChildProcess>;
  // Map targetId -> capture instance for CLI capture methods
  activeCaptures: Map<string, CaptureInstance>;
}

// ─── Constants ──────────────────────────────────────────────────────────
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

// ─── Target Process Management ──────────────────────────────────────────

export function setTargetProcess(targetId: string, process: ChildProcess): void {
  // Kill old process for this target if exists
  const oldProcess = appState.targetProcesses.get(targetId);
  if (oldProcess && !oldProcess.killed) {
    oldProcess.kill();
  }
  appState.targetProcesses.set(targetId, process);
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
      process.kill();
    }
  });
  appState.targetProcesses.clear();
}

// ─── Capture Instance Management ────────────────────────────────────────

export function setCaptureInstance(targetId: string, capture: CaptureInstance): void {
  // Stop old capture for this target if exists
  const oldCapture = appState.activeCaptures.get(targetId);
  if (oldCapture && oldCapture.instance?.stop) {
    oldCapture.instance.stop();
  }
  appState.activeCaptures.set(targetId, capture);
}

export function removeCaptureInstance(targetId: string): void {
  const capture = appState.activeCaptures.get(targetId);
  if (capture && capture.instance?.stop) {
    capture.instance.stop();
  }
  appState.activeCaptures.delete(targetId);
}

export function clearAllCaptureInstances(): void {
  appState.activeCaptures.forEach((capture) => {
    if (capture.instance?.stop) {
      capture.instance.stop();
    }
  });
  appState.activeCaptures.clear();
}
