import { useState, useEffect, useCallback } from 'react';
import { useModuleStore, ModuleStateMap } from '../stores/moduleStore';

type ModuleId = keyof ModuleStateMap;

export function useModulePersistence<T>(
  moduleId: ModuleId,
  initialState: T,
  options?: {
    /** Khi mount, nếu có state trong store sẽ dùng thay vì initialState */
    preferSaved?: boolean;
    /** Tự động lưu mỗi khi state thay đổi */
    autoSave?: boolean;
  }
): [T, (data: Partial<T> | ((prev: T) => Partial<T>)) => void, () => void] {
  const { states, setModuleState, getModuleState, clearModuleState } = useModuleStore();
  const { preferSaved = true, autoSave = true } = options || {};

  // Khởi tạo state: ưu tiên dữ liệu đã lưu nếu có
  const [state, setState] = useState<T>(() => {
    const saved = getModuleState(moduleId);
    if (preferSaved && saved && Object.keys(saved).length > 0) {
      return saved as T;
    }
    return initialState;
  });

  // Lưu lên store mỗi khi state thay đổi (nếu autoSave)
  useEffect(() => {
    if (autoSave) {
      setModuleState(moduleId, state as any);
    }
  }, [state, moduleId, autoSave, setModuleState]);

  // Hàm cập nhật state (hỗ trợ partial và functional update)
  const updateState = useCallback(
    (data: Partial<T> | ((prev: T) => Partial<T>)) => {
      setState((prev) => {
        const updates = typeof data === 'function' ? data(prev) : data;
        const newState = { ...prev, ...updates };
        // Nếu autoSave false, vẫn lưu khi gọi update thủ công
        if (!autoSave) {
          setModuleState(moduleId, newState as any);
        }
        return newState;
      });
    },
    [autoSave, moduleId, setModuleState]
  );

  // Hàm clear state
  const clearState = useCallback(() => {
    clearModuleState(moduleId);
    setState(initialState);
  }, [moduleId, clearModuleState, initialState]);

  return [state, updateState, clearState];
}