/**
 * Scan Parser — transforms raw active scan JSON into structured ScanResult.
 */
import type { ScanResult, SmartCategoryGroup } from '../types/scan-result';
import type { DataPoint, DataSource } from '../types/scan-data-point';
import {
  normalizeZoneTransfer,
  normalizeBruteForceResult,
  normalizeDnsEnum,
  normalizeMisconfig,
} from './scan-normalizer';
import { SCAN_CATEGORY_GROUPS } from '../types/scan-categories';
import { scoreDataPoint } from './confidence-scorer';

function classifyScanDataPoints(dataPoints: DataPoint[]): ScanResult['activeCategoryGroups'] {
  const categoryCounts = new Map<string, number>();
  for (const dp of dataPoints) {
    const count = categoryCounts.get(dp.category) || 0;
    categoryCounts.set(dp.category, count + 1);
  }

  return SCAN_CATEGORY_GROUPS.map((g): SmartCategoryGroup & { isActive: boolean; count: number } => ({
    id: g.id,
    label: g.label,
    icon: g.icon,
    accent: g.accent,
    priority: g.priority,
    description: g.description,
    categories: g.categories as string[],
    isActive:
      ['overview', 'raw', 'sources'].includes(g.id) ||
      g.categories.some((c: string) => (categoryCounts.get(c) || 0) > 0),
    count:
      g.id === 'overview'
        ? dataPoints.length
        : g.id === 'sources'
          ? new Set(dataPoints.map((dp) => dp.source.id)).size
          : g.categories.reduce(
              (sum: number, c: string) => sum + (categoryCounts.get(c) || 0),
              0,
            ),
  })).sort((a, b) => a.priority - b.priority);
}

export function parseScanResult(rawData: Record<string, unknown>): ScanResult {
  const allDataPoints: DataPoint[] = [];
  const allSources: DataSource[] = [];
  const sourceMap = new Map<string, DataSource>();

  const query = (rawData.query as { value: string; type: string }) || {
    value: 'Unknown',
    type: 'domain',
  };

  const scanRaw = (rawData.scan as Record<string, unknown>) || {};
  const scan = {
    startedAt: String(scanRaw.startedAt || new Date().toISOString()),
    completedAt: String(scanRaw.completedAt || new Date().toISOString()),
    duration: Number(scanRaw.duration || 0),
    totalRawHits: Number(scanRaw.totalRawHits || 0),
    totalProcessedHits: Number(scanRaw.totalProcessedHits || 0),
    scanType: String(scanRaw.scanType || 'active'),
  };

  function getSource(name: string, type: string): DataSource {
    const key = name;
    if (sourceMap.has(key)) return sourceMap.get(key)!;
    const credibilityMap: Record<string, number> = {
      'DNS Zone Transfer (AXFR)': 0.95,
      'DNS Brute‑force (Active Subdomain)': 0.8,
      'DNS Active Checks': 0.9,
      'DNS Misconfiguration Check': 0.85,
    };
    const source: DataSource = {
      id: `src-scan-${name.toLowerCase().replace(/[\s()‑]+/g, '-')}`,
      name,
      type: type as DataSource['type'],
      credibility: credibilityMap[name] || 0.5,
    };
    sourceMap.set(key, source);
    allSources.push(source);
    return source;
  }

  const rawDataBlocks = (rawData.rawData as Array<Record<string, unknown>>) || [];

  for (const block of rawDataBlocks) {
    const sourceName = String(block.source || 'Unknown');
    const sourceType = String(block.type || 'other');
    const source = getSource(sourceName, sourceType);
    const items = (block.items as unknown[]) || [];

    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue;
      const obj = item as Record<string, unknown>;

      if (sourceType === 'zone_transfer' && obj.nameserver !== undefined) {
        const dps = normalizeZoneTransfer(
          {
            nameserver: String(obj.nameserver),
            success: Boolean(obj.success),
            error: obj.error ? String(obj.error) : undefined,
            records: obj.records as Array<{ name: string; type: string; value: string; ttl: number }> | undefined,
            note: obj.note ? String(obj.note) : undefined,
          },
          source,
        );
        for (const dp of dps) {
          scoreDataPoint(dp);
          allDataPoints.push(dp);
        }
        continue;
      }

      if (sourceType === 'dns_bruteforce' && obj.subdomain !== undefined) {
        const dp = normalizeBruteForceResult(
          {
            subdomain: String(obj.subdomain),
            resolved: Boolean(obj.resolved),
            ip: obj.ip ? String(obj.ip) : undefined,
            latency_ms: obj.latency_ms ? Number(obj.latency_ms) : undefined,
            note: obj.note ? String(obj.note) : undefined,
          },
          source,
        );
        scoreDataPoint(dp);
        allDataPoints.push(dp);
        continue;
      }

      if (sourceType === 'dns_enumeration' && obj.type && (obj.response || obj.status)) {
        const dp = normalizeDnsEnum(
          String(obj.type),
          String(obj.target || obj.domain || ''),
          String(obj.response || obj.status || ''),
          source,
        );
        if (obj.note) {
          dp.metadata = { ...dp.metadata, note: obj.note };
        }
        scoreDataPoint(dp);
        allDataPoints.push(dp);
        continue;
      }

      if (sourceType === 'dns_misconfig' && obj.issue && obj.severity) {
        const dp = normalizeMisconfig(
          {
            issue: String(obj.issue),
            severity: String(obj.severity) as 'critical' | 'high' | 'medium' | 'low' | 'info',
            detail: String(obj.detail || ''),
            nameserver: obj.nameserver ? String(obj.nameserver) : undefined,
            ip: obj.ip ? String(obj.ip) : undefined,
            domain: obj.domain ? String(obj.domain) : undefined,
            record: obj.record ? String(obj.record) : undefined,
            nameservers: obj.nameservers as string[] | undefined,
            affected_records: obj.affected_records as string[] | undefined,
          },
          source,
        );
        scoreDataPoint(dp);
        allDataPoints.push(dp);
        continue;
      }
    }
  }

  const activeCategoryGroups = classifyScanDataPoints(allDataPoints);

  const overallConfidence =
    allDataPoints.length > 0
      ? allDataPoints.reduce((sum, dp) => sum + dp.confidence, 0) / allDataPoints.length
      : 0;

  const warnings = (rawData.warnings as string[]) || [];

  return {
    query: { value: query.value, type: 'domain' },
    scan,
    allDataPoints,
    sources: allSources,
    activeCategoryGroups,
    overallConfidence,
    warnings,
  };
}