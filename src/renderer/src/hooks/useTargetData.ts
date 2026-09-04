/**
 * ------------------------------------------------------------------
 * useTargetData
 * ------------------------------------------------------------------
 * Hook quản lý dữ liệu target của Emulate module. Cung cấp các thao
 * tác load, lưu, tạo, xóa và tìm kiếm target với trạng thái loading
 * và error.
 *
 * Main features:
 * - Auto-load target khi mount (tuỳ chọn autoLoad)
 * - Hỗ trợ lọc theo platform hoặc searchQuery
 * - Cập nhật state sau mỗi thao tác save/delete
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useCallback, useRef } from 'react';

// ── Services ──
import { dataService } from '../modules/Emulate/services/emulate-api.service';

// ── Types ──
import { TargetTab } from '@renderer/modules/Emulate/types/target.types';

// ─── Types ──────────────────────────────────────────────────────────────
interface UseTargetDataOptions {
  autoLoad?: boolean;
  platform?: string;
  searchQuery?: string;
}

interface UseTargetDataReturn {
  targets: TargetTab[];
  loading: boolean;
  error: string | null;
  loadTargets: () => Promise<void>;
  saveTarget: (target: TargetTab) => Promise<TargetTab>;
  saveTargets: (targets: TargetTab[]) => Promise<TargetTab[]>;
  createTarget: (input: Omit<TargetTab, 'id'> & { id?: string }) => Promise<TargetTab>;
  deleteTarget: (id: string) => Promise<boolean>;
  deleteTargets: (ids: string[]) => Promise<number>;
  clearAll: () => Promise<number>;
  refresh: () => Promise<void>;
  search: (query: string) => Promise<TargetTab[]>;
}

// ─── Hook ───────────────────────────────────────────────────────────────
export function useTargetData(options: UseTargetDataOptions = {}): UseTargetDataReturn {
  const { autoLoad = true, platform, searchQuery } = options;

  // ── State ──
  const [targets, setTargets] = useState<TargetTab[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Refs ──
  const isMounted = useRef(true);

  // ── Effects ──
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Callbacks ──
  const loadTargets = useCallback(async () => {
    if (!isMounted.current) return;

    setLoading(true);
    setError(null);

    try {
      let data: TargetTab[];

      if (platform) {
        data = await dataService.getTargetsByPlatform(platform);
      } else if (searchQuery) {
        data = await dataService.searchTargets(searchQuery);
      } else {
        data = await dataService.getTargets();
      }

      if (isMounted.current) {
        setTargets(data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load targets');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [platform, searchQuery]);

  const saveTarget = useCallback(async (target: TargetTab): Promise<TargetTab> => {
    setLoading(true);
    setError(null);

    try {
      const saved = await dataService.saveTarget(target);

      setTargets((prev) => {
        const index = prev.findIndex((t) => t.id === saved.id);
        if (index >= 0) {
          const newTargets = [...prev];
          newTargets[index] = saved;
          return newTargets;
        }
        return [...prev, saved];
      });

      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save target');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTargets = useCallback(async (newTargets: TargetTab[]): Promise<TargetTab[]> => {
    setLoading(true);
    setError(null);

    try {
      const saved = await dataService.saveTargets(newTargets);
      setTargets(saved);
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save targets');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTarget = useCallback(
    async (input: Omit<TargetTab, 'id'> & { id?: string }): Promise<TargetTab> => {
      setLoading(true);
      setError(null);

      try {
        const created = await dataService.createTarget(input);
        setTargets((prev) => [...prev, created]);
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create target');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const deleteTarget = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await dataService.deleteTarget(id);
      if (result) {
        setTargets((prev) => prev.filter((t) => t.id !== id));
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete target');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTargets = useCallback(async (ids: string[]): Promise<number> => {
    setLoading(true);
    setError(null);

    try {
      const result = await dataService.deleteTargets(ids);
      if (result > 0) {
        setTargets((prev) => prev.filter((t) => !ids.includes(t.id)));
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete targets');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAll = useCallback(async (): Promise<number> => {
    setLoading(true);
    setError(null);

    try {
      const result = await dataService.clearAllTargets();
      setTargets([]);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear all targets');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadTargets();
  }, [loadTargets]);

  const search = useCallback(async (query: string): Promise<TargetTab[]> => {
    setLoading(true);
    setError(null);

    try {
      const results = await dataService.searchTargets(query);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search targets');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Effects ──
  useEffect(() => {
    if (autoLoad) {
      loadTargets();
    }
  }, [autoLoad, loadTargets]);

  return {
    targets,
    loading,
    error,
    loadTargets,
    saveTarget,
    saveTargets,
    createTarget,
    deleteTarget,
    deleteTargets,
    clearAll,
    refresh,
    search,
  };
}

export default useTargetData;