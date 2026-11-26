export type OpId = 'eq' | 'ne' | 'contains' | 'not_contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'empty' | 'not_empty';
export type MatchMode = 'all' | 'any';

export interface Condition {
  id: string;
  field: string;
  op: OpId;
  value: string;
}

export type QueryKind = 'visual' | 'sql';

export interface SavedQuery {
  id: string;
  name: string;
  mode: MatchMode;
  conditions: Condition[];
  kind?: QueryKind;
  sql?: string;
}

export type SavedQueryRecord = SavedQuery & { text: string };
export type SavedQueryInput = Omit<SavedQueryRecord, 'id'> & { id?: string };
