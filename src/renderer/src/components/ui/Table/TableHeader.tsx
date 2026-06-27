import React from 'react';
import { cn } from '../../../shared/lib/utils';
import { TableHeaderProps } from './type';

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className, ...props }) => {
  return (
    <thead
      className={cn('sticky top-0 bg-background z-10', className)}
      {...props}
    >
      {children}
    </thead>
  );
};

TableHeader.displayName = 'TableHeader';

export default TableHeader;