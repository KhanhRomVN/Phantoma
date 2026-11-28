// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { memo } from 'react';

// ── UI ──
import { CornerDownRight } from 'lucide-react';

// ── Stores ──
import type { ScopeCategory } from '../stores/scope-stats.store';

// ── Utils ──
import { cn } from '@renderer/utils/cn';
import { SCOPE_BADGE_META, SCOPE_DOT } from '../utils/scope-badges.util';


// ─── Interfaces ──────────────────────────────────────────────────────────────
interface BranchScope {
  branch: string;
  paths: string[];
}

interface TabProps {
  active: boolean;
  title?: string;
  label: string;
  count: number | null;
  dotClass?: string;
  dots?: string[];
  tintClass?: string;
  onClick: () => void;
}

interface ScopeFilterTabsProps {
  total: number;
  loaded: boolean;
  byCategory: Record<ScopeCategory, string[]>;
  cat: ScopeCategory | 'outside' | 'all';
  branchFilter: string | null;
  branchChips: { branch: string; count: number; dots?: string[] }[];
  branchScopes: BranchScope[];
  scopeBranch: string;
  unscopedCount: number;
  onSelectAll: () => void;
  onSelectOutside: () => void;
  onSelectCategory: (id: ScopeCategory) => void;
  onSelectBranch: (branch: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────
export const UNSCOPED_BRANCH = '__unscoped__';

const OUTSIDE_CATS: ScopeCategory[] = ['warn', 'diff', 'error'];
const OUTSIDE_SUBS: ScopeCategory[] = ['warn', 'diff', 'error'];

const SUB_LABEL: Record<string, string> = {
  warn: 'Same',
  diff: 'Drift',
  error: 'Clash',
};

// ─── Component ───────────────────────────────────────────────────────────────
function Tab({ active, title, label, count, dotClass, dots, tintClass, onClick }: TabProps) {
  // ── Render ──
  return (
    <button
      type={'button'}
      role={'tab'}
      aria-selected={active}
      title={title ?? label}
      onClick={onClick}
      className={cn(
        'h-6 shrink-0 flex items-center gap-1.5 rounded-md px-2 text-[11.5px] font-medium transition-colors cursor-pointer',
        active
          ? 'bg-text-secondary/15 text-text-primary outline-dashed outline-1 -outline-offset-1 outline-text-secondary/50'
          : 'bg-card-background text-text-secondary hover:text-text-primary hover:bg-card-hover',
        active && tintClass,
      )}
    >
      {dotClass && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} />}
      {dots && (
        <span className={'flex shrink-0 items-center gap-0.5'}>
          {dots.map((d) => (
            <span key={d} className={cn('h-1.5 w-1.5 rounded-full', d)} />
          ))}
        </span>
      )}
      <span>{label}</span>
      <span className={cn('font-mono text-[10.5px]', active ? 'text-text-primary/80' : 'text-text-secondary/80')}>
        {count ?? '–'}
      </span>
    </button>
  );
}

export const ScopeFilterTabs = memo(function ScopeFilterTabs({
  total,
  loaded,
  byCategory,
  cat,
  branchFilter,
  branchChips,
  unscopedCount,
  onSelectAll,
  onSelectOutside,
  onSelectCategory,
  onSelectBranch,
}: ScopeFilterTabsProps) {
  const outsideCount = byCategory.warn.length + byCategory.diff.length + byCategory.error.length;
  const outsideActive = cat === 'outside' || OUTSIDE_CATS.includes(cat as ScopeCategory) || !!branchFilter;
  const subs = OUTSIDE_SUBS.filter((id) => byCategory[id].length > 0 || cat === id);

  return (
    <div className={'px-3 pt-2 flex flex-col gap-1'}>
      <div role={'tablist'} className={'flex flex-wrap items-center gap-1'}>
        <Tab active={cat === 'all' && !branchFilter} label={'All'} count={total} onClick={onSelectAll} />
        <Tab
          active={outsideActive}
          label={'Outside'}
          count={loaded ? outsideCount : null}
          dots={OUTSIDE_CATS.filter((id) => byCategory[id].length > 0).map((id) => SCOPE_DOT[id])}
          title={'Files outside this branch scope'}
          onClick={onSelectOutside}
        />
        <Tab
          active={cat === 'primary'}
          label={'Inside'}
          count={loaded ? byCategory.primary.length : null}
          dotClass={SCOPE_DOT.primary}
          title={SCOPE_BADGE_META.primary.hint}
          onClick={() => onSelectCategory('primary')}
        />
      </div>
      {outsideActive && (
        <div className={'flex flex-wrap items-center gap-1'}>
          <CornerDownRight className={'h-3.5 w-3.5 shrink-0 ml-1 mr-0.5 text-warn/70'} />

          {loaded &&
            subs.map((id) => (
              <Tab
                key={id}
                active={cat === id}
                title={`${SCOPE_BADGE_META[id].label} — ${SCOPE_BADGE_META[id].hint}`}
                label={SUB_LABEL[id]}
                count={byCategory[id].length}
                dotClass={SCOPE_DOT[id]}
                onClick={() => onSelectCategory(id)}
              />
            ))}
        </div>
      )}
      {outsideActive && branchChips.length > 0 && (
        <div className={'flex flex-wrap items-center gap-1 pl-5'}>
          <CornerDownRight className={'h-3.5 w-3.5 shrink-0 ml-1 mr-0.5 text-[#f97316]/70'} />
          {branchChips.map((o) => (
            <Tab
              key={`scope-chip-${o.branch}`}
              active={branchFilter === o.branch}
              title={`Only show files in the scope of ${o.branch}`}
              label={o.branch}
              count={o.count}
              dots={o.dots}
              onClick={() => onSelectBranch(o.branch)}
            />
          ))}
          {branchChips.length > 0 && unscopedCount > 0 && (
            <Tab
              active={branchFilter === UNSCOPED_BRANCH}
              title={'Outside files that are not in the scope of any other branch'}
              label={'Unscoped'}
              count={unscopedCount}
              dotClass={SCOPE_DOT.diff}
              onClick={() => onSelectBranch(UNSCOPED_BRANCH)}
            />
          )}
        </div>
      )}
    </div>
  );
});