import { ChildProcess } from 'child_process';

export interface AppState {
  activeChildProcess: ChildProcess | null;
  activeProxyUrl: string | null;
}

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