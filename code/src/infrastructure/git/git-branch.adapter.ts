import type { GitBranchPort } from '../../application/ports/git-branch.port';
import { runGit } from './git-runner';
import { defaultBranchName, resolveDefaultBranch } from './default-branch';

export class GitBranchAdapter implements GitBranchPort {
  async detectBranch(cwd: string): Promise<string> {
    const res = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
    if (res.error) return '';
    const out = res.stdout.trim();
    return out === 'HEAD' ? '' : out;
  }

  resolveDefaultBranch(cwd: string): Promise<{ name: string; remoteRef: string }> {
    return resolveDefaultBranch(cwd);
  }

  defaultBranchName(cwd: string): Promise<{ name: string }> {
    return defaultBranchName(cwd);
  }
}