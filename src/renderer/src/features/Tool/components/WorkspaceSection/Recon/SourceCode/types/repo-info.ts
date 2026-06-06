export interface RepoInfo {
  repositoryName: string;
  owner: string;
  visibility: 'public' | 'private';
  commitHistory?: {
    totalCommits: number;
    lastCommitDate: string;
    firstCommitDate: string;
  };
  branches?: string[];
  tags?: string[];
  releases?: { version: string; date: string }[];
}