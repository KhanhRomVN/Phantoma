import React from 'react';
import { cn } from '../../../shared/lib/utils';
import { DrawerFooterProps } from './type';

export const DrawerFooter: React.FC<DrawerFooterProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'flex gap-2 px-4 pt-3 pb-5 shrink-0 border-t border-divider',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default DrawerFooter;