import { useState, useEffect, useCallback } from 'react';
import { PayloadItem } from '../types/repeater.types';
import { STORAGE_KEYS, getRepeaterStorageKey, getPayloadStorageKey } from '../constants/storageKeys';

interface UsePayloadStorageOptions {
  targetId?: string | null;
  autoSave?: boolean;
}

export function usePayloadStorage(options: UsePayloadStorageOptions = {}) {
  const { targetId = null, autoSave = true } = options;

  const [payloads, setPayloads] = useState<PayloadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load payloads from localStorage
  const loadPayloads = useCallback(() => {
    setIsLoading(true);
    try {
      const key = targetId
        ? getRepeaterStorageKey(targetId, STORAGE_KEYS.REPEATER_PAYLOADS)
        : STORAGE_KEYS.REPEATER_PAYLOADS;
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        setPayloads(parsed);
      } else {
        setPayloads([]);
      }
    } catch (error) {
      console.error('Failed to load payloads:', error);
      setPayloads([]);
    } finally {
      setIsLoading(false);
    }
  }, [targetId]);

  // Save payloads to localStorage
  const savePayloads = useCallback(
    (newPayloads: PayloadItem[]) => {
      try {
        const key = targetId
          ? getRepeaterStorageKey(targetId, STORAGE_KEYS.REPEATER_PAYLOADS)
          : STORAGE_KEYS.REPEATER_PAYLOADS;
        localStorage.setItem(key, JSON.stringify(newPayloads));
      } catch (error) {
        console.error('Failed to save payloads:', error);
      }
    },
    [targetId],
  );

  const addPayload = useCallback(
    (payload: Omit<PayloadItem, 'id'>) => {
      const newPayload: PayloadItem = {
        ...payload,
        id: crypto.randomUUID(),
      };
      setPayloads((prev) => {
        const updated = [...prev, newPayload];
        if (autoSave) savePayloads(updated);
        return updated;
      });
      return newPayload;
    },
    [autoSave, savePayloads],
  );

  const updatePayload = useCallback(
    (id: string, updates: Partial<PayloadItem>) => {
      setPayloads((prev) => {
        const updated = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
        if (autoSave) savePayloads(updated);
        return updated;
      });
    },
    [autoSave, savePayloads],
  );

  const deletePayload = useCallback(
    (id: string) => {
      setPayloads((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        if (autoSave) savePayloads(updated);
        return updated;
      });
    },
    [autoSave, savePayloads],
  );

  const togglePayload = useCallback(
    (id: string) => {
      setPayloads((prev) => {
        const updated = prev.map((p) =>
          p.id === id ? { ...p, enabled: !p.enabled } : p,
        );
        if (autoSave) savePayloads(updated);
        return updated;
      });
    },
    [autoSave, savePayloads],
  );

  const getPayloadByName = useCallback(
    (name: string): PayloadItem | undefined => {
      return payloads.find((p) => p.name === name);
    },
    [payloads],
  );

  const getEnabledPayloads = useCallback(() => {
    return payloads.filter((p) => p.enabled && p.values.length > 0);
  }, [payloads]);

  const clearPayloads = useCallback(() => {
    setPayloads([]);
    if (autoSave) savePayloads([]);
  }, [autoSave, savePayloads]);

  // Load on mount or targetId change
  useEffect(() => {
    loadPayloads();
  }, [loadPayloads]);

  // Auto-save when payloads change (if autoSave is true)
  useEffect(() => {
    if (autoSave && !isLoading) {
      savePayloads(payloads);
    }
  }, [payloads, autoSave, isLoading, savePayloads]);

  return {
    payloads,
    isLoading,
    loadPayloads,
    savePayloads,
    addPayload,
    updatePayload,
    deletePayload,
    togglePayload,
    getPayloadByName,
    getEnabledPayloads,
    clearPayloads,
  };
}

// Hook for payload values (for PayloadValueModal)
export function usePayloadValues(payloadName: string, targetId?: string | null) {
  const [values, setValues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadValues = useCallback(() => {
    setIsLoading(true);
    try {
      const key = getPayloadStorageKey(targetId || 'default', payloadName, 'files');
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        // Extract values from stored format
        if (Array.isArray(parsed)) {
          setValues(parsed);
        } else if (parsed.values) {
          setValues(parsed.values);
        } else {
          setValues([]);
        }
      } else {
        setValues([]);
      }
    } catch {
      setValues([]);
    } finally {
      setIsLoading(false);
    }
  }, [targetId, payloadName]);

  const saveValues = useCallback(
    (newValues: string[]) => {
      try {
        const key = getPayloadStorageKey(targetId || 'default', payloadName, 'files');
        localStorage.setItem(key, JSON.stringify(newValues));
        setValues(newValues);
      } catch (error) {
        console.error('Failed to save payload values:', error);
      }
    },
    [targetId, payloadName],
  );

  useEffect(() => {
    loadValues();
  }, [loadValues]);

  return {
    values,
    isLoading,
    loadValues,
    saveValues,
  };
}

export default usePayloadStorage;