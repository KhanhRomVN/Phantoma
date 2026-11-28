import type { mapService } from '../../../domain/mappers';

// ASSUMED: ServiceRecord stays derived from the legacy mapper until phase 4 moves mappers to infrastructure and defines a domain model
export type ServiceRecord = ReturnType<typeof mapService>;
export type ServiceInput = Record<string, any>;

export interface ServiceCatalogRepositoryPort {
  list: () => ServiceRecord[];
  getById: (id: string) => ServiceRecord | null;
  create: (input: ServiceInput) => ServiceRecord | null;
  update: (id: string, input: ServiceInput) => ServiceRecord | null;
  remove: (id: string) => boolean;
}