/**
 * ------------------------------------------------------------------
 * Pull Request Types
 * ------------------------------------------------------------------
 * Kiểu dữ liệu trả về từ GitHub CLI (channels 'pr:*') dùng chung cho
 * toàn bộ UI Pull Request.
 * ------------------------------------------------------------------
 */

export interface PrUser {
  login: string;
}

export interface PullRequest {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  isDraft: boolean;
  author?: PrUser | null;
  headRefName: string;
  baseRefName: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  reviewDecision?: string | null;
}

export interface PrCheck {
  name?: string;
  context?: string;
  status?: string;
  conclusion?: string;
  state?: string;
}

export interface PrFile {
  path: string;
  additions: number;
  deletions: number;
}

export interface PrCommit {
  oid: string;
  messageHeadline: string;
}

export interface PrReview {
  author?: PrUser | null;
  state: string;
  body: string;
}

export interface PrComment {
  author?: PrUser | null;
  body: string;
  createdAt: string;
}

export interface PullRequestDetail extends PullRequest {
  body: string;
  mergeable?: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  files: PrFile[];
  commits: PrCommit[];
  reviews: PrReview[];
  comments: PrComment[];
  statusCheckRollup?: PrCheck[] | null;
}

export interface StatusInfo {
  installed: boolean;
  authenticated: boolean;
  repo?: { nameWithOwner: string; url: string; defaultBranch: string };
  repoError?: string;
  error?: string;
}

export type Filter = 'open' | 'merged' | 'closed' | 'all';
export type MergeMethod = 'merge' | 'squash' | 'rebase';
export type DetailTab = 'overview' | 'commits' | 'files' | 'conversation';

export const FILTERS: { id: Filter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'merged', label: 'Merged' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
];