/**
 * ------------------------------------------------------------------
 * Pull Request View
 * ------------------------------------------------------------------
 * Trang quản lý Pull Request riêng cho từng project, hiển thị trong
 * ContentPanel khi contentViewMode === 'pullrequests'.
 *
 * Main features:
 * - Header: tên project
 * - Thân: PullRequestPanel (danh sách, chi tiết, tạo/merge/close PR)
 * - Toast thông báo cục bộ
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { memo, useCallback, useEffect, useState } from 'react';
import { GitPullRequest } from 'lucide-react';

import { useCodeStore } from '../../../hooks/useCodeStore';
import { PullRequestPanel } from './PullRequestPanel';

// ─── Main Component ─────────────────────────────────────────────────────
export const PullRequestView = memo(function PullRequestView() {
  const projectPath = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.path ?? '';
  });
  const projectName = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.name ?? '';
  });

  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [defaultBranch, setDefaultBranch] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!projectPath) return;
    window.api.invoke('git:default-branch', projectPath).then((def: { name?: string }) => {
      setDefaultBranch(def?.name ?? '');
    });
    window.api
      .invoke('git:log', projectPath, 1, 'HEAD')
      .then((res: { commits?: { refs: string[] }[] }) => {
        const ref = res?.commits?.[0]?.refs.find((r) => r.startsWith('HEAD -> '));
        setCurrentBranch(ref ? ref.slice(8) : null);
      });
  }, [projectPath]);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  }, []);

  return (
    <div className={'flex-1 min-w-0 min-h-0 flex flex-col relative'}>
      <div className={'h-11 shrink-0 px-4 flex items-center gap-2 border-b border-border'}>
        <span className={'w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0 bg-primary/15 text-primary'}>
          <GitPullRequest className={'w-3.5 h-3.5'} />
        </span>
        <span className={'text-sm font-semibold text-text-primary truncate'}>{projectName}</span>
        <span className={'text-xs text-text-secondary'}>Pull requests</span>
      </div>

      <PullRequestPanel
        projectPath={projectPath}
        currentBranch={currentBranch}
        defaultBranch={defaultBranch}
        onNotice={showNotice}
      />

      {notice && (
        <div className={'absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-2 rounded-lg border border-border bg-card-background text-xs text-text-primary shadow-lg'}>
          {notice}
        </div>
      )}
    </div>
  );
});

PullRequestView.displayName = 'PullRequestView';

export default PullRequestView;