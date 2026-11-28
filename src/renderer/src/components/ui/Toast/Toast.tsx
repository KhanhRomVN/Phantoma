import type { ReactNode } from 'react';
import { Info, CheckCircle, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { $ } from '@renderer/utils/color';
import type { ToastProps, ToastVariant } from './type';

const variantConfig: Record<ToastVariant, { icon: ReactNode; badge: string }> = {
  info: {
    icon: <Info className="w-4 h-4" strokeWidth={2} />,
    badge: 'bg-[#3b82f6]/15 text-[#60a5fa]',
  },
  success: {
    icon: <CheckCircle className="w-4 h-4" strokeWidth={2} />,
    badge: 'bg-[#22c55e]/15 text-[#4ade80]',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" strokeWidth={2} />,
    badge: 'bg-[#ef4444]/15 text-[#f87171]',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" strokeWidth={2} />,
    badge: 'bg-[#f59e0b]/15 text-[#fbbf24]',
  },
  loading: {
    icon: <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />,
    badge: 'bg-[#f59e0b]/15 text-[#fbbf24]',
  },
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const config = variantConfig[toast.variant || 'info'];

  return (
    <div
      role="status"
      onClick={() => onDismiss(toast.id)}
      className={cn(
        'flex w-[320px] max-w-[calc(100vw-2rem)] cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 shadow-lg',
        toast.className,
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          config.badge,
        )}
      >
        {config.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="m-0 truncate text-[13px] font-semibold"
          style={{ color: $('--text-primary') }}
        >
          {toast.title}
        </p>
        {toast.description && (
          <p className="m-0 mt-0.5 truncate text-xs" style={{ color: $('--text-secondary') }}>
            {toast.description}
          </p>
        )}
      </div>
    </div>
  );
}

export default Toast;