import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';

interface ModalHeaderProps {
  title?: string;
  description?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  description,
  onClose,
  showCloseButton = true,
  className,
}) => {
  return (
    <div className={cn('px-5 pt-5 pb-2 border-b border-divider shrink-0 flex items-center gap-3', className)}>
      <div className="flex-1 min-w-0">
        {title && <h3 className="text-base font-bold text-text-primary">{title}</h3>}
        {description && (
          <p className="text-xs text-text-secondary mt-0.5 truncate">{description}</p>
        )}
      </div>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className={cn(
            'p-1.5 rounded-lg border border-border text-text-secondary hover:border-error hover:text-error hover:bg-error/10 transition-all shrink-0'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ModalHeader;