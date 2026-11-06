import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { ProjectLogoImage } from '../../ProjectLogo';

export type ProjectSettingsTabId = 'overview' | 'general' | 'logo';

export interface ProjectSettingsTarget {
  id: string;
  name: string;
  path: string;
  color: string;
  logoPath?: string | null;
  hidden: boolean;
  branchCount: number;
  groupName?: string | null;
}

export interface ProjectSettingsPatch {
  name?: string;
  logoPath?: string | null;
  hidden?: boolean;
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className='flex flex-col gap-3'>
      <div>
        <h4 className='text-[13px] font-semibold text-text-primary'>{title}</h4>
        {description && (
          <p className='mt-0.5 text-xs leading-relaxed text-text-secondary'>{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-divider bg-card-background', className)}>
      {children}
    </div>
  );
}

export function CopyButton({ value, title = 'Copy' }: { value: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      })
      .catch(() => undefined);
  };
  return (
    <button
      type='button'
      onClick={handleCopy}
      title={copied ? 'Copied' : title}
      className='w-7 h-7 shrink-0 rounded-md grid place-items-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer'
    >
      {copied ? <Check className='w-3.5 h-3.5 text-primary' /> : <Copy className='w-3.5 h-3.5' />}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-10 h-[22px] rounded-full shrink-0 cursor-pointer transition-colors',
        checked ? 'bg-primary' : 'bg-white/[0.14]',
      )}
    >
      <span
        className={cn(
          'absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-[18px]',
        )}
      />
    </button>
  );
}

export function ProjectMark({
  name,
  color,
  logoPath,
  size = 64,
}: {
  name: string;
  color: string;
  logoPath?: string | null;
  size?: number;
}) {
  const fallback = (
    <span
      className='w-full h-full grid place-items-center font-semibold uppercase'
      style={{
        color,
        fontSize: Math.round(size * 0.4),
        backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
      }}
    >
      {name.trim().charAt(0) || '?'}
    </span>
  );
  return (
    <span
      className='block shrink-0 overflow-hidden border border-divider bg-white/[0.04]'
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.26) }}
    >
      {logoPath ? (
        <ProjectLogoImage
          path={logoPath}
          side={size * 2}
          className='w-full h-full object-contain'
          fallback={fallback}
        />
      ) : (
        fallback
      )}
    </span>
  );
}