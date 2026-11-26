/**
 * Cột phải của LaunchTargetModal cho target CLI: lệnh sẽ chạy và
 * thông tin chi tiết của phương thức capture đang chọn.
 */

import { AlertTriangle, Check, Gauge, ShieldCheck, Terminal, X } from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import { DetailCard, KV } from '@renderer/components/common/LaunchConfig/detail/DetailBits';

import type { TargetTab } from '@renderer/modules/Emulate/types/target.types';
import { TONE_STYLE, getMethodTone } from './MethodPanel';
import type { CaptureMethodMeta } from './MethodPanel';

interface CliInfoPanelProps {
  target: TargetTab;
  method: CaptureMethodMeta | undefined;
}

const Meter = ({ label, value, barClass }: { label: string; value: number; barClass: string }) => (
  <div className='flex items-center justify-between gap-3'>
    <span className='text-[11px] text-text-secondary'>{label}</span>
    <span className='flex gap-1'>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cn('h-1.5 w-5 rounded-sm', n <= value ? barClass : 'bg-text-secondary/15')} />
      ))}
    </span>
  </div>
);

const PointList = ({ items, kind }: { items: string[]; kind: 'pro' | 'con' }) => (
  <ul className='flex flex-col gap-1.5'>
    {items.map((t) => (
      <li key={t} className='flex items-start gap-2 text-[11px] leading-snug text-text-primary/80'>
        {kind === 'pro' ? (
          <Check className='mt-0.5 h-3 w-3 shrink-0 text-success' />
        ) : (
          <X className='mt-0.5 h-3 w-3 shrink-0 text-error' />
        )}
        <span>{t}</span>
      </li>
    ))}
  </ul>
);

export function CliInfoPanel({ target, method }: CliInfoPanelProps) {
  const command = target.executablePath || target.url || '';
  const program = command.trim().split(/\s+/)[0] || '—';
  const isEbpf = method?.id === 'ebpf';
  const tone = method ? getMethodTone(method.id) : 'success';
  const s = TONE_STYLE[tone];
  const url = target.url && /^https?:\/\//i.test(target.url) ? target.url : undefined;
  const faviconSrc =
    target.platform === 'application'
      ? target.icon
        ? `media://${target.icon}`
        : undefined
      : target.favicon || (url ? getFaviconUrl(url, 32) : undefined);

  return (
    <>
      <div className='flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4'>
        <div className='flex min-w-0 flex-col'>
          <span className='text-sm font-semibold text-text-primary'>Details</span>
          <span className='truncate text-[11px] text-text-secondary'>{method?.description}</span>
        </div>
        {method && (
          <span className={cn('shrink-0 rounded-md px-2 py-1 text-[11px] font-medium', s.chip)}>{method.label}</span>
        )}
      </div>
      <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4'>
        <DetailCard title='Command' icon={Terminal} tone='success'>
          {target.title && (
            <div className='flex items-center justify-between gap-4 border-b border-border/40 py-1.5'>
              <span className='shrink-0 text-[10px] uppercase tracking-wide text-text-secondary'>Name</span>
              <span className='flex min-w-0 items-center gap-1.5 text-[11px] text-text-primary'>
                <Favicon url={faviconSrc} size={14} className='rounded-sm' />
                <span className='truncate'>{target.title}</span>
              </span>
            </div>
          )}
          {url && <KV label='URL' value={url} mono copy />}
          <KV label='Program' value={program} mono copy />
          <KV label='Command line' value={command || '—'} mono copy />
        </DetailCard>

        {method?.implemented === false && (
          <DetailCard title='Not available yet' icon={AlertTriangle} tone='warn'>
            <p className='text-[11px] leading-snug text-text-secondary'>
              This method is listed for reference. The launch backend is not implemented yet, so it cannot be started.
            </p>
          </DetailCard>
        )}

        {method?.ratings && (
          <DetailCard title='Overview' icon={Gauge} tone={tone === 'error' ? 'error' : tone}>
            <div className='flex flex-col gap-2'>
              <Meter label='Data quality' value={method.ratings.dataQuality} barClass={s.bar} />
              <Meter label='Auth compatibility' value={method.ratings.authCompat} barClass={s.bar} />
              <Meter label='Complexity' value={method.ratings.complexity} barClass='bg-warn' />
            </div>
            {method.limitations && (
              <p className='rounded-lg bg-background/60 px-3 py-2 text-[11px] leading-snug text-text-secondary'>
                {method.limitations}
              </p>
            )}
          </DetailCard>
        )}

        {method?.pros && method.pros.length > 0 && (
          <DetailCard title='Strengths' icon={Check} tone='success'>
            <PointList items={method.pros} kind='pro' />
          </DetailCard>
        )}

        {method?.cons && method.cons.length > 0 && (
          <DetailCard title='Trade-offs' icon={X} tone='error'>
            <PointList items={method.cons} kind='con' />
          </DetailCard>
        )}

        {isEbpf && (
          <DetailCard title='eBPF requirements' icon={ShieldCheck} tone='info'>
            <KV label='Kernel' value='Linux 4.18+' />
            <KV label='Privilege' value='root (sudo)' />
            <KV label='Tool' value='ecapture' mono />
            <KV label='Attach' value='By PID of the spawned process' />
          </DetailCard>
        )}
      </div>
    </>
  );
}

export default CliInfoPanel;