import type { GitCommandPort } from '../../application/ports/git-command.port';
import type { ProcessResult } from '../../application/ports/process-runner.port';
import { runGit } from './git-runner';

export class GitCommandAdapter implements GitCommandPort {
  run(args: string[], cwd: string): Promise<ProcessResult> {
    return runGit(args, cwd);
  }
}