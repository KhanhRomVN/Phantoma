import { useState, useEffect, useCallback } from 'react';
import { UserApp } from '../types/apps';

interface UseAppsOptions {
  autoFetch?: boolean;
  onError?: (error: Error) => void;
}

export function useApps(options: UseAppsOptions = {}) {
  const { autoFetch = true, onError } = options;

  const [apps, setApps] = useState<UserApp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchApps = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.invoke('apps:get-all');
      if (result) {
        setApps(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  const addApp = useCallback(
    async (appData: Omit<UserApp, 'id'>) => {
      try {
        const result = await window.api.invoke('apps:add', appData);
        await fetchApps();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        throw error;
      }
    },
    [fetchApps, onError],
  );

  const updateApp = useCallback(
    async (id: string, data: Partial<UserApp>) => {
      try {
        const result = await window.api.invoke('apps:update', id, data);
        await fetchApps();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        throw error;
      }
    },
    [fetchApps, onError],
  );

  const deleteApp = useCallback(
    async (id: string) => {
      try {
        const result = await window.api.invoke('apps:delete', id);
        await fetchApps();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        throw error;
      }
    },
    [fetchApps, onError],
  );

  const getAppById = useCallback(
    (id: string): UserApp | undefined => {
      return apps.find((app) => app.id === id);
    },
    [apps],
  );

  const getAppsByPlatform = useCallback(
    (platform: string): UserApp[] => {
      return apps.filter((app) => app.platform === platform);
    },
    [apps],
  );

  useEffect(() => {
    if (autoFetch) {
      fetchApps();
    }
  }, [autoFetch, fetchApps]);

  return {
    apps,
    isLoading,
    error,
    fetchApps,
    addApp,
    updateApp,
    deleteApp,
    getAppById,
    getAppsByPlatform,
  };
}

export default useApps;