import { resolveCodeBaseUrl } from './code-base-url';
import { projectsApi } from './endpoints/projects.api';
import { sessionsApi } from './endpoints/sessions.api';
import { worktreesApi } from './endpoints/worktrees.api';
import { tasksApi } from './endpoints/tasks.api';
import { workflowsApi } from './endpoints/workflows.api';
import { fsApi } from './endpoints/fs.api';
import { gitApi } from './endpoints/git.api';
import { prApi } from './endpoints/pr.api';
import { scopesApi } from './endpoints/scopes.api';
import { searchApi } from './endpoints/search.api';
export type { CodeProject, CodeWorktree, CodeWorktreeInput, CodeProjectInput } from './types/project.types';
export type { CodeWorkspacePanel, CodeWorkspaceInput, CodeSession, CodeSessionInput } from './types/session.types';
export type { CodeTask, CodeTaskInput, CodeTaskUpdateInput } from './types/task.types';
export type { CodeWorkflow } from './types/workflow.types';
export type { DirEntry, FileStat, TreeNode, SquareImage, ReadDirEntry } from './types/fs.types';
export type { GitStatusResult, GitErr, GitLogCommit, GitLogResult, GitChangedInOtherBranchesResult, GitRemoteDiffResult } from './types/git.types';

export const codeApi = {
  health: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${await resolveCodeBaseUrl()}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
  projects: projectsApi,
  sessions: sessionsApi,
  worktrees: worktreesApi,
  tasks: tasksApi,
  workflows: workflowsApi,
  fs: fsApi,
  git: gitApi,
  pr: prApi,
  scopes: scopesApi,
  search: searchApi,
};
