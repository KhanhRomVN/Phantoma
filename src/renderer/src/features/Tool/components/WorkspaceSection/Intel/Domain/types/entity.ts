// Domain-local Entity types — replaces import from Person module
import type { DataPoint, DataSource } from './data-point';

export type EntityRelevance = 'primary' | 'secondary' | 'tertiary' | 'noise';

export interface ReconEntity {
  id: string;
  displayName: string;
  summary: string;
  confidence: number;
  relevance: EntityRelevance;
  riskScore?: number;
  dataPoints: DataPoint[];
  sources: DataSource[];
}