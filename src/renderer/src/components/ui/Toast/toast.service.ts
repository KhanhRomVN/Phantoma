import type { ToastItem, ToastShowOptions } from './type';

const DEFAULT_DURATION = 2000;

type Listener = () => void;
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let toasts: ToastItem[] = [];
let idCounter = 0;

function emit() {
  listeners.forEach((fn) => fn());
}

function generateId(): string {
  idCounter += 1;
  return `toast-${Date.now()}-${idCounter}`;
}

function clearTimer(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function resolveDuration(toast: ToastItem): number {
  if (toast.duration !== undefined) return toast.duration;
  return toast.variant === 'loading' ? 0 : DEFAULT_DURATION;
}

function schedule(toast: ToastItem) {
  clearTimer(toast.id);
  const duration = resolveDuration(toast);
  if (duration <= 0) return;
  timers.set(
    toast.id,
    setTimeout(() => toastService.dismiss(toast.id), duration),
  );
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

    schedule(toast);
    emit();
    return id;
  },

  update(id: string, partial: Partial<Omit<ToastItem, 'id'>>): void {
    const index = toasts.findIndex((t) => t.id === id);
    if (index < 0) return;
    toasts[index] = { ...toasts[index], ...partial };
    schedule(toasts[index]);
    emit();
  },

  dismiss(id: string): void {
    clearTimer(id);
    const toast = toasts.find((t) => t.id === id);
    if (toast?.onClose) {
      toast.onClose();
    }
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },

  clearAll(): void {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
    toasts.forEach((t) => t.onClose?.());
    toasts = [];
    emit();
  },
};