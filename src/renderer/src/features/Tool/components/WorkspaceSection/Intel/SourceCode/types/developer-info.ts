export interface CommitMetadata {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
}

export interface DeveloperInfo {
  contributors: { name: string; email: string; commits: number }[];
  commitEmails: string[];
  maintainers: string[];
  commitMetadata?: CommitMetadata[];
}