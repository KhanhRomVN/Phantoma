/**
 * IP RECON Parser — transforms raw JSON output from IP RECON tools into structured ReconResult.
 */
import type { ReconResult } from '../types/recon-result';
import type { DataPoint } from '../types/data-point';
import type { DataSource } from '../types/data-point';
import { disambiguateEntities } from './entity-disambiguator';
import { scoreDataPoint, calculateRiskScore } from './confidence-scorer';
import {
  normalizePortService,
  normalizePortSsl,
  normalizeHostedDomain,
  normalizeGeoIp,
  normalizeBgp,
  normalizeThreatReport,
  normalizeAbuseReport,
  normalizeSpamListing,
  normalizeNoiseIntel,
  normalizeIpCertificate,
  normalizeIpMention,
  normalizeIndexedPage,
  normalizeMalwareUrl,
  normalizeReputation,
  normalizeScanReport,
  normalizePassiveDnsDomain,
} from './ip-normalizer';
import { IP_CATEGORY_GROUPS } from '../types/ip-categories';
import type { SmartCategoryGroup } from '../types/smart-category';

/**
 * Classify IP data points into category groups.
 */
function classifyIpDataPoints(dataPoints: DataPoint[]): ReconResult['activeCategoryGroups'] {
  const categoryCounts = new Map<string, number>();
  for (const dp of dataPoints) {
    const count = categoryCounts.get(dp.category) || 0;
    categoryCounts.set(dp.category, count + 1);
  }

  return IP_CATEGORY_GROUPS.map((g): SmartCategoryGroup & { isActive: boolean; count: number } => ({
    id: g.id,
    label: g.label,
    icon: g.icon,
    accent: g.accent,
    priority: g.priority,
    description: g.description,
    categories: g.categories as string[],
    isActive: ['overview', 'raw', 'sources'].includes(g.id) || g.categories.some((c: string) => (categoryCounts.get(c) || 0) > 0),
    count: g.id === 'overview'
      ? dataPoints.length
      : g.id === 'sources'
        ? new Set(dataPoints.map(dp => dp.source.id)).size
        : g.id === 'timeline'
          ? dataPoints.filter(dp => dp.discoveredAt).length
          : g.categories.reduce((sum: number, c: string) => sum + (categoryCounts.get(c) || 0), 0),
  })).sort((a, b) => a.priority - b.priority);
}

/**
 * Parse raw IP RECON JSON into a structured ReconResult.
 */
export function parseIpReconResult(rawData: Record<string, unknown>): ReconResult {
  const allDataPoints: DataPoint[] = [];
  const allSources: DataSource[] = [];
  const sourceMap = new Map<string, DataSource>();

  // Extract query
  const query = (rawData.query as { value: string; type: string }) || { value: 'Unknown', type: 'ip' };

  // Target domain (for filtering relevance)
  const targetDomain = rawData.targetDomain as string | undefined;

  // Extract scan metadata
  const scanRaw = rawData.scan as Record<string, unknown> || {};
  const scan = {
    startedAt: String(scanRaw.startedAt || new Date().toISOString()),
    completedAt: String(scanRaw.completedAt || new Date().toISOString()),
    duration: Number(scanRaw.duration || 0),
    totalRawHits: Number(scanRaw.totalRawHits || 0),
    totalProcessedHits: Number(scanRaw.totalProcessedHits || 0),
  };

  // Helper to get or create source
  function getSource(name: string, type: string): DataSource {
    const key = name;
    if (sourceMap.has(key)) return sourceMap.get(key)!;
    const credibilityMap: Record<string, number> = {
      'Shodan': 0.9,
      'Censys IPv4 Scan': 0.85,
      'SecurityTrails': 0.85,
      'DNSDB': 0.85,
      'RiskIQ': 0.8,
      'IP-API': 0.7,
      'MaxMind GeoIP': 0.8,
      'IP2Location': 0.75,
      'BGP.tools': 0.9,
      'BGPView': 0.85,
      'RIPEStat': 0.9,
      'AlienVault OTX': 0.8,
      'AbuseIPDB': 0.75,
      'Spamhaus': 0.85,
      'VirusTotal': 0.8,
      'GreyNoise': 0.75,
      'crt.sh (IP-based)': 0.85,
      'Urlscan.io': 0.75,
      'CommonCrawl': 0.7,
      'Social Media / Forums': 0.4,
      'Internet Storm Center (SANS)': 0.75,
      'Shadowserver': 0.7,
      'Cisco Talos': 0.8,
      'URLhaus': 0.75,
    };
    const source: DataSource = {
      id: `src-ip-${name.toLowerCase().replace(/[\s/()]+/g, '-')}`,
      name,
      type: type as DataSource['type'],
      credibility: credibilityMap[name] || 0.5,
    };
    sourceMap.set(key, source);
    allSources.push(source);
    return source;
  }

  // Process raw data blocks
  const rawDataBlocks = rawData.rawData as Array<Record<string, unknown>> || [];

  for (const block of rawDataBlocks) {
    const sourceName = String(block.source || 'Unknown');
    const sourceType = String(block.type || 'other');
    const source = getSource(sourceName, sourceType);
    const items = block.items as unknown[] || [];

    for (const item of items) {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;

        // Shodan / Censys port scan
        if ((sourceType === 'shodan' || sourceType === 'censys') && obj.port !== undefined) {
          const port = Number(obj.port);
          const transport = String(obj.transport || 'tcp');
          const service = String(obj.service || 'unknown');
          const product = obj.product ? String(obj.product) : null;
          const version = obj.version ? String(obj.version) : null;
          const banner = obj.banner ? String(obj.banner) : null;
          const note = obj.note ? String(obj.note) : undefined;

          const portDps = normalizePortService(port, transport, service, product, version, banner, source, note);
          for (const dp of portDps) {
            scoreDataPoint(dp);
            allDataPoints.push(dp);
          }

          // SSL info
          if (obj.ssl) {
            const ssl = obj.ssl as Record<string, unknown>;
            const issuer = String(ssl.issuer || '');
            const subject = String(ssl.subject || '');
            const san = ssl.san as string[] | undefined;
            const sslDps = normalizePortSsl(issuer, subject, san, source, port);
            for (const dp of sslDps) {
              scoreDataPoint(dp);
              allDataPoints.push(dp);
            }
          }

          // TLS info from censys
          if (obj.tls) {
            const tls = obj.tls as Record<string, unknown>;
            if (tls.version) {
              const dp = createSimpleDp('tls_version', 'TLS Version', String(tls.version), source, { metadata: { port } });
              scoreDataPoint(dp);
              allDataPoints.push(dp);
            }
            if (tls.cipher) {
              const dp = createSimpleDp('tls_cipher', 'TLS Cipher', String(tls.cipher), source, { metadata: { port } });
              scoreDataPoint(dp);
              allDataPoints.push(dp);
            }
            if (tls.certificate) {
              const cert = tls.certificate as Record<string, unknown>;
              const parsed = cert.parsed as Record<string, unknown> | undefined;
              if (parsed) {
                const issuer = String(parsed.issuer_dn || '');
                const subject = String(parsed.subject_dn || '');
                const san = parsed.san as string[] | undefined;
                const sslDps = normalizePortSsl(issuer, subject, san, source, port);
                for (const dp of sslDps) {
                  scoreDataPoint(dp);
                  allDataPoints.push(dp);
                }
              }
            }
          }
          continue;
        }

        // Reverse IP / hosted domains
        if (sourceType === 'reverse_ip' && obj.domain) {
          const dp = normalizeHostedDomain(
            String(obj.domain),
            obj.firstSeen ? String(obj.firstSeen) : undefined,
            obj.lastSeen ? String(obj.lastSeen) : undefined,
            source,
            targetDomain,
          );
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // Passive DNS
        if (sourceType === 'passive_dns' && obj.domain) {
          const dp = normalizePassiveDnsDomain(
            String(obj.domain),
            obj.firstSeen ? String(obj.firstSeen) : undefined,
            obj.lastSeen ? String(obj.lastSeen) : undefined,
            obj.type ? String(obj.type) : undefined,
            source,
            targetDomain,
          );
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // GeoIP
        if (sourceType === 'geoip') {
          for (const [key, value] of Object.entries(obj)) {
            if (value !== null && value !== undefined && typeof value !== 'object') {
              const dp = normalizeGeoIp(key, String(value), source);
              scoreDataPoint(dp);
              allDataPoints.push(dp);
            }
          }
          continue;
        }

        // BGP
        if (sourceType === 'bgp') {
          const asn = obj.asn ? String(obj.asn) : undefined;
          const prefix = obj.prefix ? String(obj.prefix) : undefined;
          const peers = obj.peers as string[] | undefined;
          const upstreams = obj.upstreams as string[] | undefined;
          const origin = obj.origin ? String(obj.origin) : undefined;
          const bgpDps = normalizeBgp(asn, prefix, peers, upstreams, origin, source);
          for (const dp of bgpDps) {
            scoreDataPoint(dp);
            allDataPoints.push(dp);
          }
          continue;
        }

        // Threat intel
        if (sourceType === 'threat_intel' && obj.reportType) {
          const dp = normalizeThreatReport(
            String(obj.reportType),
            String(obj.date || ''),
            String(obj.description || ''),
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

        // Spam listings
        if (sourceType === 'spam_list' && obj.reportType) {
          const dp = normalizeSpamListing(
            String(obj.reportType),
            String(obj.date || ''),
            String(obj.description || ''),
            source,
          );
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // Noise intel (GreyNoise)
        if (sourceType === 'noise_intel') {
          const dp = normalizeNoiseIntel(
            obj.tag ? String(obj.tag) : undefined,
            String(obj.classification || 'unknown'),
            source,
            obj.note ? String(obj.note) : undefined,
          );
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // SSL certificates (IP-based)
        if ((sourceType === 'ssl_certs') && obj.issuer && obj.domains) {
          const certDps = normalizeIpCertificate(
            {
              issuer: String(obj.issuer),
              validFrom: String(obj.validFrom || ''),
              validTo: String(obj.validTo || ''),
              domains: obj.domains as string[],
            },
            source,
            targetDomain,
          );
          for (const dp of certDps) {
            scoreDataPoint(dp);
            allDataPoints.push(dp);
          }
          continue;
        }

        // Internet mentions
        if (sourceType === 'mentions' && obj.platform && obj.snippet) {
          const dp = normalizeIpMention(
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

        // Indexed pages
        if (sourceType === 'index_pages' && obj.url) {
          const dp = normalizeIndexedPage(
            String(obj.url),
            source,
            obj.lastSeen ? String(obj.lastSeen) : undefined,
            obj.note ? String(obj.note) : undefined,
          );
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // Malware URLs
        if (sourceType === 'malware_urls' && obj.url) {
          const dp = normalizeMalwareUrl(
            String(obj.url),
            String(obj.status || 'unknown'),
            String(obj.date || ''),
            obj.tags as string[] | undefined,
            source,
          );
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // Reputation
        if (sourceType === 'reputation' && obj.reputation) {
          const repDps = normalizeReputation(
            String(obj.reputation),
            String(obj.volume || 'unknown'),
            source,
            obj.firstSeen ? String(obj.firstSeen) : undefined,
          );
          for (const dp of repDps) {
            scoreDataPoint(dp);
            allDataPoints.push(dp);
          }
          continue;
        }

        // Scan reports
        if (sourceType === 'scan_reports' && obj.reportType) {
          const dp = normalizeScanReport(
            String(obj.reportType),
            String(obj.date || ''),
            String(obj.description || ''),
            source,
          );
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }
      }
    }
  }

  // Run entity disambiguation
  const { entities, unassigned } = disambiguateEntities(allDataPoints, allSources);

  // Calculate risk scores for entities
  for (const entity of entities) {
    entity.riskScore = calculateRiskScore(entity);
  }

  // Classify into category groups
  const activeCategoryGroups = classifyIpDataPoints(allDataPoints);

  // Overall confidence
  const overallConfidence = entities.length > 0
    ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
    : allDataPoints.length > 0
      ? allDataPoints.reduce((sum, dp) => sum + dp.confidence, 0) / allDataPoints.length
      : 0;

  // Warnings
  const warnings = (rawData.warnings as string[]) || [];

  return {
    query: { value: query.value, type: 'ip' as const },
    targetDomain,
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

// Helper for simple data points (used inline in parser)
let _simpleCounter = 0;
function createSimpleDp(
  category: string,
  label: string,
  value: string,
  source: DataSource,
  overrides: Partial<DataPoint> = {},
): DataPoint {
  return {
    id: `dp-ip-simple-${Date.now()}-${++_simpleCounter}`,
    category,
    label,
    value,
    displayValue: value.substring(0, 200),
    confidence: 0.7,
    source,
    relevance: 0.5,
    isNoise: false,
    verificationStatus: 'unverified',
    discoveredAt: new Date().toISOString(),
    ...overrides,
  };
}