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
}

// ─── Constants ──────────────────────────────────────────────────────────
export const appState: AppState = {
  activeChildProcess: null,
  activeProxyUrl: null,
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