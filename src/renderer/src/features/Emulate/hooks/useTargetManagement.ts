import { useState, useCallback, useEffect } from 'react';
import { TargetTab, TargetState } from '../types/target.types';
import { DEFAULT_TARGET_TAB, DEFAULT_TARGET_STATE } from '../constants/defaults';

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
  const [targetStates, setTargetStates] = useState<Record<string, TargetState>>({});
  const [timerDisplay, setTimerDisplay] = useState<Record<string, string>>({});

  // Update timers every second for running targets
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
      setTimerDisplay(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetStates]);

  const addTargetTab = useCallback(
    (tab: TargetTab) => {
      setTargetTabs((prev) => {
        const exists = prev.some((t) => t.id === tab.id);
        if (exists) return prev;
        const newTabs = [...prev, tab];
        onTabChange?.(newTabs, activeTargetId);
        return newTabs;
      });
    },
    [activeTargetId, onTabChange],
  );

  const removeTargetTab = useCallback(
    (id: string) => {
      setTargetTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== id);
        if (activeTargetId === id) {
          setActiveTargetId(newTabs.length > 0 ? newTabs[0].id : null);
        }
        onTabChange?.(newTabs, activeTargetId === id ? newTabs[0]?.id || null : activeTargetId);
        return newTabs;
      });
      setTargetStates((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    },
    [activeTargetId, onTabChange],
  );

  const setActiveTarget = useCallback(
    (id: string | null) => {
      setActiveTargetId(id);
      if (id && !targetTabs.some((t) => t.id === id)) {
        // If target doesn't exist, add it
        const tab = { id, title: id, favicon: undefined, url: undefined };
        setTargetTabs((prev) => {
          const newTabs = [...prev, tab];
          onTabChange?.(newTabs, id);
          return newTabs;
        });
      } else {
        onTabChange?.(targetTabs, id);
      }
    },
    [targetTabs, onTabChange],
  );

  const startTarget = useCallback(
    (targetId: string, mode: 'mitm' | 'cdp') => {
      setTargetStates((prev) => ({
        ...prev,
        [targetId]: {
          isActive: true,
          mode,
          isIntercepting: false,
          startTime: Date.now(),
        },
      }));
      onTargetStart?.(targetId, mode);
    },
    [onTargetStart],
  );

  const stopTarget = useCallback(
    (targetId: string) => {
      setTargetStates((prev) => ({
        ...prev,
        [targetId]: {
          isActive: false,
          mode: null,
          isIntercepting: false,
        },
      }));
      onTargetStop?.(targetId);
    },
    [onTargetStop],
  );

  const toggleIntercept = useCallback((targetId: string) => {
    setTargetStates((prev) => ({
      ...prev,
      [targetId]: {
        ...prev[targetId],
        isIntercepting: !prev[targetId]?.isIntercepting,
      },
    }));
  }, []);

  const getTargetState = useCallback(
    (targetId: string): TargetState => {
      return targetStates[targetId] || DEFAULT_TARGET_STATE;
    },
    [targetStates],
  );

  const isTargetActive = useCallback(
    (targetId: string): boolean => {
      return targetStates[targetId]?.isActive || false;
    },
    [targetStates],
  );

  const getActiveTargets = useCallback(() => {
    return targetTabs.filter((tab) => tab.id !== 'default');
  }, [targetTabs]);

  return {
    targetTabs,
    activeTargetId,
    targetStates,
    timerDisplay,
    addTargetTab,
    removeTargetTab,
    setActiveTarget,
    startTarget,
    stopTarget,
    toggleIntercept,
    getTargetState,
    isTargetActive,
    getActiveTargets,
  };
}

export default useTargetManagement;