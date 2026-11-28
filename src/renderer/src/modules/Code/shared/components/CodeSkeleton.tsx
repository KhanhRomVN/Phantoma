// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { cn } from '@renderer/utils/cn';

// ─── Constants ───────────────────────────────────────────────────────────────
const TREE_ROWS: Array<[number, string]> = [
  [0, 'w-24'],
  [1, 'w-20'],
  [2, 'w-32'],
  [2, 'w-28'],
  [1, 'w-24'],
  [2, 'w-36'],
  [2, 'w-20'],
  [0, 'w-16'],
  [1, 'w-28'],
  [1, 'w-24'],
  [0, 'w-20'],
  [1, 'w-32'],
];

// ─── Components ──────────────────────────────────────────────────────────────
function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-text-secondary/10', className)} />;
}

function ProjectRow({ nested = false }: { nested?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5 py-2.5 pr-3', nested ? 'pl-8' : 'pl-3')}>
      <Bone className={'w-8 h-8 rounded-lg shrink-0'} />
      <div className={'flex-1 min-w-0 flex flex-col gap-1.5'}>
        <Bone className={'h-3 w-2/5'} />
        <Bone className={'h-2.5 w-3/5'} />
      </div>
      <Bone className={'w-4 h-4 shrink-0'} />
    </div>
  );
}

function ProjectPanelSkeleton() {
  // ── Render ──
  return (
    <div
      className={
        'flex flex-col h-full w-[340px] shrink-0 min-h-0 bg-panel-background border-r border-border overflow-hidden'
      }
    >
      <div className={'px-3 h-[44px] flex items-center justify-between border-b border-border shrink-0'}>
        <Bone className={'h-3.5 w-24'} />
        <div className={'flex gap-0.5 items-center'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className={'w-[26px] h-[26px] rounded-md'} />
          ))}
        </div>
      </div>
      <div className={'flex h-9 shrink-0 items-center gap-2 border-b border-border px-3'}>
        <Bone className={'w-3.5 h-3.5 shrink-0'} />
        <Bone className={'h-3 w-28'} />
      </div>
      <div className={'flex-1 min-h-0 overflow-hidden flex flex-col'}>
        <div className={'flex items-center gap-2 px-3 h-8'}>
          <Bone className={'w-3 h-3'} />
          <Bone className={'h-3 w-20'} />
        </div>
        <ProjectRow nested />
        <ProjectRow nested />
        <div className={'flex items-center gap-2 px-3 h-8'}>
          <Bone className={'w-3 h-3'} />
          <Bone className={'h-3 w-16'} />
        </div>
        <ProjectRow nested />
        <ProjectRow />
        <ProjectRow />
        <ProjectRow />
      </div>
    </div>
  );
}

function ContentPanelSkeleton() {
  // ── Render ──
  return (
    <div className={'flex-1 flex flex-col min-h-0 min-w-0'}>
      <div
        className={
          'w-full shrink-0 border-b border-border bg-panel-background/80 backdrop-blur-sm px-4 flex items-center gap-3'
        }
        style={{ height: 44 }}
      >
        <Bone className={'w-6 h-6 rounded-md shrink-0'} />
        <Bone className={'h-4 w-32'} />
        <Bone className={'h-5 w-16 rounded-md'} />
        <div className={'flex-1'} />
        <Bone className={'h-7 w-64 rounded-md'} />
        <Bone className={'w-7 h-7 rounded-md'} />
      </div>
      <div className={'flex-1 min-h-0 overflow-hidden bg-background'}>
        <div className={'flex items-center gap-4 h-9 px-4 border-b border-border'}>
          <Bone className={'h-3 w-10'} />
          <Bone className={'h-3 w-40'} />
          <div className={'flex-1'} />
          <Bone className={'h-3 w-16'} />
          <Bone className={'h-3 w-16'} />
          <Bone className={'h-3 w-12'} />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={'flex items-center gap-4 h-11 px-4 border-b border-border'}>
            <Bone className={'w-4 h-4 shrink-0'} />
            <Bone className={cn('h-3', i % 3 === 0 ? 'w-64' : i % 3 === 1 ? 'w-48' : 'w-56')} />
            <div className={'flex-1'} />
            <Bone className={'h-5 w-16 rounded-md'} />
            <Bone className={'h-5 w-16 rounded-md'} />
            <Bone className={'h-3 w-12'} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityPanelSkeleton() {
  // ── Render ──
  return (
    <div
      className={'flex flex-col h-full bg-panel-background border-l border-border shrink-0'}
      style={{ width: 320 }}
    >
      <div
        className={'w-full shrink-0 bg-panel-background border-b border-border flex flex-row items-center px-2 gap-1'}
        style={{ height: 44 }}
      >
        <Bone className={'h-7 w-20 rounded-md'} />
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} className={'w-7 h-7 rounded-md'} />
        ))}
        <div className={'flex-1'} />
        <Bone className={'w-7 h-7 rounded-md'} />
      </div>
      <div className={'flex-1 overflow-hidden flex flex-col py-2'}>
        {TREE_ROWS.map(([depth, width], i) => (
          <div
            key={i}
            className={'flex items-center gap-2 h-7 pr-3'}
            style={{ paddingLeft: 12 + depth * 14 }}
          >
            <Bone className={'w-3.5 h-3.5 shrink-0'} />
            <Bone className={cn('h-3', width)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FooterBarSkeleton() {
  return (
    <div
      className={
        'h-7 border-t border-border bg-panel-background/80 backdrop-blur-sm px-3 flex items-center justify-between gap-3 shrink-0 w-full'
      }
    >
      <div className={'flex items-center gap-3'}>
        <Bone className={'h-3 w-28'} />
        <Bone className={'h-3 w-16'} />
        <Bone className={'h-3 w-24'} />
        <Bone className={'h-1.5 w-28 rounded-full'} />
      </div>
      <div className={'flex items-center gap-3'}>
        <Bone className={'h-3 w-12'} />
        <Bone className={'h-3 w-12'} />
        <Bone className={'h-3 w-16'} />
      </div>
    </div>
  );
}

export function CodeSkeleton() {
  return (
    <div className={'flex flex-col h-full w-full bg-background relative'}>
      <div className={'flex flex-1 min-h-0'}>
        <ProjectPanelSkeleton />
        <ContentPanelSkeleton />
        <ActivityPanelSkeleton />
      </div>
      <FooterBarSkeleton />
    </div>
  );
}

export default CodeSkeleton;