/**
 * Button dùng chung
 */

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_8px_24px_-8px_rgba(34,211,238,0.5)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_10px_30px_-6px_rgba(167,139,250,0.55)] hover:-translate-y-0.5',
  secondary:
    'bg-transparent border border-black/15 dark:border-white/15 text-zinc-800 dark:text-zinc-100 hover:border-cyan-500/50 hover:text-cyan-600 dark:hover:text-cyan-400',
  ghost:
    'bg-transparent text-zinc-600 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400',
};

const sizeClasses: Record<string, string> = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
