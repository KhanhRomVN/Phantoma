import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import type { BackupCode, ServiceLink } from '../../../../shared/types';
import { formatDateTime } from '../../../../shared/utils/format.util';
import { SERVICE_STATUS } from '../../../services';
import { TOTP_PERIOD, useTotp } from '../../../security';

export function Capability({
  icon: Icon,
  ok,
  title,
  activeClass,
  onClick,
}: {
  icon: LucideIcon;
  ok: boolean;
  title: React.ReactNode;
  activeClass: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip content={title} side="top">
      <span
        onClick={(e) => {
          if (!onClick) return;
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-md',
          onClick && 'cursor-pointer transition-opacity hover:opacity-80',
          ok ? activeClass : 'bg-text-secondary/10 text-text-secondary/40',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    </Tooltip>
  );
}

export function BackupTip({ codes }: { codes: BackupCode[] }) {
  const left = codes.filter((c) => !c.used);
  if (left.length === 0) return <span className="text-[11px]">No backup codes left</span>;
  const shown = left.length > 4 ? left.slice(0, 3) : left;
  const more = left.length - shown.length;
  const CHIP = 'rounded-md bg-text-secondary/15 px-2 py-1 text-center text-[11px]';
  return (
    <div className="grid grid-cols-2 gap-1">
      {shown.map((c, i) => (
        <span key={`${c.code}-${i}`} className={cn(CHIP, 'font-mono')}>
          {c.code}
        </span>
      ))}
      {more > 0 && <span className={cn(CHIP, 'opacity-70')}>+{more} more...</span>}
    </div>
  );
}

export function SimpleTotp({ secret }: { secret: string }) {
  const { code, remaining, invalid } = useTotp(secret);
  if (invalid || !code) return <span className="text-[11px]">Invalid secret</span>;
  const low = remaining <= 5;
  return (
    <div className="flex min-w-[120px] flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm font-semibold tracking-widest">
          {code.slice(0, 3)} {code.slice(3)}
        </span>
        <span className={cn('text-[11px] tabular-nums', low ? 'text-error' : 'opacity-70')}>
          {remaining}s
        </span>
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-text-secondary/20">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-1000 ease-linear',
            low ? 'bg-error' : 'bg-primary',
          )}
          style={{ width: `${(remaining / TOTP_PERIOD) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function ServiceDetail({ s }: { s: ServiceLink }) {
  return (
    <div className="flex max-w-[280px] flex-col gap-0.5 text-[11px]">
      <span className="font-medium">{s.name}</span>
      <span>{SERVICE_STATUS[s.status].label}</span>
      {s.statusNote && <span>{s.statusNote}</span>}
      <span>Linked {formatDateTime(s.linkedAt)}</span>
      {s.customFields.map((f, i) => (
        <div key={`${f.key}-${i}`} className="flex min-w-0 items-start gap-1.5">
          <span className="shrink-0 opacity-70">{f.key}:</span>
          {f.kind === 'totp' && f.value ? (
            <SimpleTotp secret={f.value} />
          ) : f.kind === 'backup' ? (
            <span>{f.value.split('\n').filter(Boolean).length} codes</span>
          ) : (
            <span className="min-w-0 break-all font-mono">{f.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}
