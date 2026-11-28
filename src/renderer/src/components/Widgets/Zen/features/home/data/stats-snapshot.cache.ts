/**
 * localStorage snapshot cache cho dashboard (best-effort).
 * Storage keys được giữ nguyên để không mất cache cũ.
 */

import type { GlobalSnapshot, StatsPeriod, StatsSnapshot } from './dashboard.types';

const LS_SNAPSHOT_PREFIX = 'zen.home.statsSnapshot.';
const LS_SNAPSHOT_INDEX = 'zen.home.statsSnapshotIndex';
const LS_GLOBAL_KEY = 'zen.home.globalSnapshot';
const MAX_SNAPSHOTS = 24;

function snapshotKey(period: StatsPeriod, offset: number): string {
  return `${LS_SNAPSHOT_PREFIX}${period}.${period === 'all' ? 0 : offset}`;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Chấp nhận cả field legacy (todayTokens/todayRequests) và bỏ qua `accounts` cũ. */
function normalizeSnapshot(v: any): StatsSnapshot | null {
  if (!v || typeof v !== 'object') return null;
  const periodTokens = v.periodTokens ?? v.todayTokens;
  const periodRequests = v.periodRequests ?? v.todayRequests;
  if (
    !isNum(periodTokens) ||
    !isNum(periodRequests) ||
    typeof v.favoriteModel !== 'string' ||
    !Array.isArray(v.modelDistribution) ||
    !Array.isArray(v.dailyUsage)
  ) {
    return null;
  }
  return {
    periodTokens,
    periodRequests,
    favoriteModel: v.favoriteModel,
    modelDistribution: v.modelDistribution,
    dailyUsage: v.dailyUsage,
  };
}

function readIndex(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_SNAPSHOT_INDEX) || '[]');
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

export function readStatsSnapshot(period: StatsPeriod, offset: number): StatsSnapshot | null {
  try {
    const raw = localStorage.getItem(snapshotKey(period, offset));
    return raw ? normalizeSnapshot(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeStatsSnapshot(
  period: StatsPeriod,
  offset: number,
  snapshot: StatsSnapshot,
): void {
  try {
    const key = snapshotKey(period, offset);
    localStorage.setItem(key, JSON.stringify(snapshot));
    const next = [key, ...readIndex().filter((k) => k !== key)];
    next.slice(MAX_SNAPSHOTS).forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(LS_SNAPSHOT_INDEX, JSON.stringify(next.slice(0, MAX_SNAPSHOTS)));
  } catch {
    // Quota exceeded / storage unavailable — cache là best-effort
  }
}

export function readGlobalSnapshot(): GlobalSnapshot | null {
  try {
    const raw = localStorage.getItem(LS_GLOBAL_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || !isNum(v.totalAccounts) || !v.providerFavicons || typeof v.providerFavicons !== 'object') {
      return null;
    }
    return { totalAccounts: v.totalAccounts, providerFavicons: v.providerFavicons };
  } catch {
    return null;
  }
}

export function writeGlobalSnapshot(snapshot: GlobalSnapshot): void {
  try {
    localStorage.setItem(LS_GLOBAL_KEY, JSON.stringify(snapshot));
  } catch {
    // best-effort
  }
}
