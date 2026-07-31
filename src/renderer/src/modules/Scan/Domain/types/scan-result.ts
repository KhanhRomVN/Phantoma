// Scan-local ScanResult type for active domain scanning
import type { DataPoint, DataSource } from './scan-data-point';

export interface ScanResult {
  query: {
    value: string;
    type: 'domain';
  };
  scan: {
    startedAt: string;
    completedAt: string;
    duration: number;
    totalRawHits: number;
    totalProcessedHits: number;
    scanType: string;
  };
  allDataPoints: DataPoint[];
  sources: DataSource[];
  activeCategoryGroups: (SmartCategoryGroup & { isActive: boolean; count: number })[];
  overallConfidence: number;
  warnings: string[];
}

// Inline SmartCategoryGroup to avoid circular dependency
export interface SmartCategoryGroup {
  id: string;
  label: string;
  icon: string;
  accent: string;
  priority: number;
  description: string;
  categories: string[];
  isActive: boolean;
  count: number;
}