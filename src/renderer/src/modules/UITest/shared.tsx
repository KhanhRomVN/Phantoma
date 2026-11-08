import React from 'react';
import { cn } from '@renderer/utils/cn';
import Checkbox from '@renderer/components/ui/Checkbox/Checkbox';

export const CANCEL_BUTTON_CLASS =
  'bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background';

interface PanelProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function Panel({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: PanelProps) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-lg border border-border bg-card-background',
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-center gap-3 border-b border-divider px-4 py-2.5">
          <div className="min-w-0 flex-1">
            {title && <h3 className="truncate text-sm font-semibold text-text-primary">{title}</h3>}
            {description && <p className="truncate text-xs text-text-secondary">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn('min-h-0 flex-1 p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </span>
      {children}
    </div>
  );
}

interface SegmentedProps<T extends string | number> {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md bg-background p-0.5">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'cursor-pointer rounded px-2 py-1 text-[11px] font-medium outline-none transition-colors',
            option === value
              ? 'bg-primary/20 text-primary'
              : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
          )}
        >
          {String(option)}
        </button>
      ))}
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-text-primary">
      <Checkbox size="sm" checked={checked} onChange={onChange} />
      <span className="cursor-pointer select-none" onClick={() => onChange(!checked)}>
        {label}
      </span>
    </div>
  );
}

export function Stage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[120px] items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface JsxPreviewProps {
  name: string;
  props: Record<string, unknown>;
  text?: string;
}

const formatAttr = ([key, value]: [string, unknown]) => {
  if (value === true) return key;
  if (typeof value === 'string') return `${key}="${value}"`;
  return `${key}={${JSON.stringify(value)}}`;
};

export function JsxPreview({ name, props, text }: JsxPreviewProps) {
  const attrs = Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== false && value !== '')
    .map(formatAttr);
  const open = attrs.length ? `<${name}\n  ${attrs.join('\n  ')}\n>` : `<${name}>`;
  const code =
    text !== undefined ? `${open}\n  ${text}\n</${name}>` : open.replace(/>$/, '/>');

  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 font-mono text-[11px] leading-5 text-text-secondary">
      {code}
    </pre>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Panel title={title} description={description}>
      <div className="flex flex-col gap-4">{children}</div>
    </Panel>
  );
}

export function Demo({
  label,
  column = false,
  children,
}: {
  label: string;
  column?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Field label={label}>
      <div className={column ? 'flex flex-col gap-2' : 'flex flex-wrap items-center gap-2'}>
        {children}
      </div>
    </Field>
  );
}