/**
 * ------------------------------------------------------------------
 * useRunningTargets
 * ------------------------------------------------------------------
 * Hook lấy danh sách target đang chạy từ Emulate module. Lắng nghe
 * sự kiện status-change từ main process và cập nhật state theo thời
 * gian thực.
 *
 * Main features:
 * - Load danh sách target đang chạy ban đầu
 * - Lắng nghe target:status-changed để thêm/cập nhật/xóa target
 * - Trả về count để hiển thị badge số lượng
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────
interface RunningTarget {
  id: string;
  title: string;
  platform?: string;
  favicon?: string;
}

// ─── Hook ───────────────────────────────────────────────────────────────
/**
 * TODO: Refactor this hook to fetch data from Express Server API instead of IPC.
 * The old IPC channels ('target:list-running', 'target:status-changed') have been removed
 * as part of migrating Emulate functionality to the backend server.
 *
 * Expected new implementation:
 * - Use SWR or React Query to poll/fetch `/api/v1/targets/running`
 * - Subscribe to WebSocket events for real-time updates if available.
 */
export function useRunningTargets() {
  // ── State ──
  const [runningTargets, setRunningTargets] = useState<RunningTarget[]>([]);

  // ── Callbacks ──
  const loadRunningTargets = async () => {
    // Placeholder: Return empty array until Server integration is complete.
    // This prevents UI crashes while maintaining type safety.
    setRunningTargets([]);

    /* Future Implementation Example:
    try {
      const response = await fetch('http://localhost:3000/api/v1/targets/running');
      const data = await response.json();
      if (Array.isArray(data)) {
        setRunningTargets(data.map(t => ({ ...t })));
      }
    } catch (e) {
      console.error('[useRunningTargets] Server fetch failed:', e);
    }
    */
  };

  // ── Effects ──
  useEffect(() => {
    // No longer listening to IPC events since handlers are gone.
    // Will subscribe to WS/SSE in future refactor.

    loadRunningTargets();

    return () => {};
  }, []);

  return {
    runningTargets,
    count: runningTargets.length,
  };
}
