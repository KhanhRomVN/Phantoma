import { cn } from '@renderer/shared/utils/cn';
import { DropdownContentProps } from './type';

export function DropdownContent({ children, className }: DropdownContentProps) {
  return (
    <div className={cn('flex flex-col', className)} onClick={(e) => e.stopPropagation()}>
      <div className="max-h-[300px] overflow-y-auto py-1">{children}</div>
    </div>
  );
}

DropdownContent.displayName = 'DropdownContent';

export default DropdownContent;
