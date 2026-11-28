/**
 * ------------------------------------------------------------------
 * useDashboardData
 * ------------------------------------------------------------------
 * Load stats / account count / provider favicons cho dashboard.
 * - Mỗi nguồn dữ liệu có error handling độc lập.
 * - AbortController chống response cũ khi apiUrl/period/offset đổi.
 * - Hydrate từ snapshot cache; không hiển thị số liệu kỳ cũ cho kỳ mới.
 * ------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from 'react';
import { useStatsPeriod } from './useStatsPeriod';
import { fetchAccountCount, fetchProviderFavicons, fetchUsageStats } from '../data/dashboard.api';
import {
  readGlobalSnapshot,
  readStatsSnapshot,
  writeGlobalSnapshot,
  writeStatsSnapshot,
} from '../data/stats-snapshot.cache';
import type { StatsSnapshot } from '../data/dashboard.types';

const EMPTY_STATS: StatsSnapshot = {
  periodTokens: 0,
  periodRequests: 0,
  favoriteModel: '—',
  modelDistribution: [],
  dailyUsage: [],
};

export function useDashboardData(apiUrl: string) {
  const { period, offset } = useStatsPeriod();
  const periodKey = `${period}:${period === 'all' ? 0 : offset}`;

  const [initialGlobal] = useState(readGlobalSnapshot);
  const [fetched, setFetched] = useState<{ key: string; snap: StatsSnapshot } | null>(null);
  const [totalAccounts, setTotalAccounts] = useState(initialGlobal?.totalAccounts ?? 0);
  const [providerFavicons, setProviderFavicons] = useState<Record<string, string>>(
    initialGlobal?.providerFavicons ?? {},
  );
  const [accountsLoaded, setAccountsLoaded] = useState(false);

  // Stats theo period: ưu tiên dữ liệu vừa fetch đúng kỳ → snapshot → rỗng
  const stats = useMemo<StatsSnapshot>(() => {
    if (fetched?.key === periodKey) return fetched.snap;
    return readStatsSnapshot(period, offset) ?? EMPTY_STATS;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetched, periodKey]);

  // Fetch stats
  useEffect(() => {
    const ctrl = new AbortController();
    fetchUsageStats(apiUrl, period, offset, ctrl.signal)
      .then((snap) => {
        if (ctrl.signal.aborted || !snap) return;
        setFetched({ key: periodKey, snap });
        writeStatsSnapshot(period, offset, snap);
      })
      .catch(() => {
        /* aborted */
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, periodKey]);

  // Fetch accounts + providers (không phụ thuộc period)
  useEffect(() => {
    const ctrl = new AbortController();
    fetchAccountCount(apiUrl, ctrl.signal)
      .then((count) => {
        if (ctrl.signal.aborted) return;
        if (count !== null) {
          setTotalAccounts(count);
          setAccountsLoaded(true);
        }
      })
      .catch(() => {});
    fetchProviderFavicons(apiUrl, ctrl.signal)
      .then((favicons) => {
        if (!ctrl.signal.aborted && favicons) setProviderFavicons(favicons);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [apiUrl]);

  // Cache global data — không phụ thuộc việc có favicon hay không
  useEffect(() => {
    if (!accountsLoaded) return;
    writeGlobalSnapshot({ totalAccounts, providerFavicons });
  }, [accountsLoaded, totalAccounts, providerFavicons]);

  return { period, stats, totalAccounts, providerFavicons, accountsLoaded };
}
