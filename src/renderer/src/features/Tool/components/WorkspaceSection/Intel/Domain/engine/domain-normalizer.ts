/**
 * Domain Data Normalizer — extends the base normalizer with domain-specific patterns.
 * Handles subdomains, DNS records, certificates, WHOIS data, etc.
 */
import type { DataPoint } from '../../Person/types/data-point';
import type { DataSource } from '../../Person/types/source';
import type { DomainDataCategory } from '../types/domain-data-point';

let _dpCounter = 0;
function nextId(): string {
  return `dp-dom-${Date.now()}-${++_dpCounter}`;
}

/**
 * Create a basic DataPoint with defaults.
 */
function createDataPoint(
  category: DomainDataCategory,
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
 * Normalize a subdomain entry into a DataPoint.
 */
export function normalizeSubdomain(
  subdomain: { name: string; source?: string; firstSeen?: string; resolvedIP?: string },
  source: DataSource,
): DataPoint {
  const name = subdomain.name;

  // Check for wildcard
  if (name.startsWith('*.')) {
    return createDataPoint('subdomain_wildcard', 'Wildcard Subdomain', name, source, {
      confidence: 0.3,
      relevance: 0.3,
      isNoise: true,
      metadata: { firstSeen: subdomain.firstSeen, resolvedIP: subdomain.resolvedIP },
    });
  }

  // Check for internal patterns
  const internalPatterns = ['dev', 'staging', 'test', 'internal', 'localhost', 'admin', 'db', 'api-internal'];
  const isInternal = internalPatterns.some(p => name.toLowerCase().startsWith(p + '.') || name.toLowerCase().includes('.' + p + '.'));
  const category = isInternal ? 'subdomain_internal' : 'subdomain';

  // Subdomain takeover check (CNAME to unclaimed service)
  const takeoverServices = [
    'amazonaws.com', 'azurewebsites.net', 'cloudfront.net', 'herokuapp.com',
    'github.io', 'surge.sh', 'netlify.app', 'vercel.app', 'pages.dev',
    'firebaseapp.com', 'web.app', 'myshopify.com', 'bitbucket.io',
  ];

  let isTakeover = false;
  if (subdomain.resolvedIP === undefined && subdomain.name.includes('.')) {
    isTakeover = false; // Would need CNAME check in real implementation
  }

  return createDataPoint(
    isTakeover ? 'subdomain_takeover' : category,
    isTakeover ? 'Potential Takeover' : 'Subdomain',
    name,
    source,
    {
      confidence: isInternal ? 0.6 : 0.8,
      relevance: isInternal ? 0.4 : 0.7,
      metadata: {
        firstSeen: subdomain.firstSeen,
        resolvedIP: subdomain.resolvedIP,
        source: subdomain.source,
        isInternal,
        isTakeover,
      },
      tags: [
        ...(isInternal ? ['internal'] : []),
        ...(isTakeover ? ['takeover-risk'] : []),
        source.name.toLowerCase().replace(/\s+/g, '-'),
      ],
    },
  );
}

/**
 * Normalize a DNS record into a DataPoint.
 */
export function normalizeDNSRecord(
  type: string,
  value: unknown,
  source: DataSource,
  metadata?: Record<string, unknown>,
): DataPoint {
  const categoryMap: Record<string, DomainDataCategory> = {
    A: 'dns_a_record',
    AAAA: 'dns_aaaa_record',
    MX: 'dns_mx_record',
    NS: 'dns_ns_record',
    SOA: 'dns_soa_record',
    TXT: 'dns_txt_record',
    CNAME: 'dns_cname_record',
    SRV: 'dns_srv_record',
    PTR: 'dns_ptr_record',
    CAA: 'dns_caa_record',
    DS: 'dns_ds_record',
    DNSKEY: 'dns_dnskey_record',
  };

  const category = categoryMap[type] || 'dns_a_record';

  let displayValue = '';
  if (typeof value === 'string') {
    displayValue = value;
  } else if (Array.isArray(value)) {
    displayValue = value.join(', ');
  } else if (typeof value === 'object' && value !== null) {
    displayValue = JSON.stringify(value);
  } else {
    displayValue = String(value);
  }

  return createDataPoint(category, `${type} Record`, value, source, {
    displayValue,
    confidence: 0.85,
    relevance: 0.8,
    metadata,
  });
}

/**
 * Normalize a certificate transparency entry.
 */
export function normalizeCertificate(
  cert: {
    issuer: string;
    validFrom: string;
    validTo: string;
    domains: string[];
    serialNumber?: string;
    fingerprint?: string;
  },
  source: DataSource,
  targetDomain: string,
): DataPoint[] {
  const dps: DataPoint[] = [];

  // Main certificate
  dps.push(createDataPoint('certificate', 'SSL Certificate', cert, source, {
    displayValue: `${cert.issuer} — ${cert.domains.length} domains`,
    confidence: 0.9,
    relevance: 0.8,
    metadata: cert,
  }));

  // Issuer
  dps.push(createDataPoint('cert_issuer', 'Certificate Issuer', cert.issuer, source, {
    confidence: 0.9,
    relevance: 0.6,
  }));

  // Validity
  dps.push(createDataPoint('cert_validity', 'Certificate Validity', `${cert.validFrom} → ${cert.validTo}`, source, {
    confidence: 0.9,
    relevance: 0.7,
    metadata: { validFrom: cert.validFrom, validTo: cert.validTo },
  }));

  // Domains on certificate
  for (const domain of cert.domains) {
    const isNoise = !domain.includes(targetDomain.replace('www.', '')) && !domain.startsWith('*.');
    dps.push(createDataPoint('cert_domains', 'Domain on Certificate', domain, source, {
      confidence: 0.8,
      relevance: isNoise ? 0.1 : 0.6,
      isNoise: isNoise,
      tags: isNoise ? ['shared-cert', 'unrelated'] : ['matched'],
    }));
  }

  return dps;
}

/**
 * Normalize a WHOIS field.
 */
export function normalizeWhoisField(
  field: string,
  value: string,
  source: DataSource,
): DataPoint {
  const fieldCategoryMap: Record<string, DomainDataCategory> = {
    domainName: 'whois_domain_name',
    registrar: 'whois_registrar',
    registry: 'whois_registry',
    creationDate: 'whois_creation_date',
    expirationDate: 'whois_expiration_date',
    updatedDate: 'whois_updated_date',
    domainStatus: 'whois_status',
    nameservers: 'whois_nameserver',
    registrant: 'whois_registrant',
    adminContact: 'whois_admin_contact',
    techContact: 'whois_tech_contact',
    whoisRaw: 'whois_raw',
  };

  const category = fieldCategoryMap[field] || 'whois_raw';

  return createDataPoint(category, `WHOIS ${field}`, value, source, {
    confidence: 0.85,
    relevance: 0.8,
  });
}

/**
 * Normalize a sensitive exposure finding.
 */
export function normalizeSensitiveExposure(
  type: string,
  url: string,
  source: DataSource,
  isFalsePositive = false,
): DataPoint {
  const categoryMap: Record<string, DomainDataCategory> = {
    env: 'env_exposure',
    git: 'git_exposure',
    backup: 'backup_file',
    config: 'config_file',
    apiKey: 'exposed_api_key',
    secretToken: 'exposed_secret_token',
    firebaseConfig: 'firebase_config',
    s3Bucket: 'public_s3_bucket',
    databaseDump: 'database_dump',
    logFile: 'log_file',
    sourceCode: 'source_code_exposure',
    debug: 'debug_endpoint',
    adminPanel: 'admin_panel',
    phpinfo: 'phpinfo_exposure',
  };

  const category = categoryMap[type] || 'source_code_exposure';

  return createDataPoint(category, `Exposed: ${type}`, url, source, {
    confidence: isFalsePositive ? 0.2 : 0.7,
    relevance: isFalsePositive ? 0.1 : 0.9,
    isNoise: isFalsePositive,
    tags: isFalsePositive ? ['false-positive'] : ['confirmed-exposure'],
    verificationStatus: isFalsePositive ? 'disputed' : 'unverified',
  });
}

/**
 * Normalize an email harvested for the domain.
 */
export function normalizeHarvestedEmail(
  email: string,
  source: DataSource,
): DataPoint {
  // Check if likely catch-all or generic
  const genericPrefixes = ['admin', 'info', 'contact', 'support', 'sales', 'hello', 'noreply', 'no-reply'];
  const prefix = email.split('@')[0].toLowerCase();
  const isGeneric = genericPrefixes.some(g => prefix === g);

  return createDataPoint('harvested_email', isGeneric ? 'Generic Email' : 'Email', email, source, {
    confidence: 0.7,
    relevance: isGeneric ? 0.3 : 0.8,
    isNoise: isGeneric,
    tags: isGeneric ? ['generic', 'catch-all'] : ['personal'],
  });
}

/**
 * Normalize a technology detection result.
 */
export function normalizeTechnology(
  name: string,
  category: string,
  version: string | null,
  source: DataSource,
): DataPoint {
  const categoryMap: Record<string, DomainDataCategory> = {
    framework: 'tech_framework',
    cms: 'tech_cms',
    server: 'tech_server',
    cdn: 'tech_cdn',
    analytics: 'tech_analytics',
    javascript: 'tech_javascript',
    ssl: 'tech_ssl',
  };

  const dpCategory = categoryMap[category] || 'tech_framework';

  return createDataPoint(dpCategory, name, version ? `${name} ${version}` : name, source, {
    confidence: 0.7,
    relevance: 0.6,
    metadata: { category, version },
  });
}

/**
 * Normalize an open port / service finding.
 */
export function normalizeOpenPort(
  port: number,
  service: string,
  banner: string | null,
  source: DataSource,
): DataPoint {
  return createDataPoint('open_port', `Port ${port}`, `${service}${banner ? ' — ' + banner.substring(0, 100) : ''}`, source, {
    confidence: 0.9,
    relevance: 0.7,
    metadata: { port, service, banner },
    tags: [service, port < 1024 ? 'privileged' : 'unprivileged'],
  });
}

/**
 * Normalize a Google dork result.
 */
export function normalizeGoogleDork(
  query: string,
  resultCount: number,
  source: DataSource,
): DataPoint {
  return createDataPoint('google_dork', 'Google Dork', query, source, {
    displayValue: `${query} (${resultCount} results)`,
    confidence: 0.6,
    relevance: 0.5,
    metadata: { resultCount },
  });
}

/**
 * Normalize a Wayback Machine snapshot.
 */
export function normalizeWaybackSnapshot(
  timestamp: string,
  url: string,
  source: DataSource,
): DataPoint {
  return createDataPoint('wayback_snapshot', 'Wayback Snapshot', url, source, {
    displayValue: `${new Date(timestamp).toLocaleDateString()} — ${url}`,
    confidence: 0.9,
    relevance: 0.6,
    metadata: { timestamp },
    discoveredAt: timestamp,
  });
}

/**
 * Normalize an internet mention.
 */
export function normalizeMention(
  sourceName: string,
  url: string,
  snippet: string,
  date: string | undefined,
  source: DataSource,
): DataPoint {
  const isSocialMedia = ['twitter', 'x', 'reddit', 'facebook', 'instagram', 'linkedin'].includes(
    sourceName.toLowerCase().replace(/[/@]/g, ''),
  );
  const isForum = ['hacker news', 'stack overflow', 'medium'].includes(sourceName.toLowerCase());

  let category: DomainDataCategory = 'social_mention';
  if (isForum) category = 'forum_mention';
  if (sourceName.toLowerCase().includes('news')) category = 'news_mention';

  return createDataPoint(category, `Mention on ${sourceName}`, snippet, source, {
    displayValue: snippet.substring(0, 200),
    confidence: 0.4,
    relevance: 0.4,
    metadata: { url, date, platform: sourceName },
    discoveredAt: date,
  });
}

/**
 * Normalize an employee/person associated with the domain.
 */
export function normalizeEmployee(
  name: string,
  email: string | undefined,
  position: string | undefined,
  source: DataSource,
): DataPoint {
  return createDataPoint('employee_name', 'Employee', name, source, {
    displayValue: `${name}${position ? ' — ' + position : ''}${email ? ' <' + email + '>' : ''}`,
    confidence: 0.5,
    relevance: 0.6,
    metadata: { name, email, position },
  });
}