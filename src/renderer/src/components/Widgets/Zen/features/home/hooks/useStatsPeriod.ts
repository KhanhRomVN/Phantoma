/**
 * ------------------------------------------------------------------
 * useStatsPeriod
 * ------------------------------------------------------------------
 * Quản lý period & offset cho stats dashboard.
 * Lưu vào extension storage để persist, mirror vào localStorage để đọc
 * ĐỒNG BỘ ở frame đầu tiên (tránh nháy từ "day" sang kỳ đã chọn).
 *
 * period: 'day' | 'week' | 'month' | 'year' | 'all'
 * offset: số nguyên >= 0 (0 = hiện tại, 1 = kỳ trước, ...)
 * ------------------------------------------------------------------
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  extensionService,
  messageDispatcher,
} from '@renderer/components/Widgets/Zen/shared/services/ExtensionService';
import type { StatsPeriod, StatsPeriodState } from '../data/dashboard.types';

export type { StatsPeriod, StatsPeriodState };

const STORAGE_KEY = 'home-stats-period';
const LS_PERIOD_KEY = 'zen.home.statsPeriod';
const DEFAULT_STATE: StatsPeriodState = { period: 'day', offset: 0 };
const VALID_PERIODS: StatsPeriod[] = ['day', 'week', 'month', 'year', 'all'];

function isValidState(v: any): v is StatsPeriodState {
  return !!v && VALID_PERIODS.includes(v.period) && Number.isInteger(v.offset) && v.offset >= 0;
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

export function useStatsPeriod() {
  const [state, setState] = useState<StatsPeriodState>(readCachedPeriodState);
  const [hydrated, setHydrated] = useState(false);
  const touchedRef = useRef(false);

  // Hydrate từ extension storage; chỉ cho phép save sau khi hydrate xong
  useEffect(() => {
    let active = true;
    const requestId = `getStatsPeriod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const done = () => active && setHydrated(true);

    messageDispatcher.register(
      requestId,
      (msg: any) => {
        if (!active) return;
        if (!msg.error && msg.data?.value && !touchedRef.current) {
          try {
            const parsed = JSON.parse(msg.data.value);
            if (isValidState(parsed)) setState(parsed);
          } catch {
            // malformed stored value
          }
        }
        done();
      },
      3000,
      done,
    );
    extensionService.postMessage({ command: 'storageGet', requestId, key: STORAGE_KEY });
    return () => {
      active = false;
    };
  }, []);

  // Save sang cả hai storage khi state đổi (sau hydrate)
  useEffect(() => {
    if (!hydrated) return;
    const dataStr = JSON.stringify(state);
    try {
      localStorage.setItem(LS_PERIOD_KEY, dataStr);
    } catch {
      // best-effort
    }
    extensionService.postMessage({
      command: 'storageSet',
      requestId: `setStatsPeriod-${Date.now()}`,
      key: STORAGE_KEY,
      value: dataStr,
    });
  }, [state, hydrated]);

  const setPeriod = useCallback((period: StatsPeriod) => {
    touchedRef.current = true;
    setState({ period, offset: 0 });
  }, []);

  const setOffset = useCallback((offset: number) => {
    touchedRef.current = true;
    setState((prev) => ({ ...prev, offset: Math.max(0, Math.floor(offset) || 0) }));
  }, []);

  return { period: state.period, offset: state.offset, setPeriod, setOffset };
}
