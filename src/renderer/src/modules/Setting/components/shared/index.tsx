import React, { createContext, useContext } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';

export type Tone =
  | 'primary'
  | 'success'
  | 'warn'
  | 'error'
  | 'info'
  | 'muted'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'teal'
  | 'violet'
  | 'yellow';

export const TONE: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warn: 'bg-warn/10 text-warn',
  error: 'bg-error/10 text-error',
  info: 'bg-info/10 text-info',
  muted: 'bg-text-secondary/10 text-text-secondary',
  blue: 'bg-blue/10 text-blue',
  purple: 'bg-purple/10 text-purple',
  pink: 'bg-pink/10 text-pink',
  teal: 'bg-teal/10 text-teal',
  violet: 'bg-violet/10 text-violet',
  yellow: 'bg-yellow/10 text-yellow',
};

export const BAR: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warn: 'bg-warn',
  error: 'bg-error',
  info: 'bg-info',
  muted: 'bg-text-secondary',
  blue: 'bg-blue',
  purple: 'bg-purple',
  pink: 'bg-pink',
  teal: 'bg-teal',
  violet: 'bg-violet',
  yellow: 'bg-yellow',
};

export const TEXT: Record<Tone, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warn: 'text-warn',
  error: 'text-error',
  info: 'text-info',
  muted: 'text-text-secondary',
  blue: 'text-blue',
  purple: 'text-purple',
  pink: 'text-pink',
  teal: 'text-teal',
  violet: 'text-violet',
  yellow: 'text-yellow',
};

export const BORDER: Record<Tone, string> = {
  primary: 'border-primary/40',
  success: 'border-success/40',
  warn: 'border-warn/40',
  error: 'border-error/40',
  info: 'border-info/40',
  muted: 'border-text-secondary/30',
  blue: 'border-blue/40',
  purple: 'border-purple/40',
  pink: 'border-pink/40',
  teal: 'border-teal/40',
  violet: 'border-violet/40',
  yellow: 'border-yellow/40',
};

export const GLOW: Record<Tone, string> = {
  primary: 'bg-primary/20',
  success: 'bg-success/20',
  warn: 'bg-warn/20',
  error: 'bg-error/20',
  info: 'bg-info/20',
  muted: 'bg-text-secondary/15',
  blue: 'bg-blue/20',
  purple: 'bg-purple/20',
  pink: 'bg-pink/20',
  teal: 'bg-teal/20',
  violet: 'bg-violet/20',
  yellow: 'bg-yellow/20',
};

export const TabToneContext = createContext<{ tone: Tone; icon?: LucideIcon }>({ tone: 'primary' });

export const INPUT_CLASS =
  'h-8 rounded-md border border-border bg-input-background px-2.5 text-[12.5px] text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary/60';

export const Badge: React.FC<{ tone?: Tone; className?: string; children: React.ReactNode }> = ({
  tone = 'muted',
  className,
  children,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
      TONE[tone],
      className,
    )}
  >
    {children}
  </span>
);

export const IconChip: React.FC<{
  tone?: Tone;
  solid?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ tone = 'primary', solid, className, children }) => (
  <span
    className={cn(
      'flex shrink-0 items-center justify-center rounded-lg',
      solid ? cn(BAR[tone], 'text-white') : TONE[tone],
      className ?? 'h-7 w-7',
    )}
  >
    {children}
  </span>
);

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => {
  const { tone, icon: Icon } = useContext(TabToneContext);
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <IconChip tone={tone} className="h-10 w-10 rounded-xl">
            <Icon className="h-5 w-5" />
          </IconChip>
        )}
        <div className="min-w-0">
          <h2 className="m-0 text-lg font-semibold tracking-tight text-text-primary">{title}</h2>
          {description && (
            <p className="m-0 mt-0.5 text-[12.5px] text-text-secondary">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
};

export const Section: React.FC<{
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, description, icon, tone, action, className, bodyClassName, children }) => {
  const ctx = useContext(TabToneContext);
  const t = tone ?? ctx.tone;
  return (
    <section
      className={cn('mb-4 overflow-hidden rounded-xl border border-border bg-card-background', className)}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && <IconChip tone={t}>{icon}</IconChip>}
            <div className="min-w-0">
              <h3 className="m-0 text-[13px] font-semibold text-text-primary">{title}</h3>
              {description && (
                <p className="m-0 mt-0.5 text-[11.5px] text-text-secondary">{description}</p>
              )}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className={cn('divide-y divide-border/60', bodyClassName)}>{children}</div>
    </section>
  );
};

export const Row: React.FC<{
  label: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}> = ({ label, description, children, className }) => (
  <div className={cn('flex items-center justify-between gap-6 px-4 py-3', className)}>
    <div className="min-w-0">
      <div className="text-[12.5px] font-medium text-text-primary">{label}</div>
      {description && (
        <div className="mt-0.5 text-[11.5px] leading-relaxed text-text-secondary">{description}</div>
      )}
    </div>
    {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
  </div>
);

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  tone?: Tone;
}> = ({ checked, onChange, disabled, tone }) => {
  const ctx = useContext(TabToneContext);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked ? BAR[tone ?? ctx.tone] : 'bg-text-secondary/25',
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-4',
        )}
      />
    </button>
  );
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone,
}: {
  options: { id: T; label: string; icon?: React.ReactNode; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  tone?: Tone;
}) {
  const ctx = useContext(TabToneContext);
  const t = tone ?? ctx.tone;
  return (
    <div className="inline-flex gap-0.5 rounded-lg bg-text-secondary/10 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'inline-flex h-6 items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-medium outline-none transition-colors',
            value === o.id
              ? cn('bg-card-background shadow-sm', TEXT[t])
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {o.icon}
          {o.label}
          {o.count !== undefined && <span className="opacity-50">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(INPUT_CLASS, 'min-w-[140px] cursor-pointer pr-6', className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export const SoftButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }
> = ({ tone = 'primary', className, children, ...props }) => (
  <button
    type="button"
    {...props}
    className={cn(
      'inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      TONE[tone],
      'hover:brightness-125 active:brightness-90',
      className,
    )}
  >
    {children}
  </button>
);

export const StatTile: React.FC<{
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  progress?: number;
}> = ({ label, value, hint, icon, tone = 'primary', progress }) => (
  <div className="relative overflow-hidden rounded-xl border border-border bg-card-background p-3.5">
    <div className={cn('pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full blur-2xl', GLOW[tone])} />
    <div className="relative flex items-center justify-between">
      <span className="text-[11.5px] text-text-secondary">{label}</span>
      {icon && (
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE[tone])}>
          {icon}
        </span>
      )}
    </div>
    <div className="relative mt-1.5 text-xl font-semibold tracking-tight text-text-primary">{value}</div>
    {progress !== undefined && (
      <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-text-secondary/15">
        <div
          className={cn('h-full rounded-full transition-all', BAR[tone])}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    )}
    {hint && <div className="relative mt-1.5 text-[11px] text-text-secondary">{hint}</div>}
  </div>
);

export const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-background px-1.5 font-mono text-[10.5px] text-text-secondary">
    {children}
  </kbd>
);

export const Dot: React.FC<{ tone?: Tone; pulse?: boolean }> = ({ tone = 'success', pulse }) => (
  <span className={cn('h-1.5 w-1.5 rounded-full', BAR[tone], pulse && 'animate-pulse')} />
);