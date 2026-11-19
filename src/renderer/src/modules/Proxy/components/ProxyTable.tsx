import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowDown, ArrowUp, ArrowUpDown, Copy, Link2, Plus, ServerOff, Trash2 } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Checkbox } from '@renderer/components/ui/Checkbox';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import type { Proxy, ProxyStatus } from '../types';
import { COUNTRY_NAME, TONE_CLASS } from '../constants/proxy';
import { buildProxyUrl, daysLeft, latencyTone, successTone, timeAgo } from '../utils/format';
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
} from './common/ProxyBits';

interface ProxyTableProps {
  proxies: Proxy[];
  selectedId: string | null;
  checkedIds: Set<string>;
  testingIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onTest: (proxy: Proxy) => void;
  onDelete: (proxy: Proxy) => void;
  filteredOut?: boolean;
  onClearFilters?: () => void;
  onAdd?: () => void;
}

type SortKey = 'name' | 'status' | 'latency' | 'success' | 'expiry';
interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

const STATUS_RANK: Record<ProxyStatus, number> = { healthy: 0, testing: 1, degraded: 2, dead: 3, unchecked: 4 };
const TH = 'whitespace-nowrap px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-text-secondary';
const TD = 'px-3 py-2.5 align-middle text-text-primary';
const COLS = 11;

const ROW_TEXTURE: Partial<Record<ProxyStatus, CSSProperties>> = {
  degraded: {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 7px, rgba(250,204,21,0.09) 7px 8px)',
  },
  dead: {
    backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 7px, rgba(248,113,113,0.1) 7px 8px)',
  },
  testing: {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 7px, rgba(96,165,250,0.09) 7px 8px)',
  },
  unchecked: {
    backgroundImage: 'radial-gradient(rgba(148,163,184,0.22) 1px, transparent 1.2px)',
    backgroundSize: '9px 9px',
  },
};

function sortValue(p: Proxy, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return p.name;
    case 'status':
      return STATUS_RANK[p.status];
    case 'latency':
      return p.latencyMs ?? 999999;
    case 'success':
      return p.successRate;
    case 'expiry':
      return daysLeft(p.expiresAt) ?? 999999;
  }
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  return (a as number) - (b as number);
}

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
}) {
  const dir = sort?.key === sortKey ? sort.dir : null;
  const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <th className={TH}>
      <button
        type='button'
        onClick={() => onSort(sortKey)}
        className={cn('inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-text-primary', dir && 'text-text-primary')}
      >
        {label}
        <Icon className={cn('h-3 w-3', dir === 'asc' && 'text-info', dir === 'desc' && 'text-error', !dir && 'opacity-40')} />
      </button>
    </th>
  );
}

function Expiry({ iso }: { iso: string | null }) {
  const d = daysLeft(iso);
  if (d === null) return <span className='text-text-secondary'>No expiry</span>;
  if (d < 0) return <span className={TONE_CLASS.error.text}>Expired</span>;
  if (d <= 7) return <span className={TONE_CLASS.warn.text}>{d}d left</span>;
  return <span className='text-text-secondary'>{d}d left</span>;
}

export function ProxyTable({
  proxies,
  selectedId,
  checkedIds,
  testingIds,
  onSelect,
  onToggleCheck,
  onToggleAll,
  onTest,
  onDelete,
  filteredOut = false,
  onClearFilters,
  onAdd,
}: ProxyTableProps) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);

  const allChecked = proxies.length > 0 && proxies.every((p) => checkedIds.has(p.id));

  const rows = useMemo(() => {
    const now = Date.now();
    // failing but not expired (expiry unknown or still in the future) needs attention, so it always floats to the top
    const urgent = (p: Proxy): number => (p.status === 'dead' && !(p.expiresAt && Date.parse(p.expiresAt) <= now) ? 0 : 1);
    const f = sort ? (sort.dir === 'asc' ? 1 : -1) : 0;
    return [...proxies].sort((a, b) => urgent(a) - urgent(b) || (sort ? f * compare(sortValue(a, sort.key), sortValue(b, sort.key)) : 0));
  }, [proxies, sort]);

  const menuProxy = menu ? (proxies.find((p) => p.id === menu.id) ?? null) : null;

  const toggleSort = (key: SortKey): void =>
    setSort((prev) => (!prev || prev.key !== key ? { key, dir: 'asc' } : prev.dir === 'asc' ? { key, dir: 'desc' } : null));

  return (
    <div className='relative min-h-0 flex-1 overflow-auto rounded-md bg-card-background'>
      <table className={cn('w-full border-collapse text-xs', rows.length === 0 && 'h-full')}>
        <thead className='sticky top-0 z-10 bg-table-header-background'>
          <tr>
            <th className={cn(TH, 'w-9')}>
              <Checkbox size='sm' checked={allChecked} onChange={onToggleAll} />
            </th>
            <SortableTh label='Proxy' sortKey='name' sort={sort} onSort={toggleSort} />
            <SortableTh label='Status' sortKey='status' sort={sort} onSort={toggleSort} />
            <th className={TH}>Type</th>
            <th className={TH}>Location</th>
            <SortableTh label='Latency' sortKey='latency' sort={sort} onSort={toggleSort} />
            <SortableTh label='Success' sortKey='success' sort={sort} onSort={toggleSort} />
            <th className={TH}>Trend 24h</th>
            <th className={TH}>Bandwidth</th>
            <SortableTh label='Expires' sortKey='expiry' sort={sort} onSort={toggleSort} />
            <th className={cn(TH, 'w-full')}>Used by</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLS} className='align-middle'>
                <div className='flex flex-col items-center gap-3 py-16 text-center'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-text-secondary/10 text-text-secondary'>
                    <ServerOff className='h-5 w-5' />
                  </div>
                  <div>
                    <div className='text-sm font-medium text-text-primary'>
                      {filteredOut ? 'No proxies match your filters' : 'No proxies yet'}
                    </div>
                    <div className='mt-1 max-w-[420px] text-xs text-text-secondary'>
                      {filteredOut
                        ? 'Try loosening or clearing the filters.'
                        : 'Add a proxy or import a list to get started.'}
                    </div>
                  </div>
                  {filteredOut ? (
                    <button
                      type='button'
                      onClick={onClearFilters}
                      className='h-8 rounded-md bg-text-secondary/10 px-3 text-xs font-medium text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary'
                    >
                      Clear filters
                    </button>
                  ) : (
                    <button
                      type='button'
                      onClick={onAdd}
                      className='flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30'
                    >
                      <Plus className='h-3.5 w-3.5' />
                      Add proxy
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )}
          {rows.map((p, rowIndex) => {
            const status: ProxyStatus = testingIds.has(p.id) ? 'testing' : p.status;

            const unchecked = status === 'unchecked';
            return (
              <motion.tr
                key={p.id}
                layout='position'
                transition={{ layout: { duration: 0.22, ease: 'easeOut' } }}
                onClick={() => onSelect(p.id)}
                onContextMenu={(e: React.MouseEvent) => {
                  e.preventDefault();
                  setMenu({ id: p.id, top: e.clientY, left: e.clientX });
                }}
                style={{
                  ...ROW_TEXTURE[status],
                  animationDelay: `${Math.min(rowIndex, 8) * 20}ms`,
                  animationFillMode: 'backwards',
                }}
                className={cn(
                  'animate-in fade-in-0 duration-200 cursor-pointer border-b border-border transition-colors hover:bg-table-row-hover',
                  selectedId === p.id && 'bg-text-secondary/10 hover:bg-text-secondary/15',
                  menu?.id === p.id && 'bg-text-secondary/10',
                  status === 'dead' && 'opacity-70',
                )}
              >
                <td className={cn(TD, 'relative')}>

                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox size='sm' checked={checkedIds.has(p.id)} onChange={() => onToggleCheck(p.id)} />
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
          })}
        </tbody>
      </table>

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
          {menuProxy && (
            <>
              <DropdownItem icon={<Activity className='h-3.5 w-3.5' />} onClick={() => onTest(menuProxy)}>
                Test connection
              </DropdownItem>
              <DropdownItem
                icon={<Link2 className='h-3.5 w-3.5' />}
                onClick={() => void navigator.clipboard.writeText(buildProxyUrl(menuProxy, true)).catch(() => undefined)}
              >
                Copy proxy URL
              </DropdownItem>
              <DropdownItem
                icon={<Copy className='h-3.5 w-3.5' />}
                onClick={() => void navigator.clipboard.writeText(`${menuProxy.host}:${menuProxy.port}`).catch(() => undefined)}
              >
                Copy host:port
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem variant='error' icon={<Trash2 className='h-3.5 w-3.5' />} onClick={() => onDelete(menuProxy)}>
                Delete
              </DropdownItem>
            </>
          )}
        </DropdownContent>
      </Dropdown>
    </div>
  );
}

export default ProxyTable;