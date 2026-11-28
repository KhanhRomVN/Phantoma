// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { memo } from 'react';

// ── Components ──
import { GraphCell, GraphFill, RefPill, useRemoteAccents } from '../GraphCell';

// ── Utils ──
import { cn } from '@renderer/utils/cn';
import { ROW_HEIGHT, formatRelative, laneColor, parseRefs } from '../../utils/graph.util';

// ── Types ──
import { CommitRowProps } from '../../types/git-view.types';

// ─── Component ───────────────────────────────────────────────────────────────
export const CommitRow = memo(function CommitRow({
  commit,
  row,
  laneCount,
  graphWidth,
  selected,
  dimmed,
  hideLocals,
  unpushed,
  pushing,
  onPush,
  onSelect,
  onContextMenu,
  onHover,
}: CommitRowProps) {
  const color = laneColor(row.col);
  const chips = parseRefs(commit.refs).filter(
    (c) =>
      !(hideLocals && (c.kind === 'head' || c.kind === 'local') && hideLocals.includes(c.label)),
  );
  const remoteAccents = useRemoteAccents(chips);
  const topLanes = [...new Set([...row.incoming, ...row.passThrough])];
  const bottomLanes = [...new Set([...row.parentLanes, ...row.passThrough])];
  const isMerge = commit.parents.length > 1;
  const isHead = commit.refs.some((r) => r.startsWith('HEAD'));

  return (
    <div
      id={`git-row-${commit.hash}`}
      onClick={() => onSelect(commit.hash)}
      onContextMenu={(e) => onContextMenu(e, commit)}
      onMouseEnter={(e) => onHover(e, commit)}
      onMouseMove={(e) => onHover(e, commit)}
      onMouseLeave={() => onHover(null)}
      style={{
        minHeight: ROW_HEIGHT,
        background: selected ? `color-mix(in srgb, ${color} 20%, transparent)` : undefined,
      }}
      className={cn(
        'flex items-center shrink-0 cursor-pointer transition-colors hover:brightness-125',
        dimmed && 'opacity-30',
      )}
    >
      <div
        className={'w-[200px] shrink-0 flex flex-col items-end justify-center gap-1 pl-3 pr-2 py-1'}
      >
        {chips.length > 0 && (
          <div className={'flex flex-wrap items-center justify-end gap-1'}>
            {chips.map((c, i) => (
              <RefPill key={c.kind + c.label} chip={c} color={remoteAccents[i]} />
            ))}
          </div>
        )}
      </div>

      <div
        style={{ width: graphWidth }}
        className={'shrink-0 overflow-hidden self-stretch flex flex-col'}
      >
        <GraphFill lanes={topLanes} laneCount={laneCount} />
        <GraphCell
          row={row}
          laneCount={laneCount}
          author={commit.author}
          email={commit.email}
          isMerge={isMerge}
          isHead={isHead}
        />
        <GraphFill lanes={bottomLanes} laneCount={laneCount} />
      </div>

      <span
        title={commit.subject}
        className={cn(
          'flex-1 min-w-0 truncate pl-2 text-[12.5px]',
          isMerge ? 'text-text-secondary' : 'text-text-primary',
        )}
      >
        {commit.subject}
      </span>
      {unpushed && (
        <button
          type={'button'}
          disabled={pushing}
          title={'Committed but not pushed yet'}
          onClick={(e) => {
            e.stopPropagation();
            onPush?.();
          }}
          className={
            'mr-2 h-5 shrink-0 cursor-pointer rounded-md px-2 text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-50 transition-colors outline-dashed outline-1 -outline-offset-1 outline-primary/50'
          }
        >
          {pushing ? 'Pushing…' : 'Push'}
        </button>
      )}
      <span className={'w-[130px] shrink-0 truncate px-2 text-[11.5px] text-text-secondary'}>
        {commit.author}
      </span>
      <span className={'w-[62px] shrink-0 font-mono text-[10.5px] text-text-secondary/50'}>
        {commit.hash.slice(0, 7)}
      </span>
      <span
        className={
          'w-[76px] shrink-0 pr-4 text-right font-mono text-[10.5px] text-text-secondary/60'
        }
      >
        {formatRelative(commit.date)}
      </span>
    </div>
  );
});
