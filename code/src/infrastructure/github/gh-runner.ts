import path from 'path';
import { runProcess, type ProcessResult } from '../process/process-runner';

export type GhResult = ProcessResult;

export const GH_MAX_BUFFER = 20 * 1024 * 1024;

export function ghEnv(cwd: string, extra: NodeJS.ProcessEnv = {}): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, val] of Object.entries(process.env)) {
    if (val !== undefined) env[key] = val;
  }
  env.GIT_CEILING_DIRECTORIES = path.dirname(path.resolve(cwd));
  env.GH_PROMPT_DISABLED = '1';
  env.NO_COLOR = '1';
  for (const [key, val] of Object.entries(extra)) {
    if (val !== undefined) env[key] = val;
  }
  return env;
}

export function runGh(args: string[], cwd: string): Promise<GhResult> {
  const resolved = path.resolve(cwd);
  return runProcess('gh', args, { cwd: resolved, env: ghEnv(resolved), maxBuffer: GH_MAX_BUFFER });
}