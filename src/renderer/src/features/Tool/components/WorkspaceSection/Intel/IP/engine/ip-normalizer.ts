/**
 * IP Data Normalizer — IP-specific normalization functions.
 */
import type { DataPoint } from '../../Person/types/data-point';
import type { DataSource } from '../../Person/types/source';
import type { IPDataCategory } from '../types/ip-categories';

let _dpCounter = 0;
function nextId(): string {
  return `dp-ip-${Date.now()}-${++_dpCounter}`;
}

function createDP(
  category: IPDataCategory,
  label: string,
  value: unknown,
  source: DataSource,
  overrides: Partial<DataPoint> = {},
): DataPoint {
  return {
    id: nextId(),
    category,
    label,
    value,
    displayValue: typeof value === 'string' ? value.substring(0, 200) : String(value).substring(0, 200),
    confidence: 0.5,
    source,
    relevance: 0.5,
    isNoise: false,
    verificationStatus: 'unverified',
    discoveredAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Normalize a Shodan service into a DataPoint.
 */
export function normalizeService(
  service: { port: number; transport: string; service: string; product?: string; version?: string; banner?: string; lastSeen?: string },
  source: DataSource,
): DataPoint {
  const label = `${service.port}/${service.transport}`;
  const value = `${service.service}${service.product ? ' — ' + service.product : ''}${service.version ? ' ' + service.version : ''}`;

  return createDP('ip_service_banner', label, value, source, {
    displayValue: value,
    confidence: 0.85,
    relevance: 0.8,
    metadata: {
      port: service.port,
      transport: service.transport,
      service: service.service,
      product: service.product,
      version: service.version,
      banner: service.banner,
      lastSeen: service.lastSeen,
    },
    tags: [service.service, service.transport, service.port < 1024 ? 'privileged' : 'unprivileged'],
    discoveredAt: service.lastSeen,
  });
}

/**
 * Normalize a reverse IP domain entry.
 */
export function normalizeReverseIPDomain(
  domain: { domain: string; firstSeen?: string; lastSeen?: string },
  source: DataSource,
  targetDomain?: string,
): DataPoint {
  // Check if related to the target
  const isRelated = targetDomain
    ? domain.domain.includes(targetDomain.replace('www.', ''))
    : false;

  return createDP('reverse_ip', 'Reverse IP Domain', domain.domain, source, {
    displayValue: domain.domain,
    confidence: 0.8,
    relevance: isRelated ? 0.8 : 0.3,
    isNoise: !isRelated,
    metadata: {
      firstSeen: domain.firstSeen,
      lastSeen: domain.lastSeen,
    },
    tags: [isRelated ? 'related' : 'unrelated', ...(source.name ? [source.name.toLowerCase().replace(/\s+/g, '-')] : [])],
  });
}

/**
 * Normalize GeoIP data.
 */
export function normalizeGeoIP(
  geo: { country: string; city: string; latitude?: number; longitude?: number },
  source: DataSource,
): DataPoint[] {
  const dps: DataPoint[] = [];

  dps.push(createDP('ip_geo_location', 'GeoIP Location', `${geo.city}, ${geo.country}`, source, {
    confidence: 0.85,
    relevance: 0.7,
    metadata: geo,
  }));

  if (geo.latitude !== undefined && geo.longitude !== undefined) {
    dps.push(createDP('ip_geo_location', 'Coordinates', `${geo.latitude}, ${geo.longitude}`, source, {
      confidence: 0.85,
      relevance: 0.5,
      metadata: { lat: geo.latitude, lon: geo.longitude },
    }));
  }

  return dps;
}

/**
 * Normalize ASN data.
 */
export function normalizeASN(
  asn: string,
  source: DataSource,
): DataPoint {
  return createDP('ip_asn', 'ASN', asn, source, {
    confidence: 0.9,
    relevance: 0.7,
  });
}

/**
 * Normalize BGP prefix.
 */
export function normalizeBGPPrefix(
  prefix: string,
  source: DataSource,
): DataPoint {
  return createDP('ip_bgp_prefix', 'BGP Prefix', prefix, source, {
    confidence: 0.85,
    relevance: 0.6,
  });
}

/**
 * Normalize a vulnerability/CVE finding.
 */
export function normalizeVulnerability(
  cve: string,
  description: string,
  severity: string,
  port: number | null,
  source: DataSource,
): DataPoint {
  return createDP('ip_vulnerability', cve, description, source, {
    displayValue: `[${severity}] ${cve}: ${description.substring(0, 120)}`,
    confidence: 0.7,
    relevance: severity === 'CRITICAL' || severity === 'HIGH' ? 0.9 : 0.6,
    metadata: { cve, severity, port },
    tags: [severity.toLowerCase(), 'cve', port ? `port-${port}` : ''],
  });
}

/**
 * Normalize an abuse report.
 */
export function normalizeAbuseReport(
  reportType: string,
  date: string,
  description: string,
  source: DataSource,
): DataPoint {
  const isRecent = new Date(date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  return createDP('ip_abuse_report', `Abuse: ${reportType}`, description, source, {
    displayValue: `[${date}] ${reportType}: ${description.substring(0, 150)}`,
    confidence: 0.6,
    relevance: isRecent ? 0.8 : 0.4,
    isNoise: !isRecent,
    metadata: { reportType, date },
    discoveredAt: date,
    tags: [reportType.toLowerCase(), isRecent ? 'recent' : 'old'],
  });
}

/**
 * Normalize an IP mention on dark web / forums.
 */
export function normalizeIPMention(
  platform: string,
  url: string,
  snippet: string,
  date: string | undefined,
  source: DataSource,
): DataPoint {
  const isDarkWeb = ['breachforums', 'xss.is', 'exploit.in', 'raidforums'].some(
    p => platform.toLowerCase().includes(p),
  );

  return createDP(
    isDarkWeb ? 'darkweb_mention' : 'forum_mention',
    `Mention on ${platform}`,
    snippet,
    source,
    {
      displayValue: snippet.substring(0, 200),
      confidence: 0.35,
      relevance: isDarkWeb ? 0.7 : 0.4,
      metadata: { platform, url, date },
      discoveredAt: date,
      tags: [isDarkWeb ? 'darkweb' : 'public', platform.toLowerCase()],
    },
  );
}

/**
 * Normalize SSL certificate found on IP.
 */
export function normalizeIPCertificate(
  issuer: string,
  validFrom: string,
  validTo: string,
  domains: string[],
  source: DataSource,
  targetDomain?: string,
): DataPoint[] {
  const dps: DataPoint[] = [];

  const relatedDomains = domains.filter(d =>
    targetDomain ? d.includes(targetDomain.replace('www.', '')) : true,
  );
  const unrelatedDomains = domains.filter(d => !relatedDomains.includes(d));

  dps.push(createDP('ip_ssl_cert', 'SSL Certificate', issuer, source, {
    displayValue: `${issuer} — ${domains.length} domains (${relatedDomains.length} related)`,
    confidence: 0.9,
    relevance: 0.7,
    metadata: { issuer, validFrom, validTo, totalDomains: domains.length, relatedDomains: relatedDomains.length },
  }));

  // Related domains
  for (const d of relatedDomains) {
    dps.push(createDP('ip_ssl_cert', 'Certificate Domain', d, source, {
      confidence: 0.8,
      relevance: 0.7,
      tags: ['related', 'ssl-cert'],
      metadata: { issuer, validFrom, validTo },
    }));
  }

  // Unrelated domains (noise)
  for (const d of unrelatedDomains.slice(0, 20)) {
    dps.push(createDP('ip_ssl_cert', 'Certificate Domain (unrelated)', d, source, {
      confidence: 0.7,
      relevance: 0.1,
      isNoise: true,
      tags: ['unrelated', 'ssl-cert', 'noise'],
      metadata: { issuer },
    }));
  }

  return dps;
}

/**
 * Normalize a related IP in the same subnet.
 */
export function normalizeRelatedIP(
  ip: string,
  relationship: string,
  source: DataSource,
): DataPoint {
  return createDP('ip_related_ip', `Related IP (${relationship})`, ip, source, {
    confidence: 0.7,
    relevance: 0.4,
    metadata: { relationship },
    tags: [relationship.toLowerCase(), 'same-subnet'],
  });
}