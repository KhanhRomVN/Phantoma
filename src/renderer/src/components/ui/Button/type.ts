import React from 'react';

export type ButtonVariant =
  | 'solid'
  | 'outline'
  | 'soft'
  | 'ghost'
  | 'error'
  | 'soft-info'
  | 'soft-success'
  | 'soft-warning'
  | 'soft-error'
  | 'solid-info'
  | 'solid-success'
  | 'solid-warning'
  | 'solid-error';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  asChild?: boolean;
}
