import { type ReactNode, useState } from 'react';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import type { ToastItem } from '../../services/toast.service';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/utils/cn';

// ─── Variant config ─────────────────────────────────────────────────────────

const variantConfig: Record<
  NonNullable<ToastItem['variant']>,
  { icon: ReactNode; borderColor: string; iconColor: string; progressGradient: string }
> = {
  info: {
    icon: <Info className="w-[17px] h-[17px]" strokeWidth={2} />,
    borderColor: 'border-[#3b82f6]/40',
    iconColor: 'text-[#60a5fa]',
    progressGradient: 'from-[#60a5fa] to-[#3b82f6]',
  },
  success: {
    icon: <CheckCircle className="w-[17px] h-[17px]" strokeWidth={2} />,
    borderColor: 'border-[#22c55e]/40',
    iconColor: 'text-[#4ade80]',
    progressGradient: 'from-[#7fe6bb] to-[#5fd9a4]',
  },
  error: {
    icon: <AlertCircle className="w-[17px] h-[17px]" strokeWidth={2} />,
    borderColor: 'border-[#ef4444]/40',
    iconColor: 'text-[#f87171]',
    progressGradient: 'from-[#f87171] to-[#ef4444]',
  },
  warning: {
    icon: <AlertTriangle className="w-[17px] h-[17px]" strokeWidth={2} />,
    borderColor: 'border-[#f59e0b]/40',
    iconColor: 'text-[#fbbf24]',
    progressGradient: 'from-[#e8b271] to-[#d99a53]',
  },
  loading: {
    icon: <Loader2 className="w-[17px] h-[17px] animate-spin" strokeWidth={2} />,
    borderColor: 'border-[#f59e0b]/40',
    iconColor: 'text-[#fbbf24]',
    progressGradient: 'from-[#e8b271] to-[#d99a53]',
  },
};

// ─── Action button styles (semantic, không phụ thuộc theme) ─────────────────

function actionButtonClasses(variant?: 'primary' | 'secondary' | 'ghost'): string {
  const base =
    'font-semibold text-xs py-[7px] px-[14px] rounded-lg cursor-pointer transition-all duration-150 flex-shrink-0 border';
  switch (variant) {
    case 'primary':
      return `${base} bg-gradient-to-br from-[#e8b271] to-[#d99a53] border-transparent text-[#211505] hover:brightness-110`;
    case 'ghost':
      return `${base} bg-transparent border-[#333846] text-[#8b93a6] hover:bg-[#15171e] hover:border-[#565d6d] hover:text-[#edf0f5]`;
    case 'secondary':
    default:
      return `${base} bg-[#262a34] border-[#333846] text-[#edf0f5] hover:bg-[#333846] hover:border-[#565d6d]`;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  /** Thứ tự từ dưới lên, dùng để tính offset và z-index */
  index: number;
}

export function Toast({ toast, onDismiss, index }: ToastProps) {
  const variant = toast.variant || 'info';
  const config = variantConfig[variant];
  const hasProgress = variant === 'loading' && toast.progress !== undefined;
  const [closeHovered, setCloseHovered] = useState(false);

  // Theme-aware colors
  const cardBg = $('--card-background');
  const textPrimary = $('--text-primary');
  const textSecondary = $('--text-secondary');
  const textDim = $('--text-secondary', 0.55);
  const borderClr = $('--border');

  return (
    <div
      className={cn(
        'relative w-[380px]',
        'border rounded-[14px]',
        'shadow-[0_18px_46px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.03)]',
        'transition-all duration-250 ease-out',
        'hover:translate-y-[-2px] hover:shadow-[0_24px_54px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.04)]',
        'animate-in slide-in-from-bottom-4 fade-in duration-200',
        config.borderColor,
      )}
      style={{
        background: `linear-gradient(to bottom right, ${cardBg}, ${$('--card-background', 0.88)})`,
        borderColor: borderClr,
        marginBottom: index === 0 ? 0 : 12,
        zIndex: 50 + index,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-[18px] pt-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn('flex-shrink-0', config.iconColor)}>{config.icon}</span>
          <p className="m-0 text-[15px] font-semibold truncate" style={{ color: textPrimary }}>
            {toast.title}
          </p>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          onMouseEnter={() => setCloseHovered(true)}
          onMouseLeave={() => setCloseHovered(false)}
          className="w-6 h-6 rounded-[7px] bg-transparent border-none cursor-pointer flex items-center justify-center flex-shrink-0 transition-colors"
          style={{
            color: closeHovered ? textSecondary : textDim,
            backgroundColor: closeHovered ? $('--card-background') : 'transparent',
          }}
        >
          <X className="w-[14px] h-[14px]" strokeWidth={2} />
        </button>
      </div>

      {/* Description */}
      {toast.description && (
        <p
          className="mt-2 mx-[18px] text-xs leading-[1.55] line-clamp-3"
          style={{ color: textSecondary }}
        >
          {toast.description}
        </p>
      )}

      {/* Footer */}
      <div className="mt-[14px] px-[18px] pb-[15px] min-h-[30px]">
        {hasProgress ? (
          <div>
            <div
              className="h-[5px] rounded-[3px] border overflow-hidden"
              style={{ backgroundColor: cardBg, borderColor: borderClr }}
            >
              <div
                className={cn(
                  'h-full rounded-[3px] bg-gradient-to-r transition-[width] duration-150 ease-linear',
                  config.progressGradient,
                )}
                style={{ width: `${Math.floor(toast.progress!)}%` }}
              />
            </div>
            <p className="mt-[7px] font-mono text-[10.5px]" style={{ color: textDim }}>
              {Math.floor(toast.progress!)}%
              <span className="inline-block ml-[1px] animate-pulse">▍</span>
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-[10px]">
            <span className="font-mono text-[10.5px] truncate" style={{ color: textDim }}>
              {toast.source ? (
                <>
                  Source: <b style={{ color: textSecondary, fontWeight: 500 }}>{toast.source}</b>
                </>
              ) : (
                '\u00A0'
              )}
            </span>
            {toast.actions && toast.actions.length > 0 && (
              <div className="flex gap-2 flex-shrink-0">
                {toast.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={action.onClick}
                    className={actionButtonClasses(action.variant)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Toast;
