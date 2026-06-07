import type { ReconEntity } from './entity';
import type { DataPoint } from './data-point';
import type { DataSource } from './source';
import type { SmartCategoryGroup } from './smart-category';

/**
 * Top-level RECON result.
 * Contains all entities found, all data points, and metadata.
 * This is what the UI receives and renders.
 */
export interface ReconResult {
  /** Original query */
  query: {
    value: string;
    type: 'name' | 'email' | 'username' | 'phone' | 'domain';
  };
  /** Scan metadata */
  scan: {
    startedAt: string;
    completedAt: string;
    duration: number; // milliseconds
    totalRawHits: number;
    totalProcessedHits: number;
  };
  /** All entities found (including noise entities) */
  entities: ReconEntity[];
  /** All data points (including unassigned) */
  allDataPoints: DataPoint[];
  /** Unassigned data points (couldn't be clustered into any entity) */
  unassignedDataPoints: DataPoint[];
  /** All sources used */
  sources: DataSource[];
  /** Active category groups (tabs to show) */
  activeCategoryGroups: SmartCategoryGroup[];
  /** Overall confidence in the entire result set */
  overallConfidence: number;
  /** Warnings about data quality */
  warnings: string[];
  /** Notes from the analyst */
  analystNotes?: string;
}

// Re-export for convenience
export type { ReconEntity, DataPoint, DataSource, SmartCategoryGroup };