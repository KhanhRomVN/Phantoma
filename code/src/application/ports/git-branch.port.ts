export interface GitBranchPort {
  detectBranch(cwd: string): Promise<string>;
  resolveDefaultBranch(cwd: string): Promise<{ name: string; remoteRef: string }>;
  defaultBranchName(cwd: string): Promise<{ name: string }>;
}