import { memo } from 'react';
import { cn } from '@renderer/utils/cn';
import { RefPill } from '../GraphCell';
import { ROW_HEIGHT, laneX, laneColor } from '../../utils/graph.util';
import { VirtualRowProps } from '../../types/git-view.types';
import { VIRTUAL_PREFIX } from '../../constants/git-view.constants';

export const VirtualRow = memo(function VirtualRow({
  branch,
  unstagedCount,
  stagedCount,
  unpushedCount,
  col,
  lines,
  graphWidth,
  selected,
  dimmed,
  hangCol,
  hangFull,
  onSelect,
}: VirtualRowProps) {
  const color = laneColor(col);
  const x = laneX(col);
  const mid = ROW_HEIGHT / 2;
  const key = VIRTUAL_PREFIX + branch;

  return (
    <div
      id={`git-row-${key}`}
      onClick={() => onSelect(key)}
      style={{
        height: ROW_HEIGHT,
        background: selected ? `color-mix(in srgb, ${color} 20%, transparent)` : undefined,
      }}
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
        <RefPill chip={{ label: branch, kind: 'local' }} />
      </div>

      <div style={{ width: graphWidth }} className={'shrink-0 overflow-hidden'}>
        <svg width={graphWidth} height={ROW_HEIGHT}>
          {lines.map((l) => (
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
          {hangCol !== null && (
            <line
              x1={laneX(hangCol)}
              x2={laneX(hangCol)}
              y1={hangFull ? 0 : mid}
              y2={ROW_HEIGHT}
              stroke={laneColor(hangCol)}
              strokeWidth={2}
              strokeDasharray={'3 3'}
            />
          )}
          <circle
            cx={x}
            cy={mid}
            r={7}
            fill={'none'}
            stroke={color}
            strokeWidth={2}
            strokeDasharray={'3 3'}
          />
        </svg>
      </div>

      <span className={'flex-1 min-w-0 flex items-center gap-1.5 pl-2'}>
        {unstagedCount > 0 && (
          <span
            className={
              'h-5 shrink-0 inline-flex items-center rounded-md px-2 text-[11px] font-medium bg-warn/10 text-warn'
            }
          >
            {`${unstagedCount} ${unstagedCount === 1 ? 'file' : 'files'} not added`}
          </span>
        )}
        {stagedCount > 0 && (
          <span
            className={
              'h-5 shrink-0 inline-flex items-center rounded-md px-2 text-[11px] font-medium bg-green/10 text-green'
            }
          >
            {`${stagedCount} ${stagedCount === 1 ? 'file' : 'files'} not committed`}
          </span>
        )}
        {unpushedCount > 0 && (
          <span
            className={
              'h-5 shrink-0 inline-flex items-center rounded-md px-2 text-[11px] font-medium bg-primary/10 text-primary'
            }
          >
            {`${unpushedCount} ${unpushedCount === 1 ? 'commit' : 'commits'} not pushed`}
          </span>
        )}
      </span>
      <span className={'w-[268px] shrink-0'} />
    </div>
  );
});
