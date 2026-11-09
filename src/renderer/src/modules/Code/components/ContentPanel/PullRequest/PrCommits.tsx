/**
 * ------------------------------------------------------------------
 * PR Commits
 * ------------------------------------------------------------------
 * Danh sách commit của PR dạng timeline dọc: chấm node, tiêu đề commit
 * và hash (click để copy).
 * ------------------------------------------------------------------
 */

import { memo } from 'react';
import { Copy, GitCommit } from 'lucide-react';

interface PrCommitsProps {
  commits: { oid: string; messageHeadline: string }[];
  onCopy: (hash: string) => void;
}

export const PrCommits = memo(function PrCommits({ commits, onCopy }: PrCommitsProps) {
  if (commits.length === 0) {
    return (
      <div className={'flex flex-col items-center gap-2 py-12 text-text-secondary/50 text-xs'}>
        <GitCommit className={'w-8 h-8'} strokeWidth={1.2} />
        No commits
      </div>
    );
  }

  return (
    <div className={'relative flex flex-col'}>
      <span className={'absolute left-[9px] top-3 bottom-3 w-px bg-border'} />
      {commits.map((c) => (
        <div
          key={c.oid}
          className={'group relative flex items-center gap-3 rounded-md py-2 pr-2 hover:bg-card-hover transition-colors'}
        >
          <span className={'relative z-10 ml-[3px] w-[13px] h-[13px] shrink-0 rounded-full border-2 border-primary bg-background'} />
          <span className={'min-w-0 flex-1 truncate text-[12.5px] text-text-primary'} title={c.messageHeadline}>
            {c.messageHeadline}
          </span>
          <button
            onClick={() => onCopy(c.oid)}
            title={'Copy full hash'}
            className={'shrink-0 inline-flex items-center gap-1 rounded bg-button-soft-background px-1.5 py-[1px] font-mono text-[10.5px] text-text-secondary hover:text-text-primary cursor-pointer outline-none transition-colors'}
          >
            {c.oid.slice(0, 7)}
            <Copy className={'w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity'} />
          </button>
        </div>
      ))}
    </div>
  );
});

PrCommits.displayName = 'PrCommits';