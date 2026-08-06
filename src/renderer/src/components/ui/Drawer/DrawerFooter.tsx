import React from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { DrawerFooterProps } from './type';

export const DrawerFooter: React.FC<DrawerFooterProps> = ({ children, className }) => {
  return (
    <div className={cn('flex gap-2 px-4 py-3 shrink-0 border-t border-divider', className)}>
      {children}
    </div>
  );
};

export default DrawerFooter;
