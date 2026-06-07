/**
 * Domain RECON Parser — transforms raw JSON output from domain RECON tools into structured ReconResult.
 * Leverages the Person engine but with domain-specific normalizers and classifiers.
 */
import type { ReconResult } from '../../Person/types/recon-result';
import type { DataPoint } from '../../Person/types/data-point';
import type { DataSource } from '../../Person/types/source';
import type { ReconEntity } from '../../Person/types/entity';
import { disambiguateEntities } from '../../Person/engine/entity-disambiguator';
import { scoreDataPoint, calculateRiskScore } from '../../Person/engine/confidence-scorer';
import {
  normalizeSubdomain,
  normalizeDNSRecord,
  normalizeCertificate,
  normalizeWhoisField,
  normalizeSensitiveExposure,
  normalizeHarvestedEmail,
  normalizeTechnology,
  normalizeOpenPort,
  normalizeGoogleDork,
  normalizeWaybackSnapshot,
  normalizeMention,
  normalizeEmployee,
} from './domain-normalizer';

/**
 * Classify domain data points into category groups.
 * Simplified version that groups by category.
 */
function classifyDomainDataPoints(dataPoints: DataPoint[]): NonNullable<ReconResult['activeCategoryGroups']> {
  const categoryCounts = new Map<string, number>();
  for (const dp of dataPoints) {
    const count = categoryCounts.get(dp.category) || 0;
    categoryCounts.set(dp.category, count + 1);
  }

  // Define groups inline
  const groups = [
    { id: 'overview', label: 'Overview', icon: 'LayoutDashboard', accent: '#0af', priority: 0, description: 'Tổng quan domain', categories: [] as string[] },
    { id: 'whois', label: 'WHOIS', icon: 'Fingerprint', accent: '#af52de', priority: 1, description: 'Thông tin đăng ký domain', categories: ['whois_domain_name', 'whois_registrar', 'whois_registry', 'whois_creation_date', 'whois_expiration_date', 'whois_updated_date', 'whois_status', 'whois_nameserver', 'whois_registrant', 'whois_admin_contact', 'whois_tech_contact', 'whois_raw', 'whois_historical'] },
    { id: 'dns', label: 'DNS Records', icon: 'Globe', accent: '#30d158', priority: 2, description: 'DNS records', categories: ['dns_a_record', 'dns_aaaa_record', 'dns_mx_record', 'dns_ns_record', 'dns_soa_record', 'dns_txt_record', 'dns_cname_record', 'dns_srv_record', 'dns_ptr_record', 'dns_caa_record', 'dns_ds_record', 'dns_dnskey_record', 'dns_historical'] },
    { id: 'subdomains', label: 'Subdomains', icon: 'Map', accent: '#0a84ff', priority: 3, description: 'Subdomain được phát hiện', categories: ['subdomain', 'subdomain_takeover', 'subdomain_wildcard', 'subdomain_internal', 'subdomain_cname'] },
    { id: 'certificates', label: 'SSL/TLS Certs', icon: 'ShieldCheck', accent: '#64d2ff', priority: 4, description: 'Chứng chỉ SSL/TLS', categories: ['certificate', 'cert_issuer', 'cert_domains', 'cert_validity', 'cert_transparency_log'] },
    { id: 'infrastructure', label: 'Infrastructure', icon: 'Network', accent: '#ff6b35', priority: 5, description: 'Hạ tầng mạng', categories: ['asn', 'cidr_range', 'reverse_ip', 'hosting_provider', 'cloud_provider', 'geo_location', 'bgp_prefix', 'peer_networks', 'ip_address'] },
    { id: 'sensitive', label: 'Sensitive Exposure', icon: 'AlertTriangle', accent: '#ff375f', priority: 6, description: 'Lộ thông tin nhạy cảm', categories: ['env_exposure', 'git_exposure', 'backup_file', 'config_file', 'exposed_api_key', 'exposed_secret_token', 'firebase_config', 'public_s3_bucket', 'database_dump', 'log_file', 'source_code_exposure', 'debug_endpoint', 'admin_panel', 'phpinfo_exposure'] },
    { id: 'technology', label: 'Tech Stack', icon: 'Cpu', accent: '#64d2ff', priority: 7, description: 'Công nghệ phát hiện', categories: ['tech_framework', 'tech_cms', 'tech_server', 'tech_cdn', 'tech_analytics', 'tech_javascript', 'tech_ssl', 'tech_header', 'tech_cookie', 'technology'] },
    { id: 'osint', label: 'OSINT', icon: 'Search', accent: '#ff9f0a', priority: 8, description: 'Google dorks, Wayback Machine', categories: ['google_dork', 'wayback_snapshot', 'public_document', 'file_metadata', 'mobile_app'] },
    { id: 'emails', label: 'Emails', icon: 'Mail', accent: '#30d158', priority: 9, description: 'Email thu thập được', categories: ['harvested_email', 'email_pattern', 'catch_all_email', 'email'] },
    { id: 'people', label: 'People', icon: 'Users', accent: '#0a84ff', priority: 10, description: 'Nhân sự liên quan', categories: ['employee_name', 'employee_email', 'employee_position'] },
    { id: 'mentions', label: 'Mentions', icon: 'MessageCircle', accent: '#f5a623', priority: 11, description: 'Đề cập trên Internet', categories: ['social_mention', 'news_mention', 'forum_mention', 'internet_mention'] },
    { id: 'network', label: 'Network', icon: 'Router', accent: '#ff6b35', priority: 12, description: 'Port mở, services', categories: ['open_port', 'service_banner', 'http_response', 'ssl_certificate_chain', 'cors_header', 'security_header', 'port', 'service'] },
    { id: 'timeline', label: 'Timeline', icon: 'Clock', accent: '#5e5ce6', priority: 13, description: 'Dòng thời gian thay đổi', categories: [] },
    { id: 'raw', label: 'Raw / Noise', icon: 'FileJson', accent: '#6a7a9a', priority: 14, description: 'Dữ liệu thô, false positives', categories: ['other', 'unclassified'] },
    { id: 'sources', label: 'Sources', icon: 'Database', accent: '#6a7a9a', priority: 15, description: 'Danh sách nguồn', categories: [] },
  ];

  return groups.map(g => ({
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

/**
 * Parse raw domain RECON JSON into a structured ReconResult.
 */
export function parseDomainReconResult(rawData: Record<string, unknown>): ReconResult {
  const allDataPoints: DataPoint[] = [];
  const allSources: DataSource[] = [];
  const sourceMap = new Map<string, DataSource>();

  // Extract query
  const query = (rawData.query as { value: string; type: string }) || { value: 'Unknown', type: 'domain' };

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
      'crt.sh': 0.9,
      'SecurityTrails': 0.85,
      'AlienVault OTX': 0.8,
      'WHOIS History (WhoisXML)': 0.85,
      'Shodan': 0.85,
      'Google Dorks': 0.6,
      'Wayback Machine': 0.9,
      'Sensitive Exposure Scanner': 0.7,
      'Wappalyzer / BuiltWith': 0.7,
      'Hunter.io': 0.75,
      'Social Media / Forums': 0.4,
      'LinkedIn': 0.65,
      'Subdomain Finder (Amass + Subfinder)': 0.8,
    };
    const source: DataSource = {
      id: `src-dom-${name.toLowerCase().replace(/[\s/]+/g, '-')}`,
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

        // Certificate transparency
        if (sourceType === 'certificate_transparency' && obj.issuer && obj.domains) {
          const certDps = normalizeCertificate(
            {
              issuer: String(obj.issuer),
              validFrom: String(obj.validFrom || ''),
              validTo: String(obj.validTo || ''),
              domains: obj.domains as string[],
            },
            source,
            query.value,
          );
          for (const dp of certDps) {
            scoreDataPoint(dp);
            allDataPoints.push(dp);
          }
          continue;
        }

        // DNS records
        if ((sourceType === 'dns_history' || sourceType === 'passive_dns') && obj.type && obj.value) {
          const dp = normalizeDNSRecord(
            String(obj.type),
            String(obj.value),
            source,
            {
              firstSeen: obj.firstSeen,
              lastSeen: obj.lastSeen,
              hostname: obj.hostname,
              priority: obj.priority,
              note: obj.note,
            },
          );
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // Subdomain enumeration
        if ((sourceType === 'subdomain_enum') && obj.name) {
          const dp = normalizeSubdomain(
            {
              name: String(obj.name),
              source: String(obj.source || sourceName),
              firstSeen: String(obj.firstSeen || ''),
              resolvedIP: obj.resolvedIP ? String(obj.resolvedIP) : undefined,
            },
            source,
          );
          if (obj.note) {
            dp.isNoise = true;
            dp.relevance = 0.1;
            dp.metadata = { ...dp.metadata, note: obj.note };
          }
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // WHOIS history
        if (sourceType === 'whois_history') {
          for (const [key, value] of Object.entries(obj)) {
            if (value !== null && value !== undefined && typeof value !== 'object') {
              const dp = normalizeWhoisField(key, String(value), source);
              scoreDataPoint(dp);
              allDataPoints.push(dp);
            }
          }
          continue;
        }

        // Network scan / Shodan
        if (sourceType === 'network_scan') {
          if (obj.ip) {
            const dp = normalizeDNSRecord('A', String(obj.ip), source, {
              ports: obj.ports,
              org: obj.org,
              country: obj.country,
              city: obj.city,
              hostnames: obj.hostnames,
            });
            scoreDataPoint(dp);
            allDataPoints.push(dp);
          }
          if (obj.ports && Array.isArray(obj.ports)) {
            for (const port of obj.ports as number[]) {
              const dp = normalizeOpenPort(port, 'unknown', null, source);
              scoreDataPoint(dp);
              allDataPoints.push(dp);
            }
          }
          continue;
        }

        // Google dorks
        if (sourceType === 'osint' && obj.query && obj.resultCount !== undefined) {
          const dp = normalizeGoogleDork(String(obj.query), Number(obj.resultCount), source);
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // Wayback Machine
        if (sourceName === 'Wayback Machine' && obj.timestamp && obj.url) {
          const dp = normalizeWaybackSnapshot(String(obj.timestamp), String(obj.url), source);
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // Sensitive exposure
        if (sourceType === 'sensitive_exposure' && obj.type && obj.url) {
          const dp = normalizeSensitiveExposure(
            String(obj.type),
            String(obj.url),
            source,
            Boolean(obj.isFalsePositive),
          );
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // Technology detection
        if (sourceType === 'technology' && obj.name && obj.category) {
          const dp = normalizeTechnology(
            String(obj.name),
            String(obj.category),
            obj.version ? String(obj.version) : null,
            source,
          );
          if (obj.note) {
            dp.metadata = { ...dp.metadata, note: obj.note };
          }
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // Email harvesting
        if (sourceType === 'email_harvesting' && obj.email) {
          const dp = normalizeHarvestedEmail(String(obj.email), source);
          dp.confidence = Number(obj.confidence) || dp.confidence;
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // Internet mentions
        if (sourceType === 'mentions' && obj.source && obj.snippet) {
          const dp = normalizeMention(
            String(obj.source),
            String(obj.url || ''),
            String(obj.snippet),
            obj.date ? String(obj.date) : undefined,
            source,
          );
          if (obj.note) {
            dp.isNoise = true;
            dp.relevance = 0.1;
            dp.metadata = { ...dp.metadata, note: obj.note };
          }
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }

        // People / Employees
        if (sourceType === 'people' && obj.name) {
          const dp = normalizeEmployee(
            String(obj.name),
            obj.email ? String(obj.email) : undefined,
            obj.position ? String(obj.position) : undefined,
            source,
          );
          scoreDataPoint(dp);
          allDataPoints.push(dp);
          continue;
        }
      }
    }
  }

  // Run entity disambiguation (group subdomains by IP, certs by issuer, etc.)
  const { entities, unassigned } = disambiguateEntities(allDataPoints, allSources);

  // Calculate risk scores for entities
  for (const entity of entities) {
    entity.riskScore = calculateRiskScore(entity);
  }

  // Classify into category groups
  const activeCategoryGroups = classifyDomainDataPoints(allDataPoints);

  // Overall confidence
  const overallConfidence = entities.length > 0
    ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
    : allDataPoints.length > 0
      ? allDataPoints.reduce((sum, dp) => sum + dp.confidence, 0) / allDataPoints.length
      : 0;

  // Warnings
  const warnings = (rawData.warnings as string[]) || [];

  return {
    query: { value: query.value, type: (query.type as 'domain') || 'domain' },
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