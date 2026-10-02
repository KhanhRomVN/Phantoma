import { cn } from '@renderer/shared/utils/cn';
import { DropdownContentProps } from './type';

/**
 * DropdownContent renders its children directly without imposing any
 * height constraints or internal scrolling by default.
 * If you need to limit height and enable scrolling, pass appropriate
 * classes via the `className` prop (e.g., 'max-h-[200px] overflow-y-auto').
 */
export function DropdownContent({ children, className }: DropdownContentProps) {
  return (
    <div
      className={cn('flex flex-col px-1.5 py-1.5', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

DropdownContent.displayName = 'DropdownContent';

export default DropdownContent;
