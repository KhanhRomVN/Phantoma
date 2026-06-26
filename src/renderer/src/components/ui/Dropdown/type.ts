import React from 'react';

export interface DropdownProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
}

export interface DropdownTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export interface DropdownContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface DropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface DropdownSeparatorProps {
  className?: string;
}