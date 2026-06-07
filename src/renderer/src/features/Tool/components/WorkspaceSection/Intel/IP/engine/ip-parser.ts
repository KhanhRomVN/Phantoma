/**
 * IP RECON Parser — transforms raw JSON output from IP RECON tools into structured ReconResult.
 */
import type { ReconResult } from '../../Person/types/recon-result';
import type { DataPoint } from '../../Person/types/data-point';
import type { DataSource } from '../../Person/types/source';
import { disambiguateEntities } from '../../Person/engine/entity-disambiguator';
import { scoreDataPoint, calculateRiskScore } from '../../Person/engine/confidence-scorer';
import {
  normalizeService,
  normalizeReverseIPDomain,
  normalizeGeoIP,
  normalizeASN,
  normalizeBGPPrefix,
  normalizeVulnerability,
  normalizeAbuseReport,
  normalizeIPMention,
  normalizeIPCertificate,
  normalizeRelatedIP,
} from './ip-normalizer';
import { IP_CATEGORY_GROUPS } from '../types/ip-categories';

function classifyIPDataPoints(dataPoints: DataPoint[]): NonNullable<ReconResult['activeCategoryGroups']> {
  const categoryCounts = new Map<string, number>();
  for (const dp of dataPoints) {
    const count = categoryCounts.get(dp.category) || 0;
    categoryCounts.set(dp.category, count + 1);
  }

  return IP_CATEGORY_GROUPS.map(g => ({
    ...g,
    isActive: ['overview', 'raw', 'sources'].includes(g.id) || g.categories.some(c => (categoryCounts.get(c) || 0) > 0),
    count: g.id === 'overview'
      ? dataPoints.length
      : g.id === 'sources'
        ? new Set(dataPoints.map(dp => dp.source.id)).size
        : g.id === 'timeline'
          ? dataPoints.filter(dp => dp.discoveredAt).length
          : g.categories.reduce((sum, c) => sum + (categoryCounts.get(c) || 0), 0),
  })).sort((a, b) => a.priority - b.priority);
}

export function parseIPReconResult(rawData: Record<string, unknown>): ReconResult {
  const allDataPoints: DataPoint[] = [];
  const allSources: DataSource[] = [];
  const sourceMap = new Map<string, DataSource>();

  const query = (rawData.query as { value: string; type: string }) || { value: 'Unknown', type: 'ip' };
  const scanRaw = rawData.scan as Record<string, unknown> || {};
  const scan = {
    startedAt: String(scanRaw.startedAt || new Date().toISOString()),
    completedAt: String(scanRaw.completedAt || new Date().toISOString()),
    duration: Number(scanRaw.duration || 0),
    totalRawHits: Number(scanRaw.totalRawHits || 0),
    totalProcessedHits: Number(scanRaw.totalProcessedHits || 0),
  };

  function getSource(name: string, type: string): DataSource {
    if (sourceMap.has(name)) return sourceMap.get(name)!;
    const credibilityMap: Record<string, number> = {
      'Shodan': 0.85,
      'Censys': 0.85,
      'SecurityTrails': 0.85,
      'IP-API': 0.8,
      'MaxMind GeoIP': 0.85,
      'BGPView': 0.8,
      'BGP.tools': 0.85,
      'AbuseIPDB': 0.75,
      'VirusTotal': 0.8,
      'AlienVault OTX': 0.75,
      'DNSDB': 0.8,
      'crt.sh': 0.9,
      'Spamhaus': 0.85,
      'Censys IPv4 Scan': 0.85,
      'Social Media / Forums': 0.4,
    };
    const source: DataSource = {
      id: `src-ip-${name.toLowerCase().replace(/[\s/.]+/g, '-')}`,
      name,
      type: type as DataSource['type'],
      credibility: credibilityMap[name] || 0.5,
    };
    sourceMap.set(name, source);
    allSources.push(source);
    return source;
  }

  const rawDataBlocks = rawData.rawData as Array<Record<string, unknown>> || [];

  for (const block of rawDataBlocks) {
    const sourceName = String(block.source || 'Unknown');
    const sourceType = String(block.type || 'other');
    const source = getSource(sourceName, sourceType);
    const items = block.items as unknown[] || [];

    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue;
      const obj = item as Record<string, unknown>;

      // Shodan/Censys services
      if ((sourceType === 'shodan' || sourceType === 'censys') && obj.port !== undefined) {
        const dp = normalizeService(
          {
            port: Number(obj.port),
            transport: String(obj.transport || 'tcp'),
            service: String(obj.service || 'unknown'),
            product: obj.product ? String(obj.product) : undefined,
            version: obj.version ? String(obj.version) : undefined,
            banner: obj.banner ? String(obj.banner) : undefined,
            lastSeen: obj.lastSeen ? String(obj.lastSeen) : undefined,
          },
          source,
        );
        scoreDataPoint(dp);
        allDataPoints.push(dp);
        continue;
      }

      // Reverse IP / Passive DNS
      if ((sourceType === 'reverse_ip' || sourceType === 'passive_dns') && obj.domain) {
        const dp = normalizeReverseIPDomain(
          {
            domain: String(obj.domain),
            firstSeen: obj.firstSeen ? String(obj.firstSeen) : undefined,
            lastSeen: obj.lastSeen ? String(obj.lastSeen) : undefined,
          },
          source,
          rawData.targetDomain ? String(rawData.targetDomain) : undefined,
        );
        scoreDataPoint(dp);
        allDataPoints.push(dp);
        continue;
      }

      // GeoIP
      if (sourceType === 'geoip' && obj.country) {
        const dps = normalizeGeoIP(
          {
            country: String(obj.country),
            city: String(obj.city || 'Unknown'),
            latitude: obj.latitude ? Number(obj.latitude) : undefined,
            longitude: obj.longitude ? Number(obj.longitude) : undefined,
          },
          source,
        );
        for (const dp of dps) {
          scoreDataPoint(dp);
          allDataPoints.push(dp);
        }
        continue;
      }

      // ASN / BGP
      if (sourceType === 'bgp' || sourceType === 'network') {
        if (obj.asn) {
          const dp = normalizeASN(String(obj.asn), source);
          scoreDataPoint(dp);
          allDataPoints.push(dp);
        }
        if (obj.prefix) {
          const dp = normalizeBGPPrefix(String(obj.prefix), source);
          scoreDataPoint(dp);
          allDataPoints.push(dp);
        }
        continue;
      }

      // Vulnerabilities
      if (sourceType === 'vulnerabilities' && obj.cve) {
        const dp = normalizeVulnerability(
          String(obj.cve),
          String(obj.description || ''),
          String(obj.severity || 'MEDIUM'),
          obj.port ? Number(obj.port) : null,
          source,
        );
        scoreDataPoint(dp);
        allDataPoints.push(dp);
        continue;
      }

      // Abuse reports
      if (sourceType === 'abuse_reports' && obj.reportType) {
        const dp = normalizeAbuseReport(
          String(obj.reportType),
          String(obj.date || ''),
          String(obj.description || ''),
          source,
        );
        scoreDataPoint(dp);
        allDataPoints.push(dp);
        continue;
      }

      // Mentions
      if (sourceType === 'mentions' && obj.platform && obj.snippet) {
        const dp = normalizeIPMention(
          String(obj.platform),
          String(obj.url || ''),
          String(obj.snippet),
          obj.date ? String(obj.date) : undefined,
          source,
        );
        scoreDataPoint(dp);
        allDataPoints.push(dp);
        continue;
      }

      // SSL Certificates on IP
      if (sourceType === 'ssl_certs' && obj.issuer && obj.domains) {
        const certDps = normalizeIPCertificate(
          String(obj.issuer),
          String(obj.validFrom || ''),
          String(obj.validTo || ''),
          obj.domains as string[],
          source,
          rawData.targetDomain ? String(rawData.targetDomain) : undefined,
        );
        for (const dp of certDps) {
          scoreDataPoint(dp);
          allDataPoints.push(dp);
        }
        continue;
      }

      // Related IPs
      if (sourceType === 'related_ips' && obj.ip) {
        const dp = normalizeRelatedIP(
          String(obj.ip),
          String(obj.relationship || 'same-subnet'),
          source,
        );
        scoreDataPoint(dp);
        allDataPoints.push(dp);
        continue;
      }
    }
  }

  const { entities, unassigned } = disambiguateEntities(allDataPoints, allSources);

  for (const entity of entities) {
    entity.riskScore = calculateRiskScore(entity);
  }

  const activeCategoryGroups = classifyIPDataPoints(allDataPoints);

  const overallConfidence = allDataPoints.length > 0
    ? allDataPoints.reduce((sum, dp) => sum + dp.confidence, 0) / allDataPoints.length
    : 0;

  const warnings = (rawData.warnings as string[]) || [];

  return {
    query: { value: query.value, type: (query.type as 'ip') || 'ip' },
    scan,
    entities,
    allDataPoints,
    unassignedDataPoints: unassigned,
    sources: allSources,
    activeCategoryGroups,
    overallConfidence,
    warnings,
  };
}