import { memo } from 'react';
import { cn } from '@renderer/utils/cn';
import { RefPill } from '../GraphCell';
import { ROW_HEIGHT, laneX, laneColor } from '../../utils/graph.util';
import { BranchRowProps } from '../../types/git-view.types';

export const BranchRow = memo(function BranchRow({
  hash,
  names,
  col,
  lines,
  graphWidth,
  dimmed,
  joinTop,
  onSelect,
}: BranchRowProps) {
  const color = laneColor(col);
  const x = laneX(col);
  const mid = ROW_HEIGHT / 2;

  return (
    <div
      id={`git-row-branch:${hash}`}
      onClick={() => onSelect(hash)}
      style={{ height: ROW_HEIGHT }}
      className={cn(
        'flex items-center shrink-0 cursor-pointer transition-colors hover:brightness-125',
        dimmed && 'opacity-30',
      )}
    >
      <div
        className={
          'w-[200px] shrink-0 flex items-center justify-end gap-1 pl-3 pr-2 overflow-hidden'
        }
      >
        {names.map((n) => (
          <RefPill key={n} chip={{ label: n, kind: 'local' }} />
        ))}
      </div>

      <div style={{ width: graphWidth }} className={'shrink-0 overflow-hidden'}>
        <svg width={graphWidth} height={ROW_HEIGHT}>
          {lines
            .filter((l) => l !== col)
            .map((l) => (
              <line
                key={l}
                x1={laneX(l)}
                x2={laneX(l)}
                y1={0}
                y2={ROW_HEIGHT}
                stroke={laneColor(l)}
                strokeWidth={2}
              />
            ))}
          <line
            x1={x}
            x2={x}
            y1={joinTop ? 0 : mid}
            y2={ROW_HEIGHT}
            stroke={color}
            strokeWidth={2}
          />
          <circle cx={x} cy={mid} r={4} fill={color} />
        </svg>
      </div>

      <span className={'flex-1 min-w-0 truncate pl-2 text-[12.5px] italic text-text-secondary'}>
        {'Local branch · same commit as remote'}
      </span>
      <span className={'w-[268px] shrink-0'} />
    </div>
  );
});
