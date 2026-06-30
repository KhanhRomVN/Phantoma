import React, { useEffect } from 'react';
import { cn } from '../../../shared/lib/utils';
import { DrawerProps } from './type';

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  children,
  className,
  closeOnBackdropClick = true,
  height = '50%',
  width = '500px',
  strategy = 'fixed',
  position = 'bottom',
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const isSide = position === 'right' || position === 'left';

  return (
    <div
      className={cn(
        'inset-0 z-50 flex',
        strategy === 'fixed' ? 'fixed' : 'absolute',
        position === 'right' && 'justify-end',
        position === 'left' && 'justify-start',
        position === 'bottom' && 'items-end justify-center',
      )}
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 bg-background shadow-2xl flex flex-col duration-200',
          isSide
            ? cn(
                'h-full border-border animate-in',
                position === 'right' && 'border-l slide-in-from-right',
                position === 'left' && 'border-r slide-in-from-left',
              )
            : 'border-t border-border rounded-t-2xl w-full animate-in slide-up',
          className,
        )}
        style={isSide ? { width } : { height }}
      >
        {/* Drag handle (bottom sheet only) */}
        {!isSide && (
          <div className="flex justify-center pt-2.5 pb-1.5 shrink-0">
            <div className="w-8 h-[3px] rounded-[2px] bg-border" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default Drawer;