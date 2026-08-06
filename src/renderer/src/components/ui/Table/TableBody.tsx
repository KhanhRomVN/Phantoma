import React from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { TableBodyProps } from './type';

export const TableBody: React.FC<TableBodyProps> = ({ children, className, ...props }) => {
  return (
    <tbody className={cn(className)} {...props}>
      {children}
    </tbody>
  );
};

TableBody.displayName = 'TableBody';

export default TableBody;
