import { cn } from '../../../shared/lib/utils';
import { InputActionProps } from './type';

export function InputAction({ children, onClick, className, disabled }: InputActionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded hover:bg-dropdown-item-hover transition-colors text-text-secondary hover:text-text-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  );
}

InputAction.displayName = 'InputAction';

export default InputAction;
