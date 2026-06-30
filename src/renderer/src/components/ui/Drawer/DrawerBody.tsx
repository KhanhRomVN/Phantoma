import React from 'react';
import { cn } from '../../../shared/lib/utils';
import { DrawerBodyProps } from './type';

export const DrawerBody: React.FC<DrawerBodyProps> = ({ children, className }) => {
  return (
    <div className={cn('flex-1 overflow-y-auto px-4 py-3.5', className)}>
      {children}
    </div>
  );
};

export default DrawerBody;