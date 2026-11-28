import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import { toastService } from '@renderer/components/ui/Toast';
import { TONE_CLASS } from '../../../../../../shared/constants/tone.constants';
import { CopyTextProps, SectionProps } from './overview-tab.types';

export function CopyText({
  value,
  children,
  mono = false,
  className,
  label = 'Click to copy',
}: CopyTextProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
      toastService.show({ variant: 'error', title: 'Cannot copy to clipboard' });
    }
  };
  return (
    <Tooltip content={copied ? 'Copied' : label} side="top">
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          'min-w-0 truncate text-left transition-colors',
          mono && 'font-mono',
          copied ? 'text-success' : 'hover:text-primary',
          className,
        )}
      >
        {children ?? value}
      </button>
    </Tooltip>
  );
}

export function Section({ title, icon: Icon, tone = 'muted', action, className, children }: SectionProps) {
  return (
    <section className={cn('group/section rounded-md bg-card-background', className)}>
      <header className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
          {Icon && (
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-md',
                TONE_CLASS[tone].icon,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          {title}
        </div>
        {action}
      </header>
      <div className="px-3.5 pb-3.5">{children}</div>
    </section>
  );
}

export function CredRow({
  label,
  children,
  focusId,
}: {
  label: string;
  children?: ReactNode;
  focusId?: string;
}) {
  return (
    <div
      data-focus={focusId}
      className="flex min-h-[38px] items-center justify-between gap-3 border-b border-border/40 py-1.5 last:border-b-0"
    >
      <span className="shrink-0 text-[13px] text-text-secondary">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-[13px] text-text-primary">
        {children}
      </div>
    </div>
  );
}

export function CredInput({
  value,
  onChange,
  placeholder,
  mono,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  mono?: boolean;
  error?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      placeholder={placeholder}
      className={cn(
        'h-7 w-full max-w-[240px] rounded-md border border-dashed bg-background/30 px-2 text-right text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-secondary/50',
        error ? 'border-error focus:border-error' : 'border-primary focus:border-primary',
        mono && 'font-mono',
      )}
    />
  );
}
