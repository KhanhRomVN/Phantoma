import { runGit, gitText, lines } from '../../infra/git-runner';

export async function resolveDefaultBranch(cwd: string): Promise<{ name: string; remoteRef: string }> {
  const head = await runGit(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], cwd);
  let name = head.error ? '' : head.stdout.trim().replace(/^origin\//, '');
  if (!name) {
    const cfg = await runGit(['config', '--get', 'init.defaultBranch'], cwd);
    const c = cfg.error ? '' : cfg.stdout.trim();
    if (c) {
      const ok = await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${c}`], cwd);
      if (!ok.error) name = c;
    }
  }
  if (!name) return { name: '', remoteRef: '' };
  const remote = await runGit(['show-ref', '--verify', '--quiet', `refs/remotes/origin/${name}`], cwd);
  return { name, remoteRef: remote.error ? '' : `origin/${name}` };
}

export async function defaultBranchName(cwd: string): Promise<{ name: string }> {
  const { name } = await resolveDefaultBranch(cwd);
  if (name) return { name };
  const remotes = lines(await gitText(cwd, ['remote']));
  if (remotes.length > 0) return { name: 'main' };
  const branches = lines(await gitText(cwd, ['branch', '--format=%(refname:short)']));
  return { name: branches.find((b) => b === 'main' || b === 'master') ?? branches[0] ?? 'main' };
}