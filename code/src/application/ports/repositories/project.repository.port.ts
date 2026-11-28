import type { Project } from '../../../domain/project/project.types';

export interface ProjectRecordInput {
  id: string;
  name: string;
  logo: string | null;
  repositoryUrl?: string | null;
  groupId?: string | null;
  sortOrder: number;
}

export interface ProjectRepositoryPort {
  list(): Project[];
  get(id: string): Project | null;
  exists(id: string): boolean;
  nextSortOrder(): number;
  insert(p: ProjectRecordInput): void;
  update(id: string, patch: Record<string, unknown>): boolean;
  remove(id: string): boolean;
  transaction<T>(fn: () => T): T;
}