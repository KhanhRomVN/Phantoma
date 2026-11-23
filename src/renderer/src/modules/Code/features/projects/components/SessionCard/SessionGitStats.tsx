import { useEffect, useState } from 'react';
import { Row } from '../../../../app/layout/FooterBar';
import { useScopeStats } from '../../../../shared/stores/scope-stats.store';
import { codeApi } from '../../../../shared/api/code.api';

export function ScopeSection({ projectId }: { projectId: string }) {
  const stats = useScopeStats(projectId);
  const rows = [
    {
      label: 'Clash',
      sub: 'in another branch',
      n: stats.error.length,
      dot: 'bg-error',
      text: 'text-error',
    },
    {
      label: 'Drift',
      sub: 'differs from default',
      n: stats.diff.length,
      dot: 'bg-[#f97316]',
      text: 'text-[#f97316]',
    },
    {
      label: 'Outside',
      sub: 'same as default',
      n: stats.warn.length,
      dot: 'bg-warn',
      text: 'text-warn',
    },
    {
      label: 'Inside',
      sub: 'this branch',
      n: stats.primary.length,
      dot: 'bg-primary',
      text: 'text-primary',
    },
  ];
  if (rows.every((r) => r.n === 0)) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
      <span className="text-text-secondary">Scope</span>

      {rows.map((r) => (
        <Row
          key={r.label}
          dot={r.n > 0 ? r.dot : 'bg-border'}
          label={r.label}
          sub={r.sub}
          value={r.n}
          valueClass={r.n > 0 ? r.text : 'text-text-secondary'}
        />
      ))}
    </div>
  );
}

export interface GitDotCounts {
  unstaged: number;
  staged: number;
  committed: number;
  unpushed: number;
}

/** 4 git dots: not added · added · committed · unpushed commits */
export function GitDots({ path }: { path: string }) {
  const [git, setGit] = useState<GitDotCounts | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    codeApi.git
      .status(path)
      .then((res: any) => {
        if (cancelled || !res || res.error) return;
        let unstaged = 0;
        let staged = 0;
        for (const line of String(res.output ?? '').split('\n')) {
          if (line.length < 4) continue;
          if (line[0] === '?' || line[1] !== ' ') unstaged++;
          else if (line[0] !== ' ') staged++;
        }
        setGit({
          unstaged,
          staged,
          committed: Array.isArray(res.committedFiles) ? res.committedFiles.length : 0,
          unpushed: Array.isArray(res.unpushedCommits) ? res.unpushedCommits.length : 0,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!git) return null;

  const items: { label: string; sub: string; value: number; dot: string; text: string }[] = [
    {
      label: 'Not added',
      sub: 'needs git add',
      value: git.unstaged,
      dot: 'bg-amber-400',
      text: 'text-amber-400',
    },
    {
      label: 'Added',
      sub: 'ready to commit',
      value: git.staged,
      dot: 'bg-sky-400',
      text: 'text-sky-400',
    },
    {
      label: 'Committed',
      sub: 'not pushed yet',
      value: git.committed,
      dot: 'bg-emerald-400',
      text: 'text-emerald-400',
    },
    {
      label: 'Unpushed',
      sub: 'local commits',
      value: git.unpushed,
      dot: 'bg-violet-400',
      text: 'text-violet-400',
    },
  ];

  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
      <span className="text-text-secondary">Git</span>

      {items.map((it) => (
        <Row
          key={it.label}
          dot={it.value > 0 ? it.dot : 'bg-border'}
          label={it.label}
          sub={it.sub}
          value={it.value}
          valueClass={it.value > 0 ? it.text : 'text-text-secondary'}
        />
      ))}
    </div>
  );
}
