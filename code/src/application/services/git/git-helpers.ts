import type { GitCommandPort } from '../../ports/git-command.port';
import type { GitBranchPort } from '../../ports/git-branch.port';
import type { FilePort } from '../../ports/file-access.port';
import type { ProcessResult, ProcessRunnerPort } from '../../ports/process-runner.port';

export type GitResult = ProcessResult;
export type GitError = { error: string };

export interface GitDeps {
  git: GitCommandPort;
  branches: GitBranchPort;
  fileSystem: FilePort;
  processes: ProcessRunnerPort;
}

export async function gitText(git: GitCommandPort, cwd: string, args: string[]): Promise<string> {
  const res = await git.run(args, cwd);
  if (res.error) throw new Error(`Git command failed: ${res.stderr.trim() || res.error.message}`);
  return res.stdout.trim();
}

export const lines = (s: string): string[] => s.split('\n').filter((l) => l.trim().length > 0);

export const failure = (res: GitResult): GitError => ({
  error: res.stderr || res.error?.message || 'Git command failed',
});

export const safeRef = (value: string, field: string): string => {
  if (!value || value.startsWith('-')) throw new Error(`Invalid ${field}`);
  return value;
};