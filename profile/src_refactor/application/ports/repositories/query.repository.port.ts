import type { Query } from '../../../domain/queries/query';

export type QueryInput = Record<string, any>;

export interface QueryRepositoryPort {
  list: () => Query[];
  getById: (id: string) => Query | null;
  create: (input: QueryInput) => Query | null;
  update: (id: string, input: QueryInput) => Query | null;
  remove: (id: string) => boolean;
}