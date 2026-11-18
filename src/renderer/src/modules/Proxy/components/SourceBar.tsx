import { useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Check, ExternalLink, Gauge, HardDrive, Layers, Pencil, Plus, ServerOff, TimerReset, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@renderer/utils/cn';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import type { ProxySource, SourceStats, Tone } from '../types';
import { TONE_CLASS } from '../constants/proxy';
import { SOURCE_TYPE } from '../constants/source';
import { timeAgo } from '../utils/format';

interface SourceBarProps {
  sources: ProxySource[];
  activeId: string;
  stats: Record<string, SourceStats>;
  onChange: (id: string) => void;
  actions?: ReactNode;
  onAddSource?: () => void;
  onEditSource?: (id: string) => void;
  onDeleteSource?: (id: string) => void;
}

function isProtectedSource(source: ProxySource): boolean {
  if (source.type === 'vpn') return source.vpn !== null && source.name === source.vpn.label; // ASSUMED: the seeded vpn source is named after its provider label (vpn.service ensureDefaults); extra accounts have other names
  return source.provider?.toLowerCase() === 'warp' || source.name?.toLowerCase() === 'default'; // ASSUMED: API sources may omit provider/name
}

const EMPTY_STATS: SourceStats = { healthy: 0, dead: 0, avgLatency: 0, quotaUsedGb: 0, quotaTotalGb: 0, expiring: 0 };

function SourceIcon({ source, size, className }: { source: ProxySource; size: number; className?: string }) {
  const Fallback = SOURCE_TYPE[source.type].icon;
  return (
    <Favicon
      url={source.url ? getFaviconUrl(source.url, 64) : undefined}
      size={size}
      className={cn('shrink-0 rounded-sm', className)}
      fallbackIcon={<Fallback className='shrink-0 text-text-secondary' style={{ width: size, height: size }} />}
    />
  );
}

function StatTile({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className='flex min-w-0 flex-col gap-0.5 rounded-lg bg-background/60 px-2.5 py-1.5'>
      <span className='flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-text-secondary'>
        <Icon className='h-3 w-3' />
        {label}
      </span>
      <span className='flex items-center gap-1.5 text-sm font-semibold tabular-nums text-text-primary'>
        {tone && <span className={cn('h-1.5 w-1.5 rounded-full', TONE_CLASS[tone].dot)} />}
        {value}
      </span>
    </div>
  );
}

function SourceTip({ source, stats }: { source: ProxySource; stats: SourceStats }) {
  const status = source.online ? TONE_CLASS.success : TONE_CLASS.muted;
  const type = SOURCE_TYPE[source.type];
  const has = source.count > 0;
  const quota = stats.quotaTotalGb ? `${Math.round((stats.quotaUsedGb / stats.quotaTotalGb) * 100)}%` : '—';
  return (
    <div className='flex w-[360px] flex-col text-left'>
      <div className='bg-tooltip-background px-3 py-2.5'>
        <div className='flex items-center gap-2.5'>
          <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-text-secondary/10'>
            <SourceIcon source={source} size={18} />
          </span>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <span className='truncate text-xs font-semibold text-text-primary'>{source.name}</span>
            <span className='flex items-center gap-1.5 text-[10px] text-text-secondary'>
              <span className={cn('flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium', status.pill)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                {source.online ? 'Online' : 'Offline'}
              </span>
              <span className={cn('rounded-md px-1.5 py-0.5 font-medium', TONE_CLASS[type.tone].pill)}>{type.label}</span>
              Synced {timeAgo(source.lastSync)}
            </span>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-3 gap-1.5 px-2.5 pb-2.5'>
        <StatTile icon={Layers} label='Proxies' value={source.count} />
        <StatTile icon={Check} label='Healthy' value={stats.healthy} tone={stats.healthy > 0 ? 'success' : undefined} />
        <StatTile icon={Gauge} label='Avg latency' value={has && stats.avgLatency ? `${stats.avgLatency} ms` : '—'} />
        <StatTile icon={ServerOff} label='Dead' value={stats.dead} tone={stats.dead > 0 ? 'error' : undefined} />
        <StatTile icon={HardDrive} label='Bandwidth' value={quota} tone={stats.quotaTotalGb ? 'warn' : undefined} />
        <StatTile icon={TimerReset} label='Expiring' value={stats.expiring} tone={stats.expiring > 0 ? 'warn' : undefined} />
      </div>

      <div className='mx-2.5 mb-2.5 flex items-center gap-2 rounded-lg bg-background/60 px-2.5 py-1.5'>
        <ExternalLink className='h-3.5 w-3.5 shrink-0 text-text-secondary' />
        <span className='truncate font-mono text-[10px] text-text-secondary'>{source.url || 'No website'}</span>
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  onContextMenu,
  tip,
  source,
}: {
  active: boolean;
  onClick: () => void;
  onContextMenu?: (e: MouseEvent) => void;
  tip?: ReactNode;
  source: ProxySource;
}) {
  const button = (
    <button
      type='button'
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'relative isolate flex items-center gap-2 whitespace-nowrap rounded-[5px] px-3 py-1.5 text-xs transition-colors',
        active ? 'text-text-primary' : 'text-text-secondary hover:bg-text-secondary/10 hover:text-text-primary',
      )}
    >
      {active && (
        <motion.span
          layoutId='proxy-source-pill'
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className='absolute inset-0 -z-10 rounded-[5px] bg-card-background shadow-sm'
        />
      )}
      <SourceIcon source={source} size={14} />
      <span className='font-medium'>{source.name}</span>
      <span className='flex items-center gap-1 rounded-md bg-text-secondary/15 px-1.5 text-[10px] tabular-nums text-text-secondary'>
        {source.count}
        <span className={cn('h-1.5 w-1.5 rounded-full', SOURCE_TYPE[source.type].dot)} />
      </span>
    </button>
  );
  return tip ? (
    <Tooltip content={tip} side='bottom' contentClassName='max-w-none overflow-hidden rounded-xl p-0'>
      {button}
    </Tooltip>
  ) : (
    button
  );
}

export function SourceBar({
  sources,
  activeId,
  stats,
  onChange,
  actions,
  onAddSource,
  onEditSource,
  onDeleteSource,
}: SourceBarProps) {
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const menuSource = menu ? (sources.find((s) => s.id === menu.id) ?? null) : null;

  return (
    <div className='relative flex items-center gap-3'>
      <span className='shrink-0 text-xs font-medium text-text-secondary'>Source:</span>
      <div className='flex min-w-0 flex-1'>
        <div className='inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md bg-text-secondary/10 p-0.5'>
          {sources.map((s) => (
            <Tab
              key={s.id}
              active={activeId === s.id}
              onClick={() => onChange(s.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ id: s.id, top: e.clientY, left: e.clientX });
              }}
              tip={menu?.id === s.id ? undefined : <SourceTip source={s} stats={stats[s.id] ?? EMPTY_STATS} />}
              source={s}
            />
          ))}
          <Tooltip content='Add source' side='bottom'>
            <button
              type='button'
              onClick={onAddSource}
              className='flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-text-secondary transition-colors hover:bg-text-secondary/10 hover:text-text-primary'
            >
              <Plus className='h-3.5 w-3.5' />
            </button>
          </Tooltip>
        </div>
      </div>
      {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}

      <Dropdown
        className='absolute'
        open={menu !== null}
        onOpenChange={(o) => {
          if (!o) setMenu(null);
        }}
        strategy='fixed'
        position={menu ? { top: menu.top, left: menu.left } : undefined}
        width={190}
      >
        <DropdownTrigger asChild>
          <span className='block h-0 w-0' />
        </DropdownTrigger>
        <DropdownContent>
          {menuSource && (
            <>
              <DropdownItem
                icon={<ExternalLink className='h-3.5 w-3.5' />}
                onClick={() => menuSource.url && window.open(menuSource.url, '_blank')}
              >
                Open website
              </DropdownItem>
              <DropdownItem icon={<Pencil className='h-3.5 w-3.5' />} onClick={() => onEditSource?.(menuSource.id)}>
                Edit source
              </DropdownItem>
              {!isProtectedSource(menuSource) && (
                <>
                  <DropdownSeparator />
                  <DropdownItem
                    variant='error'
                    icon={<Trash2 className='h-3.5 w-3.5' />}
                    onClick={() => onDeleteSource?.(menuSource.id)}
                  >
                    Delete source
                  </DropdownItem>
                </>
              )}
            </>
          )}
        </DropdownContent>
      </Dropdown>
    </div>
  );
}

export default SourceBar;