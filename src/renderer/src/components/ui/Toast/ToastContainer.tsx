import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@renderer/utils/cn';
import { Toast } from './Toast';
import { toastService } from './toast.service';
import type { ToastItem, ToastPosition } from './type';

const POSITION_CLASS: Record<ToastPosition, string> = {
  'top-left': 'top-4 left-4 flex-col',
  'top-right': 'top-4 right-4 flex-col',
  'bottom-left': 'bottom-4 left-4 flex-col-reverse',
  'bottom-right': 'bottom-4 right-4 flex-col-reverse',
};

const POSITIONS = Object.keys(POSITION_CLASS) as ToastPosition[];
const DEFAULT_POSITION: ToastPosition = 'bottom-left';

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>(() => toastService.getToasts());

  useEffect(
    () => toastService.subscribe(() => setToasts([...toastService.getToasts()])),
    [],
  );

  const handleDismiss = useCallback((id: string) => {
    toastService.dismiss(id);
  }, []);

  return createPortal(
    <>
      {POSITIONS.map((position) => {
        const offsetX = position.endsWith('left') ? -24 : 24;
        return (
          <div
            key={position}
            className={cn(
              'pointer-events-none fixed z-[2147483647] flex gap-2',
              POSITION_CLASS[position],
            )}
            style={{ maxHeight: '80vh' }}
          >
            <AnimatePresence initial={false}>
              {toasts
                .filter((t) => (t.position ?? DEFAULT_POSITION) === position)
                .map((toast) => (
                  <motion.div
                    key={toast.id}
                    layout="position"
                    initial={{ opacity: 0, x: offsetX, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: offsetX, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="pointer-events-auto"
                  >
                    <Toast toast={toast} onDismiss={handleDismiss} />
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        );
      })}
    </>,
    document.body,
  );
}

export default ToastContainer;