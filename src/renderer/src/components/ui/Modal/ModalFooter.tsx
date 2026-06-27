import React from 'react';
import { cn } from '../../../shared/lib/utils';

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => {
  return (
    <div className={cn('px-5 py-4 border-t border-divider shrink-0 flex justify-end gap-3', className)}>
      {children}
    </div>
  );
};

export default ModalFooter;