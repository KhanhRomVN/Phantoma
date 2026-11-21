import { execFile, type ExecFileException } from 'child_process';
import path from 'path';

export interface GitResult {
  stdout: string;
  stderr: string;
  error?: ExecFileException;
}

export function runGit(args: string[], cwd: string): Promise<GitResult> {
  const resolved = path.resolve(cwd);
  const env = { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(resolved) };
  return new Promise((resolve) => {
    execFile('git', args, { cwd: resolved, env, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve(error ? { stdout: stdout ?? '', stderr: stderr ?? '', error } : { stdout, stderr });
    });
  });
}

export async function gitText(cwd: string, args: string[]): Promise<string> {
  const res = await runGit(args, cwd);
  if (res.error) throw new Error(`Git command failed: ${res.stderr.trim() || res.error.message}`);
  return res.stdout.trim();
}