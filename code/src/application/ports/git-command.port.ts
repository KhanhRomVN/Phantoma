import type { ProcessResult } from './process-runner.port';

export interface GitCommandPort {
  run(args: string[], cwd: string): Promise<ProcessResult>;
}