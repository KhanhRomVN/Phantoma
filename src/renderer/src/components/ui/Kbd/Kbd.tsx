import React from 'react';
import { cn } from '../../../shared/lib/utils';

export interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return React.createElement(
    'kbd',
    {
      className: cn(
        'inline-flex items-center justify-center px-1.5 py-0.5 text-[12px] font-medium',
        'text-text-secondary bg-border/30 rounded border border-border',
        'min-w-[20px] h-5 ',
        className,
      ),
    },
    children,
  );
}

export default Kbd;
