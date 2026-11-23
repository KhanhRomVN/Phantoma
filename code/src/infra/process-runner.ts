import { execFile, spawn, type ChildProcess, type ExecFileException, type SpawnOptions } from 'child_process';

export interface ProcessResult {
  stdout: string;
  stderr: string;
  error?: ExecFileException;
}

export interface RunProcessOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  maxBuffer?: number;
  stdin?: string;
}

const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

export function runProcess(bin: string, args: string[], options: RunProcessOptions = {}): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = execFile(
      bin,
      args,
      { cwd: options.cwd, env: options.env, maxBuffer: options.maxBuffer ?? DEFAULT_MAX_BUFFER },
      (error, stdout, stderr) => {
        resolve(error ? { stdout: stdout ?? '', stderr: stderr ?? '', error } : { stdout, stderr });
      },
    );
    if (options.stdin !== undefined) child.stdin?.end(options.stdin);
  });
}

export function spawnStream(bin: string, args: string[], options: SpawnOptions = {}): ChildProcess {
  return spawn(bin, args, options);
}