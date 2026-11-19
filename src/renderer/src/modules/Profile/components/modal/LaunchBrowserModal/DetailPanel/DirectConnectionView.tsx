import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../constants/tone';
import type { IpInfo } from '@renderer/services/ip-lookup.service';
import { flagEmoji } from '../../../../utils/proxy';
import { IpInfoBlocks } from './IpInfoBlocks';

export function DirectConnectionView({ info }: { info: IpInfo }) {
  return (
    <div className='flex flex-col gap-3'>
      <div className='relative overflow-hidden rounded-xl bg-card-background p-4'>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 opacity-60'
          style={{ background: 'radial-gradient(90% 120% at 0% 0%, hsl(150 70% 45% / 0.16), transparent 70%)' }}
        />
        <div className='relative flex items-center gap-3'>
          <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background text-2xl'>{flagEmoji(info.countryCode)}</span>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <span className='truncate text-sm font-semibold text-text-primary'>Direct connection</span>
            <span className='truncate font-mono text-[11px] text-text-secondary'>{info.ip}</span>
          </div>
        </div>
        <div className='relative mt-3 flex flex-wrap items-center gap-1.5'>
          <span className='rounded-md bg-text-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary'>No proxy</span>
          {info.hosting && <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', TONE_CLASS.warn.pill)}>Hosting</span>}
          {(info.proxy || info.vpn || info.tor) && <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', TONE_CLASS.warn.pill)}>Proxy / VPN detected</span>}
          {info.mobile && <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', TONE_CLASS.info.pill)}>Mobile</span>}
        </div>
      </div>
      <IpInfoBlocks info={info} />
    </div>
  );
}

export default DirectConnectionView;