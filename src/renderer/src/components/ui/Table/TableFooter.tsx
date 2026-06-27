import React from 'react';
import { cn } from '../../../shared/lib/utils';
import { TableFooterProps } from './type';

export const TableFooter: React.FC<TableFooterProps> = ({ children, className, ...props }) => {
  return (
    <tfoot className={cn('bg-card-background/50', className)} {...props}>
      {children}
    </tfoot>
  );
};

TableFooter.displayName = 'TableFooter';

export default TableFooter;