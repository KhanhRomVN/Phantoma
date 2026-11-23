// Mirror of code/src/domain/api-types.ts (GitStatusResult = GitStatusPayload)
export interface GitStatusResult {
  files: Record<string, 'added' | 'modified' | 'deleted'>;
  output: string;
  diffStats: Record<string, { added: number; deleted: number }>;
  unpushedCommits: string[];
  committedFiles: string[];
  branch: string;
}

export interface GitErr {
  error?: string;
}

export interface GitLogCommit {
  hash: string;
  parents: string[];
  author: string;
  email: string;
  date: number;
  refs: string[];
  subject: string;
}

export type GitLogResult = { commits: GitLogCommit[] } & GitErr;

export interface GitChangedInOtherBranchesResult {
  files: Record<string, string[]>;
}

export interface GitRemoteDiffResult {
  files: Set<string>;
}