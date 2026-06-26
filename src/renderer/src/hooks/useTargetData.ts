import { useState, useEffect, useCallback, useRef } from 'react';
import { dataService } from '../services/DataService';
import { TargetTab } from '../../features/Emulate/types/target.types';

import { TargetStatus } from '../database/repositories/TargetRepository';

interface UseTargetDataOptions {
  autoLoad?: boolean;
  platform?: string;
  searchQuery?: string;
  status?: TargetStatus;
}

interface UseTargetDataReturn {
  targets: TargetTab[];
  loading: boolean;
  error: string | null;
  loadTargets: () => Promise<void>;
  loadByStatus: (status: TargetStatus) => Promise<void>;
  saveTarget: (target: TargetTab) => Promise<TargetTab>;
  saveTargets: (targets: TargetTab[]) => Promise<TargetTab[]>;
  createTarget: (input: Omit<TargetTab, 'id'> & { id?: string }) => Promise<TargetTab>;
  deleteTarget: (id: string) => Promise<boolean>;
  deleteTargets: (ids: string[]) => Promise<number>;
  updateStatus: (id: string, status: TargetStatus) => Promise<TargetTab | null>;
  clearAll: () => Promise<number>;
  refresh: () => Promise<void>;
  search: (query: string) => Promise<TargetTab[]>;
}

/**
 * Hook for managing target data with React state
 * 
 * Usage:
 * const { targets, loading, saveTarget, deleteTarget } = useTargetData();
 * 
 * // Auto-load on mount
 * const { targets, loading } = useTargetData({ autoLoad: true });
 * 
 * // Load by platform
 * const { targets } = useTargetData({ platform: 'web' });
 */
export function useTargetData(options: UseTargetDataOptions = {}): UseTargetDataReturn {
  const { autoLoad = true, platform, searchQuery, status } = options;

  const [targets, setTargets] = useState<TargetTab[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadTargets = useCallback(async () => {
    if (!isMounted.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let data: TargetTab[];
      
      if (status) {
        data = await dataService.getTargetsByStatus(status);
      } else if (platform) {
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
  }, [platform, searchQuery, status]);

  const loadByStatus = useCallback(async (newStatus: TargetStatus) => {
    if (!isMounted.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await dataService.getTargetsByStatus(newStatus);
      if (isMounted.current) {
        setTargets(data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load targets by status');
      }
      throw err;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  const saveTarget = useCallback(async (target: TargetTab): Promise<TargetTab> => {
    setLoading(true);
    setError(null);
    
    try {
      const saved = await dataService.saveTarget(target);
      
      setTargets(prev => {
        const index = prev.findIndex(t => t.id === saved.id);
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

  const createTarget = useCallback(async (input: Omit<TargetTab, 'id'> & { id?: string }): Promise<TargetTab> => {
    setLoading(true);
    setError(null);
    
    try {
      const created = await dataService.createTarget(input);
      setTargets(prev => [...prev, created]);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create target');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTarget = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await dataService.deleteTarget(id);
      if (result) {
        setTargets(prev => prev.filter(t => t.id !== id));
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
        setTargets(prev => prev.filter(t => !ids.includes(t.id)));
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete targets');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, newStatus: TargetStatus): Promise<TargetTab | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const updated = await dataService.updateTargetStatus(id, newStatus);
      if (updated) {
        setTargets(prev => prev.map(t => t.id === id ? updated : t));
      }
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update target status');
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

  // Auto-load on mount
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
    loadByStatus,
    saveTarget,
    saveTargets,
    createTarget,
    deleteTarget,
    deleteTargets,
    updateStatus,
    clearAll,
    refresh,
    search,
  };
}

export default useTargetData;