export interface Project {
  id: string;
  logo: string | null;
  name: string;
  repositoryUrl: string | null;
  groupId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Worktree {
  id: string;
  projectId: string;
  path: string;
  branch: string;
  visible: boolean;
  searchTerm: string;
}