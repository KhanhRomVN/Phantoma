/**
 * ------------------------------------------------------------------
 * useModulePersistence
 * ------------------------------------------------------------------
 * Hook quản lý state có lưu trữ trên module store. Tự động lưu state
 * vào store khi thay đổi (nếu autoSave) và khôi phục dữ liệu đã lưu
 * khi khởi tạo.
 *
 * Main features:
 * - Khôi phục state từ store khi mount (preferSaved)
 * - Tự động lưu state khi thay đổi (autoSave)
 * - Hỗ trợ cập nhật partial/functional và clear state
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useCallback, useRef } from 'react';

// ── Stores ──
import { useModuleStore, ModuleStateMap } from '../stores/moduleStore';

// ─── Types ──────────────────────────────────────────────────────────────
type ModuleId = keyof ModuleStateMap;

// ─── Hook ───────────────────────────────────────────────────────────────
export function useModulePersistence<T>(
  moduleId: ModuleId,
  initialState: T,
  options?: {
    preferSaved?: boolean;
    autoSave?: boolean;
  },
): [T, (data: Partial<T> | ((prev: T) => Partial<T>)) => void, () => void] {
  // ── Store ──
  const { setModuleState, getModuleState, clearModuleState } = useModuleStore();
  const { preferSaved = true, autoSave = true } = options || {};

  // ── State ──
  const [state, setState] = useState<T>(() => {
    const saved = getModuleState(moduleId);
    if (preferSaved && saved && Object.keys(saved).length > 0) {
      return saved as T;
    }
    return initialState;
  });

  // ── Refs ──
  const prevStateRef = useRef<T>(state);

  // ── Effects ──
  useEffect(() => {
    if (autoSave) {
      const prevState = prevStateRef.current;
      const hasChanged = JSON.stringify(prevState) !== JSON.stringify(state);
      if (hasChanged) {
        setModuleState(moduleId, state as any);
        prevStateRef.current = state;
      }
    }
  }, [state, moduleId, autoSave, setModuleState]);

  // ── Callbacks ──
  const updateState = useCallback(
    (data: Partial<T> | ((prev: T) => Partial<T>)) => {
      setState((prev) => {
        const updates = typeof data === 'function' ? data(prev) : data;
        const newState = { ...prev, ...updates };
        if (!autoSave) {
          setModuleState(moduleId, newState as any);
        }
        return newState;
      });
    },
    [autoSave, moduleId, setModuleState],
  );

  const clearState = useCallback(() => {
    clearModuleState(moduleId);
    setState(initialState);
  }, [moduleId, clearModuleState, initialState]);

  return [state, updateState, clearState];
}