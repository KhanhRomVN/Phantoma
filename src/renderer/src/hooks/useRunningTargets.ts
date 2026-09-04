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

// ── Types ──
import { TargetTab } from '@renderer/modules/Emulate/types/target.types';

// ─── Types ──────────────────────────────────────────────────────────────
interface RunningTarget {
  id: string;
  title: string;
  platform?: string;
  favicon?: string;
}

// ─── Hook ───────────────────────────────────────────────────────────────
export function useRunningTargets() {
  // ── State ──
  const [runningTargets, setRunningTargets] = useState<RunningTarget[]>([]);

  // ── Callbacks ──
  const loadRunningTargets = async () => {
    try {
      const result = await window.api.invoke('target:list-running');
      if (result?.success && Array.isArray(result.targets)) {
        setRunningTargets(
          result.targets.map((t: TargetTab) => ({
            id: t.id,
            title: t.title,
            platform: t.platform,
            favicon: t.favicon,
          })),
        );
      }
    } catch (error) {
      console.error('[useRunningTargets] Failed to load running targets:', error);
    }
  };

  // ── Effects ──
  useEffect(() => {
    const unsubscribe = window.api.on('target:status-changed', (_, data) => {
      const { targetId, status, target } = data as {
        targetId: string;
        status: 'running' | 'stopped';
        target?: TargetTab;
      };

      setRunningTargets((prev) => {
        if (status === 'running' && target) {
          const exists = prev.find((t) => t.id === targetId);
          const mapped = {
            id: target.id,
            title: target.title,
            platform: target.platform,
            favicon: target.favicon,
          };
          if (exists) {
            return prev.map((t) => (t.id === targetId ? mapped : t));
          }
          return [...prev, mapped];
        } else if (status === 'stopped') {
          return prev.filter((t) => t.id !== targetId);
        }
        return prev;
      });
    });

    loadRunningTargets();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return {
    runningTargets,
    count: runningTargets.length,
  };
}