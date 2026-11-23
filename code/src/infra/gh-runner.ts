import path from 'path';
import { runProcess, type ProcessResult } from './process-runner';

export type GhResult = ProcessResult;

export const GH_MAX_BUFFER = 20 * 1024 * 1024;

export function ghEnv(cwd: string, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_CEILING_DIRECTORIES: path.dirname(path.resolve(cwd)),
    GH_PROMPT_DISABLED: '1',
    NO_COLOR: '1',
    ...extra,
  };
}

export function runGh(args: string[], cwd: string): Promise<GhResult> {
  const resolved = path.resolve(cwd);
  return runProcess('gh', args, { cwd: resolved, env: ghEnv(resolved), maxBuffer: GH_MAX_BUFFER });
}