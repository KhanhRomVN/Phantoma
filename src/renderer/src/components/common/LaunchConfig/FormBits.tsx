import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@renderer/utils/cn';

export const CONFIRM_BTN =
  'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50 disabled:hover:bg-primary/10';
export const CANCEL_BTN =
  'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary active:bg-text-secondary/20 disabled:hover:bg-text-secondary/10';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
        {label}
        {optional && <span className="font-normal text-text-secondary">Optional</span>}
      </div>
      {children}
      {error ? (
        <span className="text-[11px] text-error">{error}</span>
      ) : (
        hint && <span className="text-[11px] text-text-secondary">{hint}</span>
      )}
    </div>
  );
}

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          'w-full appearance-none rounded-lg border border-input-border-default bg-input-background px-3 py-2 pr-8 text-sm text-text-primary outline-none transition-colors focus:border-primary/50 disabled:opacity-50',
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
    </div>
  );
}

export const InputField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-input-border-default bg-input-background px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/60 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
InputField.displayName = 'InputField';