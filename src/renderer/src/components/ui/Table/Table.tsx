import React from 'react';
import { cn } from '../../../shared/lib/utils';
import { TableProps } from './type';

export const Table: React.FC<TableProps> = ({ children, className, ...props }) => {
  return (
    <table
      className={cn('w-full border-collapse text-sm', className)}
      {...props}
    >
      {children}
    </table>
  );
};

Table.displayName = 'Table';

export default Table;