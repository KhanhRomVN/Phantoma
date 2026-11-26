/**
 * ------------------------------------------------------------------
 * useHealthCheck
 * ------------------------------------------------------------------
 * Polls /api/v1/runtime/health every intervalMs (default 5000) to detect
 * whether the spawned browser processes are still alive. When a target's
 * process is no longer running, it triggers onTargetDead so the parent
 * component can clean up UI state and close associated windows.
 * ------------------------------------------------------------------
 */

import { useEffect, useRef, useCallback } from 'react';
import { runtimeApi } from '../services/runtime-api.service';

interface HealthCheckOptions {
  /** Interval in milliseconds between polls (default: 5000). */
  intervalMs?: number;
  /** Called when a previously-alive target's process has died. */
  onTargetDead: (targetId: string) => void;
  /** Chỉ poll khi true (mặc định true). */
  enabled?: boolean;
}

export function useHealthCheck({
  intervalMs = 5000,
  onTargetDead,
  enabled = true,
}: HealthCheckOptions): void {
  // Track which targets were alive in the previous poll so we only fire
  // onTargetDead on transitions from alive → dead (not on first discovery).
  const prevAliveRef = useRef<Set<string>>(new Set());
  const onTargetDeadRef = useRef(onTargetDead);

  // Keep callback ref fresh without re-triggering the effect.
  useEffect(() => {
    onTargetDeadRef.current = onTargetDead;
  }, [onTargetDead]);

  const tick = useCallback(async () => {
    const result = await runtimeApi.healthCheck();
    if (!result.success || !result.data) return;

    const currentAlive = new Set<string>();
    for (const t of result.data.targets) {
      if (t.alive) currentAlive.add(t.targetId);
    }

    // Detect transitions: was alive before, but not anymore → notify parent.
    for (const tid of prevAliveRef.current) {
      if (!currentAlive.has(tid)) {
        console.warn(`[HealthCheck] Target ${tid} process is no longer alive.`);
        onTargetDeadRef.current(tid);
      }
    }

    prevAliveRef.current = currentAlive;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [tick, intervalMs, enabled]);
}

export default useHealthCheck;