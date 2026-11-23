import { memo } from 'react';
import { cn } from '@renderer/utils/cn';
import {
  SCOPE_DIFF_DOT,
  SCOPE_DIFF_RING,
  type ScopeFilter,
} from '../../../shared/stores/scope-stats.store';

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
  onDiffClick,
}: {
  scopes: number[];
  errorCount: number;
  diffCount: number;
  warnCount: number;
  filter: ScopeFilter | null;
  deleted?: boolean;
  onDiffClick?: () => void;
}) {
  const showPrimary = scopes.length > 0 && (!filter || filter === 'primary');
  const showWarn = warnCount > 0 && (!filter || filter === 'outside' || filter === 'warn');
  const showDiff = diffCount > 0 && (!filter || filter === 'outside' || filter === 'diff');
  const showError = errorCount > 0 && (!filter || filter === 'outside' || filter === 'error');
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
      {showDiff && (
        <span
          className={onDiffClick ? 'cursor-pointer p-1 -m-1' : undefined}
          onClick={
            onDiffClick
              ? (e) => {
                  e.stopPropagation();
                  onDiffClick();
                }
              : undefined
          }
        >
          <BadgeDot dot={SCOPE_DIFF_DOT} ring={SCOPE_DIFF_RING} deleted={deleted} />
        </span>
      )}
      {showWarn && <BadgeDot dot="bg-warn" ring="border-warn" deleted={deleted} />}
      {showPrimary && <BadgeDot dot="bg-primary" ring="border-primary" deleted={deleted} />}
    </span>
  );
});