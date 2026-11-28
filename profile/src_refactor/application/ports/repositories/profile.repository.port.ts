import type { EmailFile, mapEmail } from '../../../domain/mappers';

// ASSUMED: ProfileRecord stays derived from the legacy mapper until phase 4 moves mappers to infrastructure and defines a domain model
export type ProfileRecord = ReturnType<typeof mapEmail>;
export type ProfileInput = Record<string, any>;

export interface ProfileRepositoryPort {
  list: (sourceId?: string) => ProfileRecord[];
  listIdsBySource: (sourceId?: string) => string[];
  getById: (id: string) => ProfileRecord | null;
  getRaw: (id: string) => EmailFile | undefined;
  exists: (id: string) => boolean;
  create: (input: ProfileInput) => string;
  update: (id: string, input: ProfileInput) => boolean;
  remove: (id: string) => boolean;
}