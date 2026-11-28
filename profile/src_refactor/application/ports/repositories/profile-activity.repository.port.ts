export type ActivityInput = Record<string, any>;

export interface ChildRepositoryPort<T> {
  list: (emailId: string) => T[];
  get: (id: string) => T | null;
  create: (emailId: string, input: ActivityInput) => T | null;
  update: (id: string, input: ActivityInput) => T | null;
  remove: (id: string) => boolean;
}

export interface BrowsingEntryRepositoryPort<T> extends ChildRepositoryPort<T> {
  listInRange: (emailId: string, from?: number, to?: number) => T[];
  clear: (emailId: string) => number;
}