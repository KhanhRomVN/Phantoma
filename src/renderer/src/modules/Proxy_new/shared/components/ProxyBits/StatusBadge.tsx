import { cn } from '@renderer/utils/cn';
import { PROXY_STATUS } from '../../constants/proxy-meta.constants';
import { TONE_CLASS } from '../../constants/tone.constants';
import type { ProxyStatus } from '../../types/proxy-domain.types';

export function StatusBadge({ status }: { status: ProxyStatus }) {
  const s = PROXY_STATUS[status];
  const t = TONE_CLASS[s.tone];
  const live = status === 'healthy' || status === 'testing';
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium', t.pill)}>
      <span className='relative flex h-1.5 w-1.5'>
        {live && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', t.dot)} />}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', t.dot)} />
      </span>
      {s.label}
    </span>
  );
}
