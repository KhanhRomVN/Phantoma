export interface SourceStats {
  healthy: number;
  dead: number;
  avgLatency: number;
  quotaUsedGb: number;
  quotaTotalGb: number;
  expiring: number;
}

export type SourceInput = { name?: string; websiteUrl?: string };
