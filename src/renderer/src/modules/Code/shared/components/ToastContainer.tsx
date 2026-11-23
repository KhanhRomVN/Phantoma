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
 * - Animated enter/exit and smooth re-stacking via framer-motion
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useCallback } from 'react';

// ── UI ──
import { AnimatePresence, motion } from 'framer-motion';

// ── Services ──
import { toastService, type ToastItem } from '../services/toast.service';

// ── Constants ──
import { toastMotion } from '../constants/motion.constants';

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
  return (
    <div
      className="fixed bottom-5 left-5 z-50 flex flex-col-reverse pointer-events-none"
      style={{ maxHeight: '80vh' }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            layout="position"
            variants={toastMotion}
            initial="initial"
            animate="animate"
            exit="exit"
            className="pointer-events-auto"
          >
            <Toast
              toast={toast}
              onDismiss={handleDismiss}
              index={toasts.length - 1 - index}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default ToastContainer;