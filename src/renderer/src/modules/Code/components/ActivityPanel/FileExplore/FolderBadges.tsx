import { memo } from 'react';
import { cn } from '@renderer/utils/cn';
import {
  SCOPE_DIFF_DOT,
  SCOPE_DIFF_RING,
  type ScopeCategory,
} from '../../../stores/useScopeStatsStore';

const DOT = 'w-2 h-2 shrink-0 rounded-full';

const BadgeDot = ({ dot, ring, deleted }: { dot: string; ring: string; deleted?: boolean }) =>
  deleted ? (
    <span className={cn('inline-flex shrink-0 p-[2px] rounded-[4px] border border-dashed', ring)}>
      <span className={cn(DOT, dot)} />
    </span>
  ) : (
    <span className={cn(DOT, dot)} />
  );

export const FolderBadges = memo(function FolderBadges({
  scopes,
  errorCount,
  diffCount,
  warnCount,
  filter,
  deleted = false,
}: {
  scopes: number[];
  errorCount: number;
  diffCount: number;
  warnCount: number;
  filter: ScopeCategory | null;
  deleted?: boolean;
}) {
  const showPrimary = scopes.length > 0 && (!filter || filter === 'primary');
  const showWarn = warnCount > 0 && (!filter || filter === 'warn');
  const showDiff = diffCount > 0 && (!filter || filter === 'diff');
  const showError = errorCount > 0 && (!filter || filter === 'error');
  if (!showPrimary && !showWarn && !showDiff && !showError) return null;

  const title = [
    showError &&
      `${errorCount} file(s) outside scope · differs from default branch & changed in another branch`,
    showDiff && `${diffCount} file(s) outside scope · differs from default branch`,
    showWarn && `${warnCount} file(s) outside scope · same as default branch`,
    showPrimary && `Scope inside: ${scopes.join(', ')}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <span className="ml-auto flex items-center gap-1 shrink-0 px-1" title={title}>
      {showError && <BadgeDot dot="bg-error" ring="border-error" deleted={deleted} />}
      {showDiff && <BadgeDot dot={SCOPE_DIFF_DOT} ring={SCOPE_DIFF_RING} deleted={deleted} />}
      {showWarn && <BadgeDot dot="bg-warn" ring="border-warn" deleted={deleted} />}
      {showPrimary && <BadgeDot dot="bg-primary" ring="border-primary" deleted={deleted} />}
    </span>
  );
});