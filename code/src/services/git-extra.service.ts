import { gitText } from './git-runner';

const lines = (s: string): string[] => s.split('\n').filter((l) => l.trim());

export const gitExtraService = {
  defaultBranch: async (root: string): Promise<{ name: string }> => {
    try {
      const remotes = lines(await gitText(root, ['remote']));
      if (remotes.length === 0) {
        const branches = lines(await gitText(root, ['branch', '--format=%(refname:short)']));
        const fallback = branches.find((b) => b === 'main' || b === 'master') ?? branches[0] ?? 'main';
        return { name: fallback };
      }
      const remote = remotes[0];
      try {
        const ref = await gitText(root, ['symbolic-ref', `refs/remotes/${remote}/HEAD`]);
        return { name: ref.replace(`refs/remotes/${remote}/`, '') };
      } catch {
        return { name: 'main' };
      }
    } catch (err: any) {
      throw new Error(`Failed to get default branch: ${err.message}`);
    }
  },
};