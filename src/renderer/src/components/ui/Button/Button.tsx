import React from 'react';
import { cn } from '../../../shared/lib/utils';
import { ButtonProps, ButtonVariant, ButtonSize } from './type';

const variantClasses: Record<ButtonVariant, string> = {
  solid: 'bg-button-solid-background text-button-solid-text hover:bg-button-solid-background/90 active:bg-button-solid-background/80',
  outline: 'border border-border text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/10 active:bg-primary/20',
  soft: 'bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70',
  ghost: 'text-primary hover:bg-primary/10 active:bg-primary/20',
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
    <button
      type={type}
      className={baseClasses}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

Button.displayName = 'Button';

export default Button;