export type ToastVariant = 'info' | 'success' | 'error' | 'warning' | 'loading';

export type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  position?: ToastPosition;
  className?: string;
  duration?: number;
  onClose?: () => void;
}

export type ToastShowOptions = Omit<ToastItem, 'id'> & { id?: string };

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}