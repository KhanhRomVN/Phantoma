export type Operator =
  | 'equals'
  | 'not_equal'
  | 'greater'
  | 'less'
  | 'contains'
  | 'starts_with'
  | 'ends_with';

export interface FilterCondition {
  id: string;
  column: string;
  operator: Operator;
  value: string;
}

export interface TableInfo {
  name: string;
  sql: string;
}

export interface TableData {
  columns: string[];
  columnTypes: Record<string, string>;
  rows: Record<string, any>[];
}