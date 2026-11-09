/**
 * ------------------------------------------------------------------
 * PR Files
 * ------------------------------------------------------------------
 * Danh sách file thay đổi của PR: icon theo đuôi file (file-icon),
 * thư mục mờ + tên file đậm, thanh +/- mini và ô tìm kiếm.
 * ------------------------------------------------------------------
 */

import { memo, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, Search, X } from 'lucide-react';

import { getFileIconPath } from '@renderer/utils/file-icon';
import type { PrFile } from './types';
import { BTN, splitPath, tint } from './utils';

const ChangeBar = ({ add, del }: { add: number; del: number }) => {
  const total = add + del;
  let green = total === 0 ? 0 : Math.round((5 * add) / total);
  if (add > 0 && green === 0) green = 1;
  if (del > 0 && green === 5) green = 4;
  return (
    <span className={'inline-flex items-center gap-[2px] shrink-0'}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          style={{
            background:
              total === 0
                ? 'rgb(var(--text-secondary) / 0.25)'
                : i < green
                  ? 'rgb(var(--success))'
                  : 'rgb(var(--error))',
          }}
          className={'w-[6px] h-[6px] rounded-[1px]'}
        />
      ))}
    </span>
  );
};

interface PrFilesProps {
  files: PrFile[];
  totalFiles: number;
  url: string;
}

export const PrFiles = memo(function PrFiles({ files, totalFiles, url }: PrFilesProps) {
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? files.filter((f) => f.path.toLowerCase().includes(q)) : files;
  }, [files, query]);

  const truncated = totalFiles > files.length;
  const warn = 'rgb(var(--warn))';

  return (
    <div className={'flex flex-col gap-3'}>
      {truncated && (
        <div
          style={{ background: tint(warn, 10), borderColor: tint(warn, 30) }}
          className={'flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] text-text-primary'}
        >
          <AlertTriangle className={'w-4 h-4 shrink-0 text-warn'} />
          <span className={'flex-1 min-w-0'}>
            {`GitHub CLI only returns the first ${files.length} of ${totalFiles} changed files.`}
          </span>
          <button
            className={BTN}
            onClick={() => void window.api.invoke('pr:open-external', `${url}/files`)}
          >
            <ExternalLink className={'w-3.5 h-3.5'} />
            View all
          </button>
        </div>
      )}

      <div className={'relative'}>
        <Search className={'absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/60 pointer-events-none'} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={'Filter files...'}
          spellCheck={false}
          className={'w-full h-8 pl-8 pr-8 text-xs bg-input-background border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50'}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className={'absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary cursor-pointer'}
          >
            <X className={'w-3.5 h-3.5'} />
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className={'py-10 text-center text-xs text-text-secondary/50'}>No matching files</div>
      ) : (
        <div className={'rounded-lg border border-border overflow-hidden'}>
          {shown.map((f, i) => {
            const { dir, name } = splitPath(f.path);
            return (
              <div
                key={f.path}
                className={`flex items-center gap-2.5 px-3 py-1.5 text-[12px] hover:bg-card-hover transition-colors ${i > 0 ? 'border-t border-border/50' : ''}`}
              >
                <img src={getFileIconPath(name)} alt={''} className={'w-4 h-4 shrink-0'} />
                <span className={'min-w-0 flex-1 truncate'} title={f.path}>
                  <span className={'text-text-secondary/70'}>{dir}</span>
                  <span className={'font-medium text-text-primary'}>{name}</span>
                </span>
                <span className={'shrink-0 font-mono text-[11px] text-success'}>{`+${f.additions}`}</span>
                <span className={'shrink-0 font-mono text-[11px] text-error'}>{`-${f.deletions}`}</span>
                <ChangeBar add={f.additions} del={f.deletions} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

PrFiles.displayName = 'PrFiles';