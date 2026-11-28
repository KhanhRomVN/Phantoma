import type { Group } from '../../../domain/group/group.types';

export interface GroupRecordInput {
  id: string;
  name: string;
  iconId?: string | null;
  sortOrder: number;
  isOpen: boolean;
}

export interface GroupRepositoryPort {
  list(): Group[];
  get(id: string): Group | null;
  exists(id: string): boolean;
  insert(g: GroupRecordInput): void;
  update(id: string, patch: Record<string, unknown>): boolean;
  remove(id: string): boolean;
  transaction<T>(fn: () => T): T;
}