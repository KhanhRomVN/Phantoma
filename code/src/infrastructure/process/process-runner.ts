import { execFile, spawn, type ChildProcess } from 'child_process';
import type {
  ProcessResult,
  ProcessRunnerPort,
  RunProcessOptions,
  ProcessStream,
  SpawnProcessOptions,
  StreamReadable,
  StreamWritable,
} from '../../application/ports/process-runner.port';

export type { ProcessResult, RunProcessOptions };

const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

class NodeProcessStream implements ProcessStream {
  constructor(private readonly child: ChildProcess) {}

  get stdout(): StreamReadable | null {
    return this.child.stdout as StreamReadable | null;
  }

  get stderr(): StreamReadable | null {
    return this.child.stderr as StreamReadable | null;
  }

  get stdin(): StreamWritable | null {
    return this.child.stdin as StreamWritable | null;
  }

  onStdout(callback: (data: string) => void): void {
    this.child.stdout?.on('data', (chunk: Buffer) => callback(chunk.toString()));
  }

  onStderr(callback: (data: string) => void): void {
    this.child.stderr?.on('data', (chunk: Buffer) => callback(chunk.toString()));
  }

  onExit(callback: (code: number | null) => void): void {
    this.child.on('exit', callback);
  }

  on(event: 'close' | 'error', callback: (arg: any) => void): void {
    this.child.on(event, callback);
  }

  kill(): void {
    this.child.kill();
  }

  isRunning(): boolean {
    return this.child.exitCode === null && !this.child.killed;
  }
}

export function runProcess(bin: string, args: string[], options: RunProcessOptions = {}): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = execFile(
      bin,
      args,
      { cwd: options.cwd, env: options.env, maxBuffer: options.maxBuffer ?? DEFAULT_MAX_BUFFER },
      (error, stdout, stderr) => {
        resolve(
          error
            ? { stdout: stdout ?? '', stderr: stderr ?? '', error: { message: error.message, code: error.code ?? undefined } }
            : { stdout, stderr },
        );
      },
    );
    if (options.stdin !== undefined) child.stdin?.end(options.stdin);
  });
}

export class ProcessRunnerAdapter implements ProcessRunnerPort {
  run(bin: string, args: string[], options: RunProcessOptions = {}): Promise<ProcessResult> {
    return runProcess(bin, args, options);
  }

  spawnStream(bin: string, args: string[], options: SpawnProcessOptions = {}): ProcessStream {
    const child = spawn(bin, args, { cwd: options.cwd, env: options.env });
    return new NodeProcessStream(child);
  }
}