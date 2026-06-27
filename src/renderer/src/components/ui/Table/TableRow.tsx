import React from 'react';
import { cn } from '../../../shared/lib/utils';
import { TableRowProps } from './type';

export const TableRow: React.FC<TableRowProps> = ({ children, className, ...props }) => {
  return (
    <tr
      className={cn('border-b border-border hover:bg-dropdown-item-hover/50 transition-colors', className)}
      {...props}
    >
      {children}
    </tr>
  );
};

TableRow.displayName = 'TableRow';

export default TableRow;