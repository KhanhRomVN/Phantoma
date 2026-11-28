import type { mapServiceEmail } from '../../../domain/mappers';

// ASSUMED: ServiceEmailRecord stays derived from the legacy mapper until phase 4 moves mappers to infrastructure and defines a domain model
export type ServiceEmailRecord = ReturnType<typeof mapServiceEmail>;
export type ServiceEmailInput = Record<string, any>;

export interface ServiceEmailRepositoryPort {
  list: (emailId: string) => ServiceEmailRecord[];
  listRaw: (emailId: string) => Record<string, any>[];
  get: (emailId: string, id: string) => ServiceEmailRecord | null;
  create: (emailId: string, input: ServiceEmailInput) => ServiceEmailRecord | null;
  update: (emailId: string, id: string, input: ServiceEmailInput) => ServiceEmailRecord | null;
  remove: (emailId: string, id: string) => boolean;
  purge: (emailId: string) => void;
}