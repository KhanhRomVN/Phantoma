/**
 * ------------------------------------------------------------------
 * Toast Container
 * ------------------------------------------------------------------
 * Fixed-position container that renders all active toast notifications.
 * Subscribes to the toast service and re-renders on changes. Toasts
 * are stacked from bottom with the newest at the bottom.
 *
 * Main features:
 * - Subscribes to toastService for real-time updates
 * - Stacks toasts in reverse order (newest at bottom)
 * - Auto-hides when no toasts are active
 * ------------------------------------------------------------------
 */

// ─── Imports ──────────────��─────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useCallback } from 'react';

// ── Services ──
import { toastService, type ToastItem } from '../../services/toast.service';

// ── Components ──
import { Toast } from './Toast';

// ─── Component ──────────────────────────────────────────────────────────
export function ToastContainer() {
  // ── State ──
  const [toasts, setToasts] = useState<ToastItem[]>(() => toastService.getToasts());

  // ── Effects ──
  useEffect(() => {
    const unsubscribe = toastService.subscribe(() => {
      setToasts([...toastService.getToasts()]);
    });
    return unsubscribe;
  }, []);

  // ── Handlers ──
  const handleDismiss = useCallback((id: string) => {
    toastService.dismiss(id);
  }, []);

  // ── Render ──
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 left-5 z-50 flex flex-col-reverse pointer-events-none"
      style={{ maxHeight: '80vh' }}
    >
      {toasts.map((toast, index) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            toast={toast}
            onDismiss={handleDismiss}
            index={toasts.length - 1 - index}
          />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;