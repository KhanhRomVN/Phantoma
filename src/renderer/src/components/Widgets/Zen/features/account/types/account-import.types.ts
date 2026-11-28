export type DuplicateKind = 'new' | 'changed' | 'identical';

export interface DuplicateEntry {
  email: string;
  provider_id: string;
  kind?: DuplicateKind;
  incoming: {
    id?: string;
    email: string;
    provider_id: string;
    credential?: string;
    [key: string]: unknown;
  };
  existing: {
    id: string;
    email: string;
    provider_id: string;
    credential: string | null;
    usage: number | null;
    reset_usage_at: string | null;
  } | null;
}
