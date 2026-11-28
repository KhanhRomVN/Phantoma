// ─── Imports ────────────────────────────────────────────────────────────
import { memo, useCallback, useEffect, useState } from 'react';
import { ProjectIcon, getProjectIdentity } from '../../projects';

import { useCodeStore } from '../../../shared/stores/code.store';
import { codeApi } from '../../../shared/api/code.api';
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
  const project = useCodeStore((s) => s.projects.find((p) => p.id === s.currentProjectId));
  const identity = getProjectIdentity(project?.id ?? projectName);

  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [defaultBranch, setDefaultBranch] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!projectPath) return;
    codeApi.git
      .defaultBranch(projectPath)
      .then((def: { name?: string }) => {
        setDefaultBranch(def?.name ?? '');
      })
      .catch(() => undefined);
    codeApi.git
      .log(projectPath, 1, 'HEAD')
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
        <ProjectIcon color={identity.color} Icon={identity.Icon} logoPath={project?.logoPath} />
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