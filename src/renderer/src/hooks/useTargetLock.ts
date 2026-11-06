/**
 * ------------------------------------------------------------------
 * Target Lock (Renderer)
 * ------------------------------------------------------------------
 * Đồng bộ "target đang thao tác" của cửa sổ này với main process và
 * cho biết target nào đang bị cửa sổ KHÁC thao tác. Mỗi module tự quyết
 * định target là gì (module Code: branch của project, id `${projectId}::${branchName}`) và cách xử lý xung đột.
 *
 * Exports:
 * - useTargetLock(module, targetId, onForceRelease) : báo target của cửa sổ này
 * - useBusyTargetIds(module)                        : Set target bị cửa sổ khác giữ
 * - forceReleaseTarget(module, targetId)            : yêu cầu cửa sổ khác bỏ target
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef } from 'react';
import { create } from 'zustand';

// ─── Types ──────────────────────────────────────────────────────────────
export interface TargetClaim {
  windowId: number;
  module: string;
  targetId: string;
  seq: number;
}

interface TargetLockState {
  windowId: number;
  claims: TargetClaim[];
}

// ─── Store ──────────────────────────────────────────────────────────────
const useTargetLockStore = create<TargetLockState>(() => ({ windowId: -1, claims: [] }));

let initialized = false;
function ensureInitialized(): void {
  if (initialized) return;
  initialized = true;
  window.api.on('target:claims-changed', (_event: unknown, claims: TargetClaim[]) => {
    useTargetLockStore.setState({ claims });
  });
  window.api
    .invoke('target:get-state')
    .then((state: TargetLockState) => useTargetLockStore.setState(state))
    .catch((err) => console.error('[TargetLock] get-state failed:', err));
}

// ─── Hooks ──────────────────────────────────────────────────────────────
/** Set target (module) của cửa sổ này; null = không chọn target nào. */
export function useTargetLock(
  module: string,
  targetId: string | null,
  onForceRelease?: () => void,
): void {
  const handlerRef = useRef(onForceRelease);
  handlerRef.current = onForceRelease;
  const targetRef = useRef(targetId);
  targetRef.current = targetId;

  useEffect(() => {
    ensureInitialized();
  }, []);

  useEffect(() => {
    window.api
      .invoke('target:claim', module, targetId)
      .catch((err) => console.error('[TargetLock] claim failed:', err));
  }, [module, targetId]);

  useEffect(() => {
    const off = window.api.on(
      'target:force-release',
      (_event: unknown, payload: { module: string; targetId: string }) => {
        if (payload.module === module && payload.targetId === targetRef.current) {
          handlerRef.current?.();
        }
      },
    );
    return () => {
      if (typeof off === 'function') off();
    };
  }, [module]);
}

/** Các target của module đang bị cửa sổ khác thao tác. */
export function useBusyTargetIds(module: string): Set<string> {
  const claims = useTargetLockStore((s) => s.claims);
  const windowId = useTargetLockStore((s) => s.windowId);
  useEffect(() => {
    ensureInitialized();
  }, []);
  return useMemo(
    () =>
      new Set(
        claims.filter((c) => c.module === module && c.windowId !== windowId).map((c) => c.targetId),
      ),
    [claims, windowId, module],
  );
}

/**
 * true nếu cửa sổ này là bên claim SAU trong xung đột trên target này
 * (có cửa sổ khác claim cùng target trước). Chỉ bên này nên hiện modal xung đột.
 */
export function useIsLateClaimant(module: string, targetId: string | null): boolean {
  const claims = useTargetLockStore((s) => s.claims);
  const windowId = useTargetLockStore((s) => s.windowId);
  useEffect(() => {
    ensureInitialized();
  }, []);
  if (!targetId) return false;
  const mine = claims.find(
    (c) => c.windowId === windowId && c.module === module && c.targetId === targetId,
  );
  if (!mine) return false;
  return claims.some(
    (c) =>
      c.windowId !== windowId &&
      c.module === module &&
      c.targetId === targetId &&
      c.seq < mine.seq,
  );
}

/** Chuyển focus sang cửa sổ khác đang giữ target này. */
export function focusTargetOwner(module: string, targetId: string): void {
  window.api
    .invoke('target:focus-owner', module, targetId)
    .catch((err) => console.error('[TargetLock] focus-owner failed:', err));
}

/** Đóng các cửa sổ khác đang giữ target này. */
export function closeTargetOwner(module: string, targetId: string): void {
  window.api
    .invoke('target:close-owner', module, targetId)
    .catch((err) => console.error('[TargetLock] close-owner failed:', err));
}

/** Yêu cầu các cửa sổ khác đang giữ target này bỏ chọn nó. */
export function forceReleaseTarget(module: string, targetId: string): void {
  window.api
    .invoke('target:force-release', module, targetId)
    .catch((err) => console.error('[TargetLock] force-release failed:', err));
}