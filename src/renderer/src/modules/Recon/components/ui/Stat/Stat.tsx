import { icons } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import type { StatItem } from '../types';
import { resolveColor } from '../../../constants/colors';
import { withAlpha } from '../../targetType';

export type StatVariant = 'card' | 'compact' | 'split' | 'minimal';

interface Props {
  items: StatItem[];
  variant?: string;
}

interface TileProps {
  it: StatItem;
  color: string;
  Icon?: LucideIcon;
}

const TONE_COLOR: Record<string, string> = {
  ok: '#22c55e',
  warn: '#eab308',
  danger: '#f87171',
  info: '#3686ff',
  neutral: '#9ca3af',
};

const GRID_MIN: Record<StatVariant, number> = { card: 170, compact: 150, split: 220, minimal: 150 };

const TILE =
  'relative overflow-hidden rounded-l-none rounded-r-lg border border-border bg-card-background-hover transition-colors hover:border-primary/50';

const W = 84;
const H = 28;

function Sparkline({ data, color, className }: { data: number[]; color: string; className: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data
    .map((v, i) => {
      const x = (i * W) / (data.length - 1);
      const y = H - 2 - ((v - min) / (max - min || 1)) * (H - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio='none' className={className}>
      <polyline
        points={points}
        fill='none'
        stroke={color}
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
        vectorEffect='non-scaling-stroke'
      />
    </svg>
  );
}

function AccentBar({ color }: { color: string }) {
  return <span className='absolute left-0 top-0 bottom-0 w-[3px]' style={{ backgroundColor: color }} />;
}

function IconBadge({ Icon, color, large }: { Icon: LucideIcon; color: string; large?: boolean }) {
  return (
    <span
      className={`shrink-0 flex items-center justify-center rounded-md ${large ? 'w-11 h-11' : 'w-7 h-7'}`}
      style={{ backgroundColor: withAlpha(color, 0.15), color }}
    >
      <Icon className={large ? 'w-5 h-5' : 'w-4 h-4'} strokeWidth={2} />
    </span>
  );
}

function CardTile({ it, color, Icon }: TileProps) {
  return (
    <div className={`${TILE} p-3`}>
      <AccentBar color={color} />
      <div className='flex items-center justify-between gap-2 text-xs text-text-secondary'>
        <span className='truncate'>{it.label}</span>
        {Icon && <IconBadge Icon={Icon} color={color} />}
      </div>
      <div className='text-[28px] font-bold leading-tight mt-1.5 text-text-primary'>{it.value}</div>
      {it.note && <div className='text-[11px] text-text-secondary mt-0.5 pr-24 truncate'>{it.note}</div>}
      {it.spark && <Sparkline data={it.spark} color={color} className='absolute right-2 bottom-2 w-[84px] h-7' />}
    </div>
  );
}

function CompactTile({ it, color, Icon }: TileProps) {
  return (
    <div className={`${TILE} pl-4 pr-3 py-2 flex items-center gap-2.5`}>
      <AccentBar color={color} />
      {Icon && <IconBadge Icon={Icon} color={color} />}
      <div className='min-w-0 flex-1'>
        <div className='text-xs text-text-secondary truncate'>{it.label}</div>
        {it.note && <div className='text-[11px] text-text-secondary/70 truncate'>{it.note}</div>}
      </div>
      <div className='text-lg font-bold tabular-nums text-text-primary'>{it.value}</div>
    </div>
  );
}

function SplitTile({ it, color, Icon }: TileProps) {
  return (
    <div className={`${TILE} pl-4 pr-3 py-3 flex items-center gap-3`}>
      <AccentBar color={color} />
      {Icon && <IconBadge Icon={Icon} color={color} large />}
      <div className='min-w-0 flex-1'>
        <div className='text-[11px] uppercase tracking-wide text-text-secondary truncate'>{it.label}</div>
        <div className='text-2xl font-bold leading-tight text-text-primary'>{it.value}</div>
        {it.note && <div className='text-[11px] text-text-secondary truncate'>{it.note}</div>}
      </div>
      {it.spark && <Sparkline data={it.spark} color={color} className='shrink-0 w-16 h-7' />}
    </div>
  );
}

function MinimalTile({ it, color, Icon }: TileProps) {
  return (
    <div className='px-1 py-2 border-b border-border/60'>
      <div className='flex items-center gap-1.5 text-xs text-text-secondary'>
        {Icon && <Icon className='w-3.5 h-3.5 shrink-0' style={{ color }} strokeWidth={2} />}
        <span className='truncate'>{it.label}</span>
      </div>
      <div className='flex items-baseline gap-2 mt-1 min-w-0'>
        <span className='text-2xl font-bold text-text-primary'>{it.value}</span>
        {it.note && (
          <span className='text-[11px] truncate' style={{ color }}>
            {it.note}
          </span>
        )}
      </div>
      {it.spark && <Sparkline data={it.spark} color={color} className='w-full h-6 mt-1.5' />}
    </div>
  );
}

const TILES: Record<StatVariant, (p: TileProps) => ReactElement> = {
  card: CardTile,
  compact: CompactTile,
  split: SplitTile,
  minimal: MinimalTile,
};

export default function Stat({ items, variant }: Props) {
  if (items.length === 0)
    return <div className='text-text-secondary italic p-2'>Chưa có dữ liệu.</div>;

  const v: StatVariant = variant && variant in TILES ? (variant as StatVariant) : 'card';
  const Tile = TILES[v];

  return (
    <div
      className='h-full overflow-auto p-3 grid gap-3 content-start'
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${GRID_MIN[v]}px, 1fr))` }}
    >
      {items.map((it, i) => {
        const color = resolveColor(it.color) ?? TONE_COLOR[it.tone ?? ''] ?? '#3686ff';
        const Icon = it.icon ? (icons[it.icon as keyof typeof icons] as LucideIcon | undefined) : undefined;
        return <Tile key={i} it={it} color={color} Icon={Icon} />;
      })}
    </div>
  );
}