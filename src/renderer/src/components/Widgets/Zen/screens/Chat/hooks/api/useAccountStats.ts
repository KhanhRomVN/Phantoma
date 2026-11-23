/**
 * ------------------------------------------------------------------
 * useAccountStats
 * ------------------------------------------------------------------
 * Hook fetch live stats cho một account theo ID từ backend Phantoma.
 * Merge kết quả vào currentAccount qua onStats callback.
 *
 * Chỉ fetch khi accountId thay đổi. Nếu backend chưa có endpoint,
 * hook silent fail — caller vẫn dùng data cũ từ props.
 * ------------------------------------------------------------------
 */

import { useEffect, useRef } from 'react';

interface UseAccountStatsOptions {
  accountId: string | null | undefined;
  onStats: (account: any) => void;
  refreshInterval?: number;
}

export const useAccountStats = ({
  accountId,
  onStats,
  refreshInterval,
}: UseAccountStatsOptions): void => {
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  useEffect(() => {
    if (!accountId) return;

    let cancelled = false;

    const fetchStats = async () => {
      try {
        const api = (window as any).api?.account;
        if (!api?.getStats) return;
        const res = await api.getStats(accountId);
        if (cancelled) return;
        if (res?.success && res?.data) {
          onStatsRef.current(res.data);
        }
      } catch {
        // Silent — caller dùng data cũ từ props.
      }
    };

    fetchStats();

    if (refreshInterval && refreshInterval > 0) {
      const timer = setInterval(fetchStats, refreshInterval);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [accountId, refreshInterval]);
};