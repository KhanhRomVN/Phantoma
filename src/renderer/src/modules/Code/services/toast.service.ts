/**
 * ------------------------------------------------------------------
 * Toast Service
 * ------------------------------------------------------------------
 * Manages toast notification display in the application.
 * Supports multiple variants: info, success, error, warning, loading.
 * Features auto-dismiss, max 3 action buttons per toast, and live
 * update support (e.g. LSP install progress bar).
 *
 * Main functions:
 * - subscribe()  : Register a listener for toast list changes, returns unsubscribe
 * - getToasts()  : Get the current toast list
 * - show()       : Show a new toast (or update if same id), returns id
 * - update()     : Partially update a visible toast's content
 * - dismiss()    : Close a toast by id
 * - clearAll()   : Close all toasts
 * ------------------------------------------------------------------
 */

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface ToastAction {
  label: string;
  onClick: () => void;
  /** primary = filled accent, secondary = outlined, ghost = transparent */
  variant?: 'primary' | 'secondary' | 'ghost';
}

export type ToastVariant = 'info' | 'success' | 'error' | 'warning' | 'loading';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  source?: string;
  progress?: number;
  actions?: ToastAction[];
  duration?: number;
  onClose?: () => void;
}

export type ToastShowOptions = Omit<ToastItem, 'id'> & { id?: string };

// ─── State ──────────────────────────────────────────────────────────────
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

// ─── Service ────────────────────────────────────────────────────────────
export const toastService = {
  /** Đăng ký listener, trả về hàm unsubscribe */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  /** Lấy danh sách toast hiện tại */
  getToasts(): ToastItem[] {
    return toasts;
  },

  /** Hiển thị toast mới, trả về id */
  show(options: ToastShowOptions): string {
    const id = options.id || generateId();
    const toast: ToastItem = {
      ...options,
      id,
      actions: options.actions?.slice(0, 3), // giới hạn 3 nút
    };

    // Nếu đã có toast với id này thì update, không thêm mới
    const existingIndex = toasts.findIndex((t) => t.id === id);
    if (existingIndex >= 0) {
      toasts[existingIndex] = toast;
    } else {
      toasts.push(toast);
    }

    // Auto-dismiss
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, toast.duration);
    }

    emit();
    return id;
  },

  /** Cập nhật toast đang hiển thị */
  update(id: string, partial: Partial<Omit<ToastItem, 'id'>>): void {
    const index = toasts.findIndex((t) => t.id === id);
    if (index < 0) return;
    toasts[index] = { ...toasts[index], ...partial };
    emit();
  },

  /** Đóng toast theo id */
  dismiss(id: string): void {
    const toast = toasts.find((t) => t.id === id);
    if (toast?.onClose) {
      toast.onClose();
    }
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },

  /** Đóng tất cả toast */
  clearAll(): void {
    toasts.forEach((t) => t.onClose?.());
    toasts = [];
    emit();
  },
};