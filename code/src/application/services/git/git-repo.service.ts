import path from 'path';
import { createLanguageStats } from './language-stats';
import { failure, lines, type GitDeps } from './git-helpers';

export const createGitRepoService = ({ git, fileSystem }: Pick<GitDeps, 'git' | 'fileSystem'>) => {
  return {
    isRepo: async (root: string): Promise<boolean> => {
      const res = await git.run(['rev-parse', '--is-inside-work-tree'], root);
      return !res.error && res.stdout.trim() === 'true';
    },

    repoIdentity: async (root: string) => {
      const common = await git.run(['rev-parse', '--path-format=absolute', '--git-common-dir'], root);
      if (common.error) return null;
      const top = await git.run(['rev-parse', '--show-toplevel'], root);
      if (top.error) return null;
      const [realTop, realCwd] = await Promise.all([
        fileSystem.realpath(top.stdout.trim()).catch(() => path.resolve(top.stdout.trim())),
        fileSystem.realpath(root).catch(() => path.resolve(root)),
      ]);
      if (realTop !== realCwd) return null;
      const [remote, branch] = await Promise.all([
        git.run(['config', '--get', 'remote.origin.url'], root),
        git.run(['branch', '--show-current'], root),
      ]);
      return {
        commonDir: path.resolve(common.stdout.trim()),
        remoteUrl: remote.stdout?.trim() || '',
        branch: branch.stdout?.trim() || '',
      };
    },

    remoteUrl: async (root: string) => {
      const res = await git.run(['remote', 'get-url', 'origin'], root);
      if (res.error) return failure(res);
      return { url: res.stdout.trim() };
    },

    languageStats: createLanguageStats({ git, fileSystem }),

    repoInfo: async (root: string) => {
      const check = await git.run(['rev-parse', '--is-inside-work-tree'], root);
      if (check.error || check.stdout.trim() !== 'true') return null;

      const [remoteRes, logRes, shortlogRes, branchListRes, currentRes] = await Promise.all([
        git.run(['config', '--get', 'remote.origin.url'], root),
        git.run(['log', '-1', '--pretty=format:%an|%ae|%at'], root),
        git.run(['shortlog', '-sn', '--all'], root),
        git.run(
          [
            'for-each-ref',
            '--sort=-committerdate',
            'refs/heads/',
            'refs/remotes/',
            '--format=%(refname)|%(committerdate:unix)',
          ],
          root,
        ),
        git.run(['rev-parse', '--abbrev-ref', 'HEAD'], root),
      ]);

      const repoUrl = remoteRes.stdout?.trim() || '';
      const author = !logRes.error && logRes.stdout ? logRes.stdout.split('|')[0] || '' : '';

      const contributors: { username: string }[] = [];
      if (!shortlogRes.error) {
        for (const line of lines(shortlogRes.stdout).slice(0, 5)) {
          const match = line.match(/^\s*\d+\s+(.+)$/);
          const namePart = match?.[1].split('<')[0].trim();
          if (namePart) contributors.push({ username: namePart });
        }
      }

      const branches: {
        name: string;
        lastCommitDate: number;
        commitCount: number;
        isCurrent: boolean;
      }[] = [];
      if (!branchListRes.error) {
        const seen = new Set<string>();
        const refs: { ref: string; name: string; ts: string }[] = [];
        for (const line of lines(branchListRes.stdout)) {
          const [ref, tsStr] = line.split('|');
          const name = ref.startsWith('refs/heads/')
            ? ref.slice('refs/heads/'.length)
            : ref.replace(/^refs\/remotes\/[^/]+\//, '');
          if (!name || name === 'HEAD' || seen.has(name)) continue;
          seen.add(name);
          refs.push({ ref, name, ts: tsStr });
        }
        const currentBranch = currentRes.stdout?.trim() || '';
        refs.sort((a, b) => Number(b.name === currentBranch) - Number(a.name === currentBranch));

        for (const { ref, name, ts } of refs.slice(0, 20)) {
          const countRes = await git.run(['rev-list', '--count', ref], root);
          const count = parseInt(countRes.stdout?.trim() || '0', 10);
          branches.push({
            name,
            lastCommitDate: (parseInt(ts, 10) || 0) * 1000,
            commitCount: isNaN(count) ? 0 : count,
            isCurrent: name === currentBranch,
          });
        }
      }

      return { repoUrl, author, contributors, branches };
    },
  };
};
