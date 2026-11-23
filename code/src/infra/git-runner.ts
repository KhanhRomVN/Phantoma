import path from 'path';
import { runProcess, type ProcessResult } from './process-runner';

export type GitResult = ProcessResult;
export type GitError = { error: string };

export function runGit(args: string[], cwd: string): Promise<GitResult> {
  const resolved = path.resolve(cwd);
  const env = { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(resolved) };
  return runProcess('git', args, { cwd: resolved, env, maxBuffer: 10 * 1024 * 1024 });
}

export async function gitText(cwd: string, args: string[]): Promise<string> {
  const res = await runGit(args, cwd);
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
