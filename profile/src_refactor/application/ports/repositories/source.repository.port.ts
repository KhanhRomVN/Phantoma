import type { mapSource } from '../../../domain/mappers';

// ASSUMED: SourceRecord stays derived from the legacy mapper until phase 4 moves mappers to infrastructure and defines a domain model
export type SourceRecord = ReturnType<typeof mapSource>;
export type SourceInput = Record<string, any>;

export interface SourceRepositoryPort {
  list: () => SourceRecord[];
  getById: (id: string) => SourceRecord | null;
  create: (input: SourceInput) => SourceRecord | null;
  update: (id: string, input: SourceInput) => SourceRecord | null;
  remove: (id: string) => boolean;
}