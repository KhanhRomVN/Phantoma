// IP-local ReconResult type
import type { DataPoint, DataSource } from './data-point';
import type { ReconEntity } from './entity';
import type { SmartCategoryGroup } from './smart-category';

export interface ReconResult {
  query: {
    value: string;
    type: 'ip';
  };
  targetDomain?: string;
  scan: {
    startedAt: string;
    completedAt: string;
    duration: number;
    totalRawHits: number;
    totalProcessedHits: number;
  };
  entities: ReconEntity[];
  allDataPoints: DataPoint[];
  unassignedDataPoints: DataPoint[];
  sources: DataSource[];
  activeCategoryGroups: (SmartCategoryGroup & { isActive: boolean; count: number })[];
  overallConfidence: number;
  warnings: string[];
}