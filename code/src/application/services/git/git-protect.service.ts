import path from 'path';
import { type GitDeps } from './git-helpers';

export const createGitProtectService = ({ git, fileSystem }: Pick<GitDeps, 'git' | 'fileSystem'>) => {
  const PROTECT_MARKER = '# phantoma-protect-default-branch';
  const PRE_COMMIT_HOOK = `#!/bin/sh
${PROTECT_MARKER}
branch=$(git symbolic-ref --short HEAD 2>/dev/null)
default=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
[ -z "$default" ] && default=$(git config --get init.defaultBranch)
if [ -n "$branch" ] && [ "$branch" = "$default" ]; then
  echo "Phantoma: committing directly to '$default' is blocked. Create a feature branch, commit there and open a pull request." >&2
  exit 1
fi
exit 0
`;
  const PRE_PUSH_HOOK = `#!/bin/sh
${PROTECT_MARKER}
default=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
[ -z "$default" ] && default=$(git config --get init.defaultBranch)
[ -z "$default" ] && exit 0
while read local_ref local_sha remote_ref remote_sha; do
  if [ "$remote_ref" = "refs/heads/$default" ]; then
    echo "Phantoma: pushing directly to '$default' is blocked. Push a feature branch and open a pull request." >&2
    exit 1
  fi
done
exit 0
`;
  const PROTECT_HOOKS: Record<string, string> = {
    'pre-commit': PRE_COMMIT_HOOK,
    'pre-push': PRE_PUSH_HOOK,
  };

  const resolveHooksDir = async (cwd: string): Promise<string> => {
    const out = await git.run(['rev-parse', '--git-path', 'hooks'], cwd);
    return out.error ? '' : path.resolve(cwd, out.stdout.trim());
  };

  const readHook = async (file: string): Promise<string | null> => {
    try {
      return await fileSystem.readText(file);
    } catch {
      return null;
    }
  };

  const NOT_A_REPO = { error: 'Not a git repository' };

  return {
    protectStatus: async (root: string): Promise<{ protected?: boolean; conflict?: boolean; error?: string }> => {
      const dir = await resolveHooksDir(root);
      if (!dir) return NOT_A_REPO;
      let installed = 0;
      let conflict = false;
      for (const name of Object.keys(PROTECT_HOOKS)) {
        const content = await readHook(path.join(dir, name));
        if (content === null) continue;
        if (content.includes(PROTECT_MARKER)) installed++;
        else conflict = true;
      }
      return { protected: installed === Object.keys(PROTECT_HOOKS).length, conflict };
    },

    protectEnable: async (root: string): Promise<{ ok?: boolean; error?: string }> => {
      const dir = await resolveHooksDir(root);
      if (!dir) return NOT_A_REPO;
      for (const name of Object.keys(PROTECT_HOOKS)) {
        const content = await readHook(path.join(dir, name));
        if (content !== null && !content.includes(PROTECT_MARKER)) {
          return { error: `A ${name} hook already exists in ${dir}. Add the default-branch check to it manually.` };
        }
      }
      await fileSystem.mkdirp(dir);
      for (const [name, script] of Object.entries(PROTECT_HOOKS)) {
        await fileSystem.writeFile(path.join(dir, name), script, 0o755);
        await fileSystem.chmod(path.join(dir, name), 0o755);
      }
      return { ok: true };
    },

    protectDisable: async (root: string): Promise<{ ok?: boolean; error?: string }> => {
      const dir = await resolveHooksDir(root);
      if (!dir) return NOT_A_REPO;
      for (const name of Object.keys(PROTECT_HOOKS)) {
        const content = await readHook(path.join(dir, name));
        if (content !== null && content.includes(PROTECT_MARKER)) await fileSystem.unlink(path.join(dir, name));
      }
      return { ok: true };
    },
  };
};
