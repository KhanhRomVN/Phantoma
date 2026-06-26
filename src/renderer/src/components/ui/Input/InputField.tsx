import { forwardRef } from 'react';
import { cn } from '../../../shared/lib/utils';
import { InputFieldProps } from './type';

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full bg-input-background border border-input-border-default rounded-lg px-3 py-2 text-sm text-text-primary outline-none transition-colors',
          'focus:border-primary/50',
          'placeholder:text-text-secondary/60',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    );
  },
);

InputField.displayName = 'InputField';

export default InputField;
