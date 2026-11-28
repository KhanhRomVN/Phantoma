import type { GitDeps } from './git-helpers';
import { createGitStatusService } from './git-status.service';
import { createGitBranchService } from './git-branch.service';
import { createGitDiffService } from './git-diff.service';
import { createGitExplorerService } from './git-explorer.service';
import { createGitHistoryService } from './git-history.service';
import { createGitProtectService } from './git-protect.service';
import { createGitRemoteService } from './git-remote.service';
import { createGitRepoService } from './git-repo.service';
import { createGitWriteService } from './git-write.service';
import { createGitExportService } from './git-export.service';

export function createGitServices(deps: GitDeps) {
  const status = createGitStatusService(deps);
  return {
    status,
    remote: createGitRemoteService(deps),
    read: {
      ...createGitHistoryService(deps),
      ...createGitDiffService(deps),
      ...createGitRepoService(deps),
    },
    write: createGitWriteService(deps),
    branch: createGitBranchService(deps),
    export: createGitExportService(deps),
    protect: createGitProtectService(deps),
    explorer: createGitExplorerService({ ...deps, status }),
    defaultBranchName: (cwd: string) => deps.branches.defaultBranchName(cwd),
  };
}

export type GitServices = ReturnType<typeof createGitServices>;