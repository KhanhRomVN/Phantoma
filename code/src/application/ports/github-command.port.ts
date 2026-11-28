import type { ProcessResult } from './process-runner.port';

export interface GitHubCommandPort {
  run(args: string[], cwd: string): Promise<ProcessResult>;
}