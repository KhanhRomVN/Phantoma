import type { GitHubCommandPort } from '../../application/ports/github-command.port';
import type { ProcessResult } from '../../application/ports/process-runner.port';
import { runGh } from './gh-runner';

export class GitHubCommandAdapter implements GitHubCommandPort {
  run(args: string[], cwd: string): Promise<ProcessResult> {
    return runGh(args, cwd);
  }
}