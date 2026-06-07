/**
 * IP Data Normalizer — normalizes IP reconnaissance data into DataPoints.
 * Handles Shodan/Censys ports, reverse IP domains, GeoIP, BGP, threat intel, etc.
 */
import type { DataPoint } from '../types/data-point';
import type { DataSource } from '../types/data-point';
import type { IpDataCategory } from '../types/ip-data-point';

let _dpCounter = 0;
function nextId(): string {
  return `dp-ip-${Date.now()}-${++_dpCounter}`;
}

/**
 * Create a basic DataPoint with defaults.
 */
function createDataPoint(
  category: IpDataCategory,
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
 * Normalize an open port / service from Shodan or Censys.
 */
export function normalizePortService(
  port: number,
  transport: string,
  service: string,
  product: string | null,
  version: string | null,
  banner: string | null,
  source: DataSource,
  note?: string,
): DataPoint[] {
  const dps: DataPoint[] = [];
  const isNoise = !!note;

  // Main port entry
  dps.push(createDataPoint('open_port', `Port ${port}/${transport}`, `${service}`, source, {
    displayValue: `${port}/${transport} — ${service}${product ? ' (' + product + ')' : ''}${version ? ' v' + version : ''}`,
    confidence: isNoise ? 0.3 : 0.9,
    relevance: isNoise ? 0.15 : 0.7,
    isNoise,
    tags: [...(isNoise ? ['shared-infra'] : ['target-ip']), transport, service],
    metadata: { port, transport, service, product, version, note },
  }));

  // Service banner (if available and not noise)
  if (banner && !isNoise) {
    dps.push(createDataPoint('service_banner', `Banner port ${port}`, banner.substring(0, 200), source, {
      confidence: 0.85,
      relevance: 0.5,
      metadata: { port, service },
    }));
  }

  // Version info
  if (version) {
    dps.push(createDataPoint('service_version', `${product || service} Version`, version, source, {
      confidence: 0.7,
      relevance: 0.4,
      metadata: { port, product, service },
    }));
  }

  return dps;
}

/**
 * Normalize SSL/TLS info from a port scan.
 */
export function normalizePortSsl(
  issuer: string,
  subject: string,
  san: string[] | undefined,
  source: DataSource,
  port: number,
): DataPoint[] {
  const dps: DataPoint[] = [];

  dps.push(createDataPoint('ssl_certificate', `SSL Cert port ${port}`, subject, source, {
    displayValue: `${issuer} → ${subject}`,
    confidence: 0.9,
    relevance: 0.7,
    metadata: { issuer, subject, san, port },
  }));

  if (san && san.length > 0) {
    for (const domain of san) {
      dps.push(createDataPoint('cert_ip_san', 'SAN on Cert', domain, source, {
        confidence: 0.8,
        relevance: 0.5,
        metadata: { issuer, port },
      }));
    }
  }

  return dps;
}

/**
 * Normalize a hosted domain from reverse IP lookup.
 */
export function normalizeHostedDomain(
  domain: string,
  firstSeen: string | undefined,
  lastSeen: string | undefined,
  source: DataSource,
  targetDomain?: string,
): DataPoint {
  const isTarget = targetDomain && domain.includes(targetDomain.replace('www.', ''));
  const isUnrelated = !isTarget && !domain.includes('phantoma');

  let category: IpDataCategory = 'hosted_domain';
  if (isTarget) category = 'primary_domain';
  else if (isUnrelated) category = 'unrelated_domain';
  else category = 'related_domain';

  return createDataPoint(category, isTarget ? 'Target Domain' : 'Hosted Domain', domain, source, {
    confidence: isTarget ? 0.95 : isUnrelated ? 0.6 : 0.75,
    relevance: isTarget ? 0.9 : isUnrelated ? 0.2 : 0.5,
    isNoise: isUnrelated,
    tags: [
      ...(isTarget ? ['target-domain'] : []),
      ...(isUnrelated ? ['shared-infra', 'unrelated-domain'] : []),
    ],
    metadata: { firstSeen, lastSeen },
  });
}

/**
 * Normalize GeoIP data.
 */
export function normalizeGeoIp(
  field: string,
  value: string,
  source: DataSource,
): DataPoint {
  const categoryMap: Record<string, IpDataCategory> = {
    country: 'geoip_country',
    countryCode: 'geoip_country',
    region: 'geoip_region',
    city: 'geoip_city',
    latitude: 'geoip_coordinates',
    longitude: 'geoip_coordinates',
    timezone: 'geoip_timezone',
    isp: 'geoip_isp',
    org: 'geoip_isp',
    usage_type: 'geoip_usage_type',
    usageType: 'geoip_usage_type',
    asn: 'geoip_isp',
  };

  const category = categoryMap[field] || 'geoip_city';

  return createDataPoint(category, `GeoIP ${field}`, value, source, {
    confidence: 0.8,
    relevance: 0.6,
  });
}

/**
 * Normalize BGP data.
 */
export function normalizeBgp(
  asn: string | undefined,
  prefix: string | undefined,
  peers: string[] | undefined,
  upstreams: string[] | undefined,
  origin: string | undefined,
  source: DataSource,
): DataPoint[] {
  const dps: DataPoint[] = [];

  if (asn) {
    dps.push(createDataPoint('bgp_asn', 'ASN', asn, source, {
      confidence: 0.95,
      relevance: 0.8,
      metadata: { origin },
    }));
  }

  if (prefix) {
    dps.push(createDataPoint('bgp_prefix', 'BGP Prefix', prefix, source, {
      confidence: 0.9,
      relevance: 0.7,
    }));
  }

  if (peers) {
    for (const peer of peers) {
      dps.push(createDataPoint('bgp_peer', 'BGP Peer', peer, source, {
        confidence: 0.85,
        relevance: 0.5,
      }));
    }
  }

  if (upstreams) {
    for (const upstream of upstreams) {
      dps.push(createDataPoint('bgp_upstream', 'BGP Upstream', upstream, source, {
        confidence: 0.85,
        relevance: 0.5,
      }));
    }
  }

  if (origin) {
    dps.push(createDataPoint('bgp_origin', 'BGP Origin', origin, source, {
      confidence: 0.85,
      relevance: 0.6,
    }));
  }

  return dps;
}

/**
 * Normalize a threat intelligence report.
 */
export function normalizeThreatReport(
  reportType: string,
  date: string,
  description: string,
  source: DataSource,
): DataPoint {
  const categoryMap: Record<string, IpDataCategory> = {
    'Malware Communication': 'malware_association',
    'Malware Distribution': 'malware_association',
    'Phishing Host': 'phishing_association',
    'Scanner Activity': 'scanner_activity',
    'Scanning Activity': 'scanner_activity',
    'Spam Source': 'spam_report',
    'Brute Force': 'brute_force',
    'DDoS Participant': 'ddos_participant',
    'Detected URLs': 'malware_association',
    'Detected Files': 'malware_association',
    'Communicating Files': 'c2_communication',
  };

  const category = categoryMap[reportType] || 'threat_report';

  const isNoise = description.toLowerCase().includes('false positive') || description.toLowerCase().includes('misattributed');

  return createDataPoint(category, reportType, description, source, {
    displayValue: description.substring(0, 200),
    confidence: isNoise ? 0.3 : 0.6,
    relevance: isNoise ? 0.15 : 0.7,
    isNoise,
    tags: [...(isNoise ? ['false-positive', 'shared-infra'] : ['confirmed'])],
    metadata: { date, reportType },
    discoveredAt: date,
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
  const categoryMap: Record<string, IpDataCategory> = {
    'Web Spam': 'spam_report',
    'Brute Force': 'brute_force',
    'Port Scan': 'scanner_activity',
    'DDoS Participant': 'ddos_participant',
    'Malware Distribution': 'malware_association',
    'Fraud Orders': 'fraud_report',
    'Hacking': 'hacking_report',
    'SBL Listing': 'spam_listing',
    'XBL Listing': 'exploit_listing',
    'PBL Advisory': 'policy_listing',
    'Open Redis': 'scan_report',
    'Open MySQL': 'scan_report',
  };

  const category = categoryMap[reportType] || 'abuse_report';

  return createDataPoint(category, reportType, description, source, {
    displayValue: description.substring(0, 200),
    confidence: 0.5,
    relevance: 0.6,
    metadata: { date, reportType },
    discoveredAt: date,
    tags: [reportType.toLowerCase().replace(/\s+/g, '-')],
  });
}

/**
 * Normalize a spam listing.
 */
export function normalizeSpamListing(
  reportType: string,
  date: string,
  description: string,
  source: DataSource,
): DataPoint {
  const categoryMap: Record<string, IpDataCategory> = {
    'SBL Listing': 'spam_listing',
    'XBL Listing': 'exploit_listing',
    'PBL Advisory': 'policy_listing',
  };

  const category = categoryMap[reportType] || 'spam_listing';

  return createDataPoint(category, reportType, description, source, {
    displayValue: description.substring(0, 200),
    confidence: 0.5,
    relevance: 0.6,
    metadata: { date, reportType },
    discoveredAt: date,
  });
}

/**
 * Normalize GreyNoise classification.
 */
export function normalizeNoiseIntel(
  tag: string | undefined,
  classification: string,
  source: DataSource,
  note?: string,
): DataPoint {
  return createDataPoint('noise_classification', 'GreyNoise', classification, source, {
    displayValue: `${tag || 'Unknown'} — ${classification}`,
    confidence: 0.7,
    relevance: 0.4,
    isNoise: classification === 'benign',
    metadata: { tag, classification, note },
    tags: [classification],
  });
}

/**
 * Normalize an IP-based SSL certificate.
 */
export function normalizeIpCertificate(
  cert: {
    issuer: string;
    validFrom: string;
    validTo: string;
    domains: string[];
  },
  source: DataSource,
  targetDomain?: string,
): DataPoint[] {
  const dps: DataPoint[] = [];

  dps.push(createDataPoint('cert_ip_issuer', 'Certificate Issuer', cert.issuer, source, {
    confidence: 0.9,
    relevance: 0.7,
  }));

  dps.push(createDataPoint('cert_ip_validity', 'Certificate Validity', `${cert.validFrom} → ${cert.validTo}`, source, {
    confidence: 0.9,
    relevance: 0.6,
    metadata: { validFrom: cert.validFrom, validTo: cert.validTo },
  }));

  for (const domain of cert.domains) {
    const isTarget = targetDomain && domain.includes(targetDomain.replace('www.', ''));
    dps.push(createDataPoint('cert_ip_domains', 'Domain on Cert', domain, source, {
      confidence: 0.8,
      relevance: isTarget ? 0.8 : 0.3,
      isNoise: !isTarget,
      tags: isTarget ? ['target-domain'] : ['shared-infra'],
    }));
  }

  return dps;
}

/**
 * Normalize an internet mention of this IP.
 */
export function normalizeIpMention(
  platform: string,
  url: string,
  snippet: string,
  date: string | undefined,
  source: DataSource,
): DataPoint {
  const isDarkweb = platform.toLowerCase().includes('breach') || platform.toLowerCase().includes('dark');

  let category: IpDataCategory = 'social_mention';
  if (isDarkweb) category = 'darkweb_mention';
  else if (platform.toLowerCase().includes('stack') || platform.toLowerCase().includes('reddit')) category = 'forum_mention';

  return createDataPoint(category, `Mention on ${platform}`, snippet, source, {
    displayValue: snippet.substring(0, 200),
    confidence: 0.4,
    relevance: isDarkweb ? 0.7 : 0.4,
    tags: isDarkweb ? ['critical-risk'] : [],
    metadata: { url, date, platform },
    discoveredAt: date,
  });
}

/**
 * Normalize an indexed page.
 */
export function normalizeIndexedPage(
  url: string,
  source: DataSource,
  lastSeen?: string,
  note?: string,
): DataPoint {
  return createDataPoint('indexed_page', 'Indexed Page', url, source, {
    confidence: 0.7,
    relevance: 0.3,
    metadata: { lastSeen, note },
    tags: note ? ['sensitive'] : [],
  });
}

/**
 * Normalize a malware URL.
 */
export function normalizeMalwareUrl(
  url: string,
  status: string,
  date: string,
  tags: string[] | undefined,
  source: DataSource,
): DataPoint {
  return createDataPoint('malware_url', 'Malware URL', url, source, {
    confidence: 0.6,
    relevance: 0.7,
    metadata: { status, date, tags },
    discoveredAt: date,
    tags: ['critical-risk', ...(tags || [])],
  });
}

/**
 * Normalize reputation data.
 */
export function normalizeReputation(
  reputation: string,
  volume: string,
  source: DataSource,
  firstSeen?: string,
): DataPoint[] {
  const dps: DataPoint[] = [];

  dps.push(createDataPoint('reputation_score', 'Reputation', reputation, source, {
    confidence: 0.8,
    relevance: 0.6,
    metadata: { firstSeen },
  }));

  dps.push(createDataPoint('reputation_volume', 'Traffic Volume', volume, source, {
    confidence: 0.7,
    relevance: 0.4,
  }));

  return dps;
}

/**
 * Normalize a scan report (Shadowserver).
 */
export function normalizeScanReport(
  reportType: string,
  date: string,
  description: string,
  source: DataSource,
): DataPoint {
  return createDataPoint('scan_report', reportType, description, source, {
    displayValue: description.substring(0, 200),
    confidence: 0.5,
    relevance: 0.5,
    metadata: { date, reportType },
    discoveredAt: date,
  });
}

/**
 * Normalize passive DNS domain entry.
 */
export function normalizePassiveDnsDomain(
  domain: string,
  firstSeen: string | undefined,
  lastSeen: string | undefined,
  recordType: string | undefined,
  source: DataSource,
  targetDomain?: string,
): DataPoint {
  const isTarget = targetDomain && domain.includes(targetDomain.replace('www.', ''));

  return createDataPoint('passive_dns_domain', 'Passive DNS', domain, source, {
    displayValue: `${domain} (${recordType || 'A'})`,
    confidence: isTarget ? 0.9 : 0.6,
    relevance: isTarget ? 0.8 : 0.3,
    isNoise: !isTarget,
    tags: isTarget ? ['target-domain'] : ['shared-infra'],
    metadata: { firstSeen, lastSeen, recordType },
  });
}