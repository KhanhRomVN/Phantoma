import type { ReactNode } from 'react';
import { cn } from '@renderer/shared/utils/cn';

export function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className='mb-8'>
      <h2 className='text-base font-bold text-text-primary'>{title}</h2>
      {description && <p className='text-xs text-text-secondary mt-0.5'>{description}</p>}
      <div className='mt-3 rounded-lg border border-border divide-y divide-border/60 bg-card-background/50'>
        {children}
      </div>
    </section>
  );
}

export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className='flex items-center justify-between gap-6 px-4 py-3'>
      <div className='min-w-0'>
        <div className='text-sm text-text-primary'>{label}</div>
        {description && <div className='text-xs text-text-secondary mt-0.5'>{description}</div>}
      </div>
      <div className='shrink-0'>{children}</div>
    </div>
  );
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('relative w-9 h-5 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-border')}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
          checked && 'translate-x-4'
        )}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className='flex rounded-lg border border-border overflow-hidden'>
      {options.map((o) => (
        <button
          key={o.value}
          type='button'
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 py-1 text-xs font-medium transition-colors',
            o.value === value
              ? 'bg-primary/15 text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-card-background-hover'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}