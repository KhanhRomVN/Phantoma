import { useState, useEffect, useCallback } from 'react';
import { UserApp, AppPlatform } from '../../../types/apps';
import useLocalStorage from './useLocalStorage';

export interface TargetTab {
  id: string;
  title: string;
  favicon?: string;
  url?: string;
}

const TABS_STORAGE_KEY = 'phantoma-emulate-tabs';
const ACTIVE_TAB_STORAGE_KEY = 'phantoma-emulate-active-tab';

export function useTargetManager() {
  const [targetTabs, setTargetTabs] = useLocalStorage<TargetTab[]>(TABS_STORAGE_KEY, []);
  const [activeTargetId, setActiveTargetId] = useLocalStorage<string | null>(ACTIVE_TAB_STORAGE_KEY, null);
  const [apps, setApps] = useState<UserApp[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadApps = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.api.invoke('apps:get-all');
      setApps(result || []);
    } catch (e) {
      console.error('Failed to load apps:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addTarget = useCallback(async (appData: any) => {
    try {
      const newApp = await window.api.invoke('apps:add', appData);
      await loadApps();
      return newApp;
    } catch (e) {
      console.error('Failed to add target:', e);
      throw e;
    }
  }, [loadApps]);

  const updateTarget = useCallback(async (id: string, data: { name: string; url?: string; executablePath?: string }) => {
    try {
      await window.api.invoke('apps:update', id, data);
      await loadApps();
    } catch (e) {
      console.error('Failed to update target:', e);
      throw e;
    }
  }, [loadApps]);

  const deleteTarget = useCallback(async (id: string) => {
    try {
      await window.api.invoke('apps:delete', id);
      await loadApps();
    } catch (e) {
      console.error('Failed to delete target:', e);
      throw e;
    }
  }, [loadApps]);

  const addTab = useCallback((tab: TargetTab) => {
    setTargetTabs((prev) => [...prev, tab]);
    setActiveTargetId(tab.id);
  }, [setTargetTabs, setActiveTargetId]);

  const removeTab = useCallback((id: string) => {
    setTargetTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.id !== id);
      if (activeTargetId === id) {
        setActiveTargetId(newTabs.length > 0 ? newTabs[0].id : null);
      }
      return newTabs;
    });
  }, [setTargetTabs, activeTargetId, setActiveTargetId]);

  const updateTab = useCallback((id: string, updates: Partial<TargetTab>) => {
    setTargetTabs((prev) => prev.map((tab) => tab.id === id ? { ...tab, ...updates } : tab));
  }, [setTargetTabs]);

  const getAppsByPlatform = useCallback((platform: AppPlatform) => {
    return apps.filter((app) => app.platform === platform);
  }, [apps]);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  return {
    apps,
    isLoading,
    targetTabs,
    activeTargetId,
    setActiveTargetId,
    addTarget,
    updateTarget,
    deleteTarget,
    addTab,
    removeTab,
    updateTab,
    getAppsByPlatform,
    loadApps,
  };
}

export default useTargetManager;