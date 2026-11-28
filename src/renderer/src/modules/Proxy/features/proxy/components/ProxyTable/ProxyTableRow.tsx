import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@renderer/utils/cn';
import { Checkbox } from '@renderer/components/ui/Checkbox';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import { COUNTRY_NAME } from '../../../../shared/constants/proxy-meta.constants';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import type { Proxy, ProxyStatus } from '../../../../shared/types/proxy-domain.types';
import { daysLeft, latencyTone, successTone, timeAgo } from '../../../../shared/utils/format';
import {
  FlagBadge,
  KindIcon,
  KindTag,
  LatencyMeter,
  ProtocolTag,
  QuotaBar,
  Sparkline,
  StatusBadge,
  UserStack,
} from '../../../../shared/components/ProxyBits';
import { ROW_TEXTURE, TD } from './proxy-table.styles';

function Expiry({ iso }: { iso: string | null }) {
  const d = daysLeft(iso);
  if (d === null) return <span className='text-text-secondary'>No expiry</span>;
  if (d < 0) return <span className={TONE_CLASS.error.text}>Expired</span>;
  if (d <= 7) return <span className={TONE_CLASS.warn.text}>{d}d left</span>;
  return <span className='text-text-secondary'>{d}d left</span>;
}

interface ProxyTableRowProps {
  proxy: Proxy;
  /** Effective status: `testing` while a test is running, otherwise the proxy's own status. */
  status: ProxyStatus;
  rowIndex: number;
  selected: boolean;
  menuOpen: boolean;
  checked: boolean;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onOpenMenu: (id: string, position: { top: number; left: number }) => void;
}

export function ProxyTableRow({
  proxy: p,
  status,
  rowIndex,
  selected,
  menuOpen,
  checked,
  onSelect,
  onToggleCheck,
  onOpenMenu,
}: ProxyTableRowProps) {
  const unchecked = status === 'unchecked';
  return (
    <motion.tr
      layout='position'
      transition={{ layout: { duration: 0.22, ease: 'easeOut' } }}
      onClick={() => onSelect(p.id)}
      onContextMenu={(e: MouseEvent) => {
        e.preventDefault();
        onOpenMenu(p.id, { top: e.clientY, left: e.clientX });
      }}
      style={{
        ...ROW_TEXTURE[status],
        animationDelay: `${Math.min(rowIndex, 8) * 20}ms`,
        animationFillMode: 'backwards',
      }}
      className={cn(
        'animate-in fade-in-0 duration-200 cursor-pointer border-b border-border transition-colors hover:bg-table-row-hover',
        selected && 'bg-text-secondary/10 hover:bg-text-secondary/15',
        menuOpen && 'bg-text-secondary/10',
        status === 'dead' && 'opacity-70',
      )}
    >
      <td className={cn(TD, 'relative')}>

        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox size='sm' checked={checked} onChange={() => onToggleCheck(p.id)} />
        </div>
      </td>
      <td className={TD}>
        <div className='flex items-center gap-2.5'>
          <KindIcon kind={p.kind} size={30} />
          <div className='min-w-0'>
            <div className='truncate font-medium text-text-primary'>{p.name}</div>
            <div className='truncate font-mono text-[11px] text-text-secondary'>
              {p.host}:{p.port}
            </div>
          </div>
        </div>
      </td>
      <td className={TD}>
        <StatusBadge status={status} />
      </td>
      <td className={TD}>
        <div className='flex flex-col items-start gap-1'>
          <ProtocolTag protocol={p.protocol} />
          <KindTag kind={p.kind} />
        </div>
      </td>
      <td className={TD}>
        {p.country ? (
          <div className='flex flex-col gap-0.5'>
            <FlagBadge code={p.country} city={p.city} />
            <span className='truncate pl-[26px] text-[11px] text-text-secondary'>
              {COUNTRY_NAME[p.country] ?? p.country}
              {p.isp ? ` • ${p.isp}` : ''}
            </span>
          </div>
        ) : (
          <span className='text-text-secondary'>—</span>
        )}
      </td>
      <td className={TD}>
        <LatencyMeter ms={status === 'testing' ? null : p.latencyMs} />
      </td>
      <td className={TD}>
        {unchecked ? (
          <span className='text-text-secondary'>—</span>
        ) : (
          <div className='flex min-w-[64px] flex-col gap-1'>
            <span className={cn('tabular-nums font-medium', TONE_CLASS[successTone(p.successRate)].text)}>
              {p.successRate}%
            </span>
            <div className='h-1 w-full overflow-hidden rounded-full bg-text-secondary/15'>
              <div
                className={cn('h-full rounded-full', TONE_CLASS[successTone(p.successRate)].bar)}
                style={{ width: `${p.successRate}%` }}
              />
            </div>
          </div>
        )}
      </td>
      <td className={TD}>
        {unchecked ? (
          <span className='text-text-secondary'>—</span>
        ) : (
          <Tooltip side='top' content={<span className='text-[11px]'>Checked {timeAgo(p.lastChecked)}</span>}>
            <div>
              <Sparkline values={p.latencyHistory} tone={latencyTone(p.latencyMs)} height={20} />
            </div>
          </Tooltip>
        )}
      </td>
      <td className={TD}>
        <QuotaBar used={p.quotaUsedGb} total={p.quotaTotalGb} />
      </td>
      <td className={cn(TD, 'whitespace-nowrap')}>
        <Expiry iso={p.expiresAt} />
      </td>
      <td className={cn(TD, 'w-full')}>
        <UserStack names={p.usedBy} />
      </td>
    </motion.tr>
  );
}
