import { type FileNode } from '../../../shared/stores/code.store';
import { GitFileStatus } from '../types/file-explorer.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

export const lazyNodeRegistry = new Map<string, FileNode>();

export const gitStatusCache = new Map<string, Record<string, GitFileStatus>>();

export const ignoredPathsCache = new Map<string, string[]>();

export const scanListeners = new Set<() => void>();

let activeScans = 0;

const emitScan = () => scanListeners.forEach((l) => l());

export const isScanning = (): boolean => activeScans > 0;

export const beginScan = () => {
  activeScans++;
  emitScan();
};

export const endScan = () => {
  activeScans--;
  emitScan();
};

export const refreshInFlight = new Map<string, Promise<void>>();

export const remoteDiffCache = new Map<string, Set<string>>();

export const remoteHashByRoot = new Map<string, string>();
