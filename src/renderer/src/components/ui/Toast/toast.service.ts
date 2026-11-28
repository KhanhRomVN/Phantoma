import type { ToastItem, ToastShowOptions } from './type';

type Listener = () => void;
const listeners = new Set<Listener>();
let toasts: ToastItem[] = [];
let idCounter = 0;

function emit() {
  listeners.forEach((fn) => fn());
}

function generateId(): string {
  idCounter += 1;
  return `toast-${Date.now()}-${idCounter}`;
}

export const toastService = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  getToasts(): ToastItem[] {
    return toasts;
  },

  show(options: ToastShowOptions): string {
    const id = options.id || generateId();
    const toast: ToastItem = { ...options, id };

    const existingIndex = toasts.findIndex((t) => t.id === id);
    if (existingIndex >= 0) {
      toasts[existingIndex] = toast;
    } else {
      toasts.push(toast);
    }

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, toast.duration);
    }

    emit();
    return id;
  },

  update(id: string, partial: Partial<Omit<ToastItem, 'id'>>): void {
    const index = toasts.findIndex((t) => t.id === id);
    if (index < 0) return;
    toasts[index] = { ...toasts[index], ...partial };
    emit();
  },

  dismiss(id: string): void {
    const toast = toasts.find((t) => t.id === id);
    if (toast?.onClose) {
      toast.onClose();
    }
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },

  clearAll(): void {
    toasts.forEach((t) => t.onClose?.());
    toasts = [];
    emit();
  },
};