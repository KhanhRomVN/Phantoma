/**
 * Network Scan Parser — transforms raw network scan JSON into structured ScanResult.
 */
import type { ScanResult, SmartCategoryGroup } from '../types/scan-result';
import type { DataPoint, DataSource } from '../types/scan-data-point';
import {
  normalizeHostDiscovery,
  normalizePortScan,
  normalizeServiceVersion,
  normalizeOsDetection,
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
    type: 'network',
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
      'Ping Sweep (ICMP + TCP SYN 80/443)': 0.95,
      'Port Scan (TCP SYN, top 1000)': 0.9,
      'Service & Version Detection (nmap -sV)': 0.88,
      'OS Fingerprinting (nmap -O)': 0.85,
    };
    const source: DataSource = {
      id: `src-net-${name.toLowerCase().replace(/[\s()&,]+/g, '-')}`,
      name,
      type: type as DataSource['type'],
      credibility: credibilityMap[name] || 0.7,
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

      if (sourceType === 'host_discovery' && obj.ip !== undefined && obj.status !== undefined) {
        const dp = normalizeHostDiscovery(
          {
            ip: String(obj.ip),
            status: obj.status === 'up' ? 'up' : 'down',
            method: String(obj.method || 'none'),
            latency_ms: obj.latency_ms ? Number(obj.latency_ms) : undefined,
          },
          source,
        );
        scoreDataPoint(dp);
        allDataPoints.push(dp);
        continue;
      }

      if (sourceType === 'port_scan' && obj.ip !== undefined && obj.ports !== undefined) {
        const dps = normalizePortScan(
          {
            ip: String(obj.ip),
            ports: (obj.ports as Array<{ port: number; state: string; service: string }>).map(p => ({
              port: p.port,
              state: p.state as 'open' | 'filtered' | 'closed',
              service: p.service,
            })),
          },
          source,
        );
        for (const dp of dps) {
          scoreDataPoint(dp);
          allDataPoints.push(dp);
        }
        continue;
      }

      if (sourceType === 'service_version' && obj.ip !== undefined && obj.services !== undefined) {
        const dps = normalizeServiceVersion(
          {
            ip: String(obj.ip),
            services: (obj.services as Array<{
              port: number;
              protocol: string;
              service: string;
              product?: string;
              version?: string;
              extra?: string;
              cpe?: string;
            }>).map(s => ({
              port: s.port,
              protocol: s.protocol as 'tcp' | 'udp',
              service: s.service,
              product: s.product,
              version: s.version,
              extra: s.extra,
              cpe: s.cpe,
            })),
          },
          source,
        );
        for (const dp of dps) {
          scoreDataPoint(dp);
          allDataPoints.push(dp);
        }
        continue;
      }

      if (sourceType === 'os_detection' && obj.ip !== undefined && obj.operatingSystem !== undefined) {
        const dp = normalizeOsDetection(
          {
            ip: String(obj.ip),
            operatingSystem: String(obj.operatingSystem),
            accuracy: Number(obj.accuracy || 0),
            cpe: obj.cpe ? String(obj.cpe) : undefined,
            fingerprintRaw: obj.fingerprintRaw ? String(obj.fingerprintRaw) : undefined,
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
    query: { value: query.value, type: 'network' },
    scan,
    allDataPoints,
    sources: allSources,
    activeCategoryGroups,
    overallConfidence,
    warnings,
  };
}