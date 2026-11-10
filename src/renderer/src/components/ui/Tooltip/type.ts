import React from 'react';

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
  disableHoverableContent?: boolean;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  alignOffset?: number;
  className?: string;
  contentClassName?: string;
  /** Tooltip bám theo con trỏ chuột, ưu tiên bên phải, tự lật sang trái khi hết chỗ */
  followMouse?: boolean;
}