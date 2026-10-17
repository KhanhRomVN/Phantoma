/**
 * ------------------------------------------------------------------
 * useStatsPeriod
 * ------------------------------------------------------------------
 * Hook quản lý period & offset cho stats dashboard.
 * Lưu lựa chọn vào extension storage để persist qua các lần mở, đồng
 * thời mirror vào localStorage để đọc ĐỒNG BỘ ở frame đầu tiên (tránh
 * nháy từ "day" sang kỳ đã chọn).
 *
 * period: 'day' | 'week' | 'month' | 'year' | 'all'
 * offset: số nguyên >= 0 (0 = hiện tại, 1 = kỳ trước, ...)
 * ------------------------------------------------------------------
 */

import { useState, useEffect, useRef } from 'react';
import {
  extensionService,
  messageDispatcher,
} from '@renderer/components/RightPanel/Agent/services/ExtensionService';

export type StatsPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export interface StatsPeriodState {
  period: StatsPeriod;
  offset: number;
}

/** Dữ liệu phụ thuộc period/offset — cache theo từng kỳ. */
export interface StatsSnapshot {
  todayTokens: number;
  todayRequests: number;
  favoriteModel: string;
  modelDistribution: any[];
  accounts: any[];
  dailyUsage: any[];
}

/** Dữ liệu không phụ thuộc period — cache 1 bản duy nhất. */
export interface GlobalSnapshot {
  totalAccounts: number;
  providerFavicons: Record<string, string>;
}

const STORAGE_KEY = 'home-stats-period';
const DEFAULT_STATE: StatsPeriodState = { period: 'day', offset: 0 };

const LS_PERIOD_KEY = 'zen.home.statsPeriod';
const LS_SNAPSHOT_PREFIX = 'zen.home.statsSnapshot.';
const LS_SNAPSHOT_INDEX = 'zen.home.statsSnapshotIndex';
const LS_GLOBAL_KEY = 'zen.home.globalSnapshot';
const MAX_SNAPSHOTS = 24;

const VALID_PERIODS: StatsPeriod[] = ['day', 'week', 'month', 'year', 'all'];

function isValidState(v: any): v is StatsPeriodState {
  return (
    !!v &&
    VALID_PERIODS.includes(v.period) &&
    typeof v.offset === 'number' &&
    v.offset >= 0
  );
}

function snapshotKey(period: StatsPeriod, offset: number): string {
  return `${LS_SNAPSHOT_PREFIX}${period}.${period === 'all' ? 0 : offset}`;
}

/** Đọc đồng bộ period/offset đã lưu — dùng làm initial state của useState. */
export function readCachedPeriodState(): StatsPeriodState {
  try {
    const raw = localStorage.getItem(LS_PERIOD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidState(parsed)) return parsed;
    }
  } catch {
    // Ignore malformed value / storage unavailable
  }
  return DEFAULT_STATE;
}

export function readStatsSnapshot(
  period: StatsPeriod,
  offset: number,
): StatsSnapshot | null {
  try {
    const raw = localStorage.getItem(snapshotKey(period, offset));
    return raw ? (JSON.parse(raw) as StatsSnapshot) : null;
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
    const index: string[] = JSON.parse(
      localStorage.getItem(LS_SNAPSHOT_INDEX) || '[]',
    );
    const next = [key, ...index.filter((k) => k !== key)];
    next.slice(MAX_SNAPSHOTS).forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(
      LS_SNAPSHOT_INDEX,
      JSON.stringify(next.slice(0, MAX_SNAPSHOTS)),
    );
  } catch {
    // Quota exceeded / storage unavailable — cache là best-effort
  }
}

export function readGlobalSnapshot(): GlobalSnapshot | null {
  try {
    const raw = localStorage.getItem(LS_GLOBAL_KEY);
    return raw ? (JSON.parse(raw) as GlobalSnapshot) : null;
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

export function useStatsPeriod() {
  const [state, setState] = useState<StatsPeriodState>(readCachedPeriodState);
  const loadedRef = useRef(false);

  // Load from extension storage on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const requestId = `getStatsPeriod-${Date.now()}`;
    messageDispatcher.register(
      requestId,
      (msg: any) => {
        if (msg.error) return;
        if (msg.data?.value) {
          try {
            const parsed = JSON.parse(msg.data.value) as StatsPeriodState;
            if (isValidState(parsed)) {
              setState(parsed);
              localStorage.setItem(LS_PERIOD_KEY, msg.data.value);
            }
          } catch {}
        }
      },
      3000,
      () => {},
    );
    extensionService.postMessage({
      command: 'storageGet',
      requestId,
      key: STORAGE_KEY,
    });
  }, []);

  // Save to both storages when state changes
  useEffect(() => {
    if (!loadedRef.current) return;
    const dataStr = JSON.stringify(state);
    try {
      localStorage.setItem(LS_PERIOD_KEY, dataStr);
    } catch {}

    const requestId = `setStatsPeriod-${Date.now()}`;
    extensionService.postMessage({
      command: 'storageSet',
      requestId,
      key: STORAGE_KEY,
      value: dataStr,
    });
  }, [state]);

  const setPeriod = (period: StatsPeriod) => {
    setState({ period, offset: 0 });
  };

  const setOffset = (offset: number) => {
    setState((prev) => ({ ...prev, offset: Math.max(0, offset) }));
  };

  return {
    period: state.period,
    offset: state.offset,
    setPeriod,
    setOffset,
  };
}