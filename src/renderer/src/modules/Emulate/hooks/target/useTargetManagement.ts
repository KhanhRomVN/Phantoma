import { useState, useCallback, useEffect } from 'react';
import { TargetTab, TargetState } from '../../types/target.types';
import { DEFAULT_TARGET_TAB, DEFAULT_TARGET_STATE } from '../../constants/defaults';
import { useTimerStore } from '../../../../stores/timerStore';

interface UseTargetManagementOptions {
  initialTabs?: TargetTab[];
  initialActiveId?: string | null;
  onTabChange?: (tabs: TargetTab[], activeId: string | null) => void;
  onTargetStart?: (targetId: string, mode: 'mitm' | 'cdp') => void;
  onTargetStop?: (targetId: string) => void;
}

export function useTargetManagement(options: UseTargetManagementOptions = {}) {
  const {
    initialTabs = [{ ...DEFAULT_TARGET_TAB }],
    initialActiveId = null,
    onTabChange,
    onTargetStart,
    onTargetStop,
  } = options;

  const [targetTabs, setTargetTabs] = useState<TargetTab[]>(initialTabs);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(initialActiveId);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) { setIsInitialized(true); return; }
    const hasRealTabs = initialTabs.some(tab => tab.id !== 'default');
    const currentHasRealTabs = targetTabs.some(tab => tab.id !== 'default');
    const shouldSyncTabs = hasRealTabs && !currentHasRealTabs;
    const shouldSyncActive = initialActiveId !== activeTargetId && initialActiveId !== null && hasRealTabs;
    if (shouldSyncTabs) setTargetTabs(initialTabs);
    if (shouldSyncActive) { setActiveTargetId(initialActiveId); onTabChange?.(initialTabs, initialActiveId); }
    else if (shouldSyncTabs && initialActiveId) {
      const firstRealTab = initialTabs.find(tab => tab.id !== 'default');
      if (firstRealTab) { setActiveTargetId(firstRealTab.id); onTabChange?.(initialTabs, firstRealTab.id); }
    }
  }, [initialTabs, initialActiveId, targetTabs, activeTargetId, isInitialized, onTabChange]);

  const [targetStates, setTargetStates] = useState<Record<string, TargetState>>({});
  const { setTimers } = useTimerStore();

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimers: Record<string, string> = {};
      Object.entries(targetStates).forEach(([id, state]) => {
        if (state.isActive && state.startTime) {
          const diff = Date.now() - state.startTime;
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          newTimers[id] = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
      });
      setTimers(newTimers);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetStates, setTimers]);

  const addTargetTab = useCallback((tab: TargetTab) => {
    setTargetTabs((prev) => {
      if (prev.some((t) => t.id === tab.id)) return prev;
      const newTabs = [...prev, tab];
      onTabChange?.(newTabs, activeTargetId);
      return newTabs;
    });
  }, [activeTargetId, onTabChange]);

  const removeTargetTab = useCallback((id: string) => {
    setTargetTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== id);
      if (activeTargetId === id) setActiveTargetId(newTabs.length > 0 ? newTabs[0].id : null);
      onTabChange?.(newTabs, activeTargetId === id ? newTabs[0]?.id || null : activeTargetId);
      return newTabs;
    });
    setTargetStates((prev) => { const { [id]: _, ...rest } = prev; return rest; });
  }, [activeTargetId, onTabChange]);

  const setActiveTarget = useCallback((id: string | null, title?: string) => {
    setActiveTargetId(id);
    if (id && !targetTabs.some((t) => t.id === id)) {
      const tab = { id, title: title || id, favicon: undefined, url: undefined };
      setTargetTabs((prev) => { const newTabs = [...prev, tab]; onTabChange?.(newTabs, id); return newTabs; });
    } else { onTabChange?.(targetTabs, id); }
  }, [targetTabs, onTabChange]);

  const startTarget = useCallback((targetId: string, mode: 'mitm' | 'cdp') => {
    setTargetStates((prev) => ({ ...prev, [targetId]: { isActive: true, mode, isIntercepting: false, startTime: Date.now() } }));
    onTargetStart?.(targetId, mode);
  }, [onTargetStart]);

  const stopTarget = useCallback((targetId: string) => {
    setTargetStates((prev) => ({ ...prev, [targetId]: { isActive: false, mode: undefined as any, isIntercepting: false } }));
    onTargetStop?.(targetId);
  }, [onTargetStop]);

  const toggleIntercept = useCallback((targetId: string) => {
    setTargetStates((prev) => ({ ...prev, [targetId]: { ...prev[targetId], isIntercepting: !prev[targetId]?.isIntercepting } }));
  }, []);

  const getTargetState = useCallback((targetId: string): TargetState => targetStates[targetId] || DEFAULT_TARGET_STATE, [targetStates]);
  const isTargetActive = useCallback((targetId: string): boolean => targetStates[targetId]?.isActive || false, [targetStates]);
  const getActiveTargets = useCallback(() => targetTabs.filter((tab) => tab.id !== 'default'), [targetTabs]);

  return { targetTabs, activeTargetId, targetStates, addTargetTab, removeTargetTab, setActiveTarget, startTarget, stopTarget, toggleIntercept, getTargetState, isTargetActive, getActiveTargets };
}

export default useTargetManagement;