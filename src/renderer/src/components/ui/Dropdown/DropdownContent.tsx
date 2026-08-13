import React, { createContext, useContext } from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { DropdownContentProps } from './type';

// ─── Size Context ───────────────────────────────────────────────────────
type DropdownSize = 'sm' | 'md' | 'lg';

const DropdownSizeContext = createContext<DropdownSize>('md');

export function useDropdownSize() {
  return useContext(DropdownSizeContext);
}

// ─── Size-aware style maps ──────────────────────────────────────────────
export const dropdownSizeStyles: Record<DropdownSize, { item: string; icon: string; gap: string }> = {
  sm: { item: 'px-2 py-1 text-xs', icon: 'w-3 h-3', gap: 'gap-1.5' },
  md: { item: 'px-3 py-1.5 text-sm', icon: 'w-3.5 h-3.5', gap: 'gap-2' },
  lg: { item: 'px-4 py-2 text-base', icon: 'w-4 h-4', gap: 'gap-2.5' },
};

// ─── Content ────────────────────────────────────────────────────────────
export const DropdownContent = React.memo(function DropdownContent({
  children,
  className,
  size = 'md',
}: DropdownContentProps) {
  return (
    <DropdownSizeContext.Provider value={size}>
      <div
        className={cn(
          'bg-background border border-border rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.08)] min-w-[200px] py-1 transition-colors hover:border-primary flex flex-col',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </DropdownSizeContext.Provider>
  );
});

DropdownContent.displayName = 'DropdownContent';

export default DropdownContent;
