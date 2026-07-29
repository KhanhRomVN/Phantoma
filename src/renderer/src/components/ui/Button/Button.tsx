import { cn } from '../../../shared/lib/utils';
import { ButtonProps, ButtonVariant, ButtonSize } from './type';

const variantClasses: Record<ButtonVariant, string> = {
  // Existing variants
  solid:
    'bg-button-solid-background text-button-solid-text hover:bg-button-solid-background/90 active:bg-button-solid-background/80',
  outline:
    'border border-border text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/10 active:bg-primary/20',
  soft: 'bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70',
  ghost: 'text-primary hover:bg-primary/10 active:bg-primary/20',
  error: 'bg-error text-button-solid-text hover:bg-error/90 active:bg-error/80',

  // Soft variants (idle: soft background, hover: solid)
  'soft-info': 'bg-info/10 text-info hover:bg-info hover:text-white active:bg-info/90',
  'soft-success':
    'bg-success/10 text-success hover:bg-success hover:text-white active:bg-success/90',
  'soft-warning': 'bg-warn/10 text-warn hover:bg-warn hover:text-white active:bg-warn/90',
  'soft-error': 'bg-error/10 text-error hover:bg-error hover:text-white active:bg-error/90',

  // Solid variants (always solid)
  'solid-info': 'bg-info text-white hover:bg-info/90 active:bg-info/80',
  'solid-success': 'bg-success text-white hover:bg-success/90 active:bg-success/80',
  'solid-warning': 'bg-warn text-white hover:bg-warn/90 active:bg-warn/80',
  'solid-error': 'bg-error text-white hover:bg-error/90 active:bg-error/80',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  children,
  variant = 'solid',
  size = 'md',
  className,
  disabled = false,
  onClick,
  type = 'button',
  fullWidth = false,
  asChild = false,
  ...props
}: ButtonProps) {
  const baseClasses = cn(
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-none',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    className,
  );

  if (asChild) {
    return (
      <span className={baseClasses} {...props}>
        {children}
      </span>
    );
  }

  return (
    <button type={type} className={baseClasses} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  );
}

Button.displayName = 'Button';

export default Button;
