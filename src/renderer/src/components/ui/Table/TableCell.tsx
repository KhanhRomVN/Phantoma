import React from 'react';
import { cn } from '../../../shared/lib/utils';
import { TableCellProps } from './type';

export const TableCell: React.FC<TableCellProps> = ({
  children,
  className,
  as = 'td',
  ...props
}) => {
  const Component = as;
  return (
    <Component
      className={cn(
        'px-3 py-2 text-left border-r border-border last:border-r-0',
        as === 'th' && 'font-medium text-text-primary',
        as === 'td' && 'text-text-primary',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

TableCell.displayName = 'TableCell';

export default TableCell;