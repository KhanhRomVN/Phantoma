// IP-local Entity types
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