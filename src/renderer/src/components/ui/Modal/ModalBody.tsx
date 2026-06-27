import React from 'react';
import { cn } from '../../../shared/lib/utils';

interface ModalBodyProps {
  children?: React.ReactNode;
  className?: string;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className }) => {
  return (
    <div className={cn('px-5 py-3 flex-1 overflow-y-auto', className)}>
      {children}
    </div>
  );
};

export default ModalBody;