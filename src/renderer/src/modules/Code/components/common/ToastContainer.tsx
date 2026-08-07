import { useState, useEffect, useCallback } from 'react';
import { toastService, type ToastItem } from '../../services/toast.service';
import { Toast } from './Toast';

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>(() => toastService.getToasts());

  useEffect(() => {
    const unsubscribe = toastService.subscribe(() => {
      setToasts([...toastService.getToasts()]);
    });
    return unsubscribe;
  }, []);

  const handleDismiss = useCallback((id: string) => {
    toastService.dismiss(id);
  }, []);

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