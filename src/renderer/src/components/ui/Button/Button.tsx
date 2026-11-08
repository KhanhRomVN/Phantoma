import { cn } from '@renderer/utils/cn';
import { ButtonProps } from './type';

export function Button({
  children,
  className,
  disabled = false,
  onClick,
  fullWidth = false,
  asChild = false,
  ...props
}: ButtonProps) {
  const baseClasses = cn(
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200',
    'px-3 py-1 text-xs',
    'disabled:opacity-50 disabled:cursor-not-allowed',
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
    <button type="button" className={baseClasses} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  );
}

Button.displayName = 'Button';

export default Button;