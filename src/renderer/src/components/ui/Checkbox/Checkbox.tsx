import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Checkbox({
  checked,
  defaultChecked,
  onChange,
  disabled,
  className,
  inputClassName,
  id,
  name,
  size = 'md',
}: CheckboxProps) {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const iconSizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked);
  };

  const isChecked = checked !== undefined ? checked : defaultChecked;

  return (
    <label className={cn('inline-flex items-center cursor-pointer', disabled && 'cursor-not-allowed', className)}>
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />
      <div
        className={cn(
          'flex items-center justify-center rounded border transition-colors',
          'border-border bg-card-background',
          'hover:border-border-hover focus-within:ring-2 focus-within:ring-primary/30 focus-within:outline-none',
          isChecked && 'bg-button-solid-background border-button-solid-background hover:bg-button-solid-background/90',
          disabled && 'opacity-50 cursor-not-allowed hover:border-border',
          sizeClasses[size],
          inputClassName,
        )}
      >
        {isChecked && (
          <Check
            className={cn(
              'text-button-solid-text transition-opacity',
              iconSizeClasses[size],
            )}
            strokeWidth={2.5}
          />
        )}
      </div>
    </label>
  );
}

Checkbox.displayName = 'Checkbox';

export default Checkbox;
