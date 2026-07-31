import { useState, useEffect, useCallback } from 'react';
import { HistoryEntry } from '../types/repeater.types';
import { STORAGE_KEYS, getRepeaterStorageKey } from '../constants/storageKeys';

interface UseRepeaterHistoryOptions {
  targetId?: string | null;
  maxEntries?: number;
  autoSave?: boolean;
}

export function useRepeaterHistory(options: UseRepeaterHistoryOptions = {}) {
  const { targetId = null, maxEntries = 1000, autoSave = true } = options;

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load history from localStorage
  const loadHistory = useCallback(() => {
    setIsLoading(true);
    try {
      const key = targetId
        ? getRepeaterStorageKey(targetId, STORAGE_KEYS.REPEATER_HISTORY)
        : STORAGE_KEYS.REPEATER_HISTORY;
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        setHistory(parsed);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [targetId]);

  // Save history to localStorage
  const saveHistory = useCallback(
    (newHistory: HistoryEntry[]) => {
      try {
        const key = targetId
          ? getRepeaterStorageKey(targetId, STORAGE_KEYS.REPEATER_HISTORY)
          : STORAGE_KEYS.REPEATER_HISTORY;
        localStorage.setItem(key, JSON.stringify(newHistory));
      } catch (error) {
        console.error('Failed to save history:', error);
      }
    },
    [targetId],
  );

  const addEntry = useCallback(
    (entry: Omit<HistoryEntry, 'id'>) => {
      const newEntry: HistoryEntry = {
        ...entry,
        id: crypto.randomUUID(),
      };
      setHistory((prev) => {
        let updated = [newEntry, ...prev];
        // Limit entries
        if (updated.length > maxEntries) {
          updated = updated.slice(0, maxEntries);
        }
        if (autoSave) saveHistory(updated);
        return updated;
      });
      return newEntry;
    },
    [autoSave, maxEntries, saveHistory],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      setHistory((prev) => {
        const updated = prev.filter((h) => h.id !== id);
        if (autoSave) saveHistory(updated);
        if (selectedId === id) setSelectedId(null);
        return updated;
      });
    },
    [autoSave, saveHistory, selectedId],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    setSelectedId(null);
    if (autoSave) saveHistory([]);
  }, [autoSave, saveHistory]);

  const getEntryById = useCallback(
    (id: string): HistoryEntry | undefined => {
      return history.find((h) => h.id === id);
    },
    [history],
  );

  const selectEntry = useCallback(
    (id: string | null) => {
      setSelectedId(id);
    },
    [],
  );

  const getSelectedEntry = useCallback(() => {
    if (!selectedId) return null;
    return getEntryById(selectedId) || null;
  }, [selectedId, getEntryById]);

  // Load on mount or targetId change
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Auto-save when history changes
  useEffect(() => {
    if (autoSave && !isLoading) {
      saveHistory(history);
    }
  }, [history, autoSave, isLoading, saveHistory]);

  return {
    history,
    selectedId,
    isLoading,
    loadHistory,
    saveHistory,
    addEntry,
    deleteEntry,
    clearHistory,
    getEntryById,
    selectEntry,
    getSelectedEntry,
  };
}

export default useRepeaterHistory;