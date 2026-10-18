/**
 * ------------------------------------------------------------------
 * Graph Cell + Ref Pill
 * ------------------------------------------------------------------
 * SVG cell drawing the lanes of a single commit row with a real
 * avatar node (small dot for merge commits), and the colored ref label.
 * ------------------------------------------------------------------
 */

import { memo } from 'react';
import { GitBranch, Cloud, Tag } from 'lucide-react';

import { cn } from '@renderer/shared/utils/cn';
import { Avatar } from './Avatar';
import {
  ROW_HEIGHT,
  LANE_WIDTH,
  laneColor,
  laneX,
  type GraphRow,
  type RefChip,
  type RefKind,
} from './graph';

// ─── Ref Pill ───────────────────────────────────────────────────────────
const KIND_STYLE: Record<RefKind, string> = {
  head: 'bg-primary/20 text-primary border-primary/40',
  local: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  remote: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  tag: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
};

export const RefPill = memo(function RefPill({ chip }: { chip: RefChip }) {
  const Icon = chip.kind === 'tag' ? Tag : chip.kind === 'remote' ? Cloud : GitBranch;
  return (
    <span
      title={chip.label}
      className={cn(
        'inline-flex items-center gap-1 h-[20px] px-1.5 rounded-md border font-mono text-[10.5px] max-w-[120px] shrink-0',
        KIND_STYLE[chip.kind],
      )}
    >
      <Icon className={'w-2.5 h-2.5 shrink-0'} />
      <span className={'truncate'}>{chip.label}</span>
    </span>
  );
});

// ─── Graph Cell ─────────────────────────────────────────────────────────
interface GraphCellProps {
  row: GraphRow;
  laneCount: number;
  author: string;
  email: string;
  isMerge: boolean;
  isHead: boolean;
}

export const GraphCell = memo(function GraphCell({
  row,
  laneCount,
  author,
  email,
  isMerge,
  isHead,
}: GraphCellProps) {
  const H = ROW_HEIGHT;
  const mid = H / 2;
  const xc = laneX(row.col);
  const width = laneCount * LANE_WIDTH + 16;
  const color = laneColor(row.col);

  return (
    <svg width={width} height={H} className={'shrink-0 overflow-visible'}>
      {row.passThrough.map((i) => (
        <path
          key={`p${i}`}
          d={`M ${laneX(i)} 0 L ${laneX(i)} ${H}`}
          stroke={laneColor(i)}
          strokeWidth={2}
          strokeLinecap={'round'}
          fill={'none'}
        />
      ))}
      {row.incoming.map((i) => (
        <path
          key={`i${i}`}
          d={
            i === row.col
              ? `M ${xc} 0 L ${xc} ${mid}`
              : `M ${laneX(i)} 0 C ${laneX(i)} ${mid * 0.5}, ${xc} ${mid * 0.5}, ${xc} ${mid}`
          }
          stroke={laneColor(i)}
          strokeWidth={2}
          strokeLinecap={'round'}
          fill={'none'}
        />
      ))}
      {row.parentLanes.map((j) => (
        <path
          key={`o${j}`}
          d={
            j === row.col
              ? `M ${xc} ${mid} L ${xc} ${H}`
              : `M ${xc} ${mid} C ${xc} ${mid * 1.5}, ${laneX(j)} ${mid * 1.5}, ${laneX(j)} ${H}`
          }
          stroke={laneColor(j)}
          strokeWidth={2}
          strokeLinecap={'round'}
          fill={'none'}
        />
      ))}

      {isHead && <circle cx={xc} cy={mid} r={14} fill={'none'} stroke={color} strokeOpacity={0.35} strokeWidth={2} />}

      {isMerge ? (
        <circle cx={xc} cy={mid} r={5} fill={color} stroke={'var(--color-background, #111)'} strokeWidth={2} />
      ) : (
        <foreignObject x={xc - 11} y={mid - 11} width={22} height={22}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              overflow: 'hidden',
              boxSizing: 'border-box',
              background: 'var(--color-background, #111)',
            }}
          >
            <Avatar author={author} email={email} size={18} />
          </div>
        </foreignObject>
      )}
    </svg>
  );
});