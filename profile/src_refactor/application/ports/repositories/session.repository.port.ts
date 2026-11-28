import type { mapSession } from '../../../domain/mappers';

// ASSUMED: SessionRecord stays derived from the legacy mapper until phase 4 moves mappers to infrastructure and defines a domain model
export type SessionRecord = ReturnType<typeof mapSession>;
export type SessionInput = Record<string, any>;

export interface SessionRepositoryPort {
  list: (emailId: string) => SessionRecord[];
  get: (emailId: string, id: string) => SessionRecord | null;
  start: (emailId: string, input: SessionInput) => SessionRecord | null;
  update: (emailId: string, id: string, input: SessionInput) => SessionRecord | null;
  end: (emailId: string, id: string, sites?: unknown[]) => SessionRecord | null;
  remove: (emailId: string, id: string) => boolean;
  purge: (emailId: string) => void;
}