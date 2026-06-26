import { forwardRef } from 'react';
import { cn } from '../../../shared/lib/utils';
import { InputProps } from './type';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      containerClassName,
      labelClassName,
      inputClassName,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label className={cn('text-sm font-medium text-text-primary', labelClassName)}>
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full bg-input-background border rounded-lg px-3 py-2 text-sm text-text-primary outline-none transition-colors',
              'focus:border-primary/50',
              'placeholder:text-text-secondary/60',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error ? 'border-error' : 'border-input-border-default',
              inputClassName,
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <span className="text-xs text-error">{error}</span>}
        {hint && !error && <span className="text-xs text-text-secondary">{hint}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
