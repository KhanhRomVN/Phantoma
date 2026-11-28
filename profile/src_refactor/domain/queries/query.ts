export interface Query {
  id: string;
  name: string;
  mode: string;
  kind: string;
  conditions: unknown[];
  sql?: string;
  text: string;
}