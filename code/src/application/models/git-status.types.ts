// Git status domain types

export type FileStatus = 'added' | 'modified' | 'deleted';

export interface GitStatusPayload {
  files: Record<string, FileStatus>;
  output: string;
  diffStats: Record<string, { added: number; deleted: number }>;
  unpushedCommits: string[];
  committedFiles: string[];
  branch: string;
}