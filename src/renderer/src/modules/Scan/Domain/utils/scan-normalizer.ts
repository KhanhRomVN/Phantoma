/**
 * Scan Data Normalizer — transforms active scan raw data into DataPoints.
 */
import type { DataPoint, DataSource, Severity } from '../types/scan-data-point';
import type { ZoneTransferAttempt, ZoneRecord } from '../types/zone-transfer';
import type { BruteForceResult } from '../types/dns-bruteforce';
import type { DnsMisconfig } from '../types/dns-misconfig';

let _dpCounter = 0;
function nextId(): string {
  return `dp-scan-${Date.now()}-${++_dpCounter}`;
}

function createDataPoint(
  category: string,
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
 * Normalize zone transfer attempt into DataPoints.
 */
export function normalizeZoneTransfer(
  attempt: ZoneTransferAttempt,
  source: DataSource,
): DataPoint[] {
  const dps: DataPoint[] = [];

  if (attempt.success && attempt.records) {
    dps.push(
      createDataPoint(
        'zone_transfer_success',
        'Zone Transfer SUCCESS',
        attempt.nameserver,
        source,
        {
          confidence: 0.95,
          relevance: 1.0,
          severity: 'high',
          tags: ['zone-transfer', 'success'],
          verificationStatus: 'verified',
        },
      ),
    );

    for (const record of attempt.records) {
      const recordCategoryMap: Record<string, string> = {
        A: 'zone_transfer_a',
        AAAA: 'zone_transfer_a',
        MX: 'zone_transfer_mx',
        CNAME: 'zone_transfer_cname',
        NS: 'zone_transfer_ns',
        SOA: 'zone_transfer_soa',
      };
      const cat = recordCategoryMap[record.type] || 'zone_transfer_other';

      const isInternal = isPrivateIP(record.value);

      dps.push(
        createDataPoint(cat, `${record.type} Record`, `${record.name} → ${record.value}`, source, {
          displayValue: `${record.name} ${record.ttl}s ${record.type} ${record.value}`,
          confidence: 0.95,
          relevance: isInternal ? 0.9 : 0.6,
          severity: isInternal ? 'high' : 'info',
          tags: [
            ...(isInternal ? ['internal', 'rfc1918'] : ['public']),
            'zone-transfer-record',
          ],
          metadata: { name: record.name, type: record.type, ttl: record.ttl, isInternal },
        }),
      );
    }
  } else {
    dps.push(
      createDataPoint(
        'zone_transfer_failed',
        'Zone Transfer Failed',
        attempt.nameserver,
        source,
        {
          confidence: 0.9,
          relevance: 0.4,
          displayValue: `${attempt.nameserver}: ${attempt.error || 'Transfer refused'}`,
          metadata: { error: attempt.error, nameserver: attempt.nameserver },
        },
      ),
    );
  }

  if (attempt.note) {
    dps[dps.length - 1].metadata = { ...dps[dps.length - 1].metadata, note: attempt.note };
  }

  return dps;
}

/**
 * Normalize a DNS brute-force result.
 */
export function normalizeBruteForceResult(
  result: BruteForceResult,
  source: DataSource,
): DataPoint {
  const isWildcard = result.note?.toLowerCase().includes('wildcard') || false;
  const isInternal = result.ip ? isPrivateIP(result.ip) : false;

  const category = isWildcard
    ? 'bruteforce_wildcard'
    : isInternal
      ? 'bruteforce_internal'
      : result.resolved
        ? 'bruteforce_resolved'
        : 'bruteforce_unresolved';

  return createDataPoint(
    category,
    isWildcard ? 'Wildcard Response' : result.resolved ? 'Resolved' : 'Unresolved',
    result.subdomain,
    source,
    {
      displayValue: result.resolved
        ? `${result.subdomain} → ${result.ip} (${result.latency_ms}ms)`
        : `${result.subdomain} (NXDOMAIN)`,
      confidence: isWildcard ? 0.1 : result.resolved ? 0.85 : 0.3,
      relevance: isWildcard ? 0.05 : isInternal ? 0.8 : result.resolved ? 0.6 : 0.2,
      isNoise: isWildcard,
      severity: isInternal ? 'high' : 'info',
      tags: [
        ...(isWildcard ? ['wildcard'] : []),
        ...(isInternal ? ['internal', 'rfc1918'] : result.resolved ? ['resolved', 'public'] : ['nxdomain']),
      ],
      metadata: {
        ip: result.ip,
        latency_ms: result.latency_ms,
        resolved: result.resolved,
        note: result.note,
      },
    },
  );
}

/**
 * Normalize a DNS enumeration check (version.bind, hostname.bind, etc.).
 */
export function normalizeDnsEnum(
  type: string,
  target: string,
  response: string,
  source: DataSource,
): DataPoint {
  const categoryMap: Record<string, string> = {
    'version.bind': 'dns_version',
    'hostname.bind': 'dns_hostname',
    dnssec: 'dns_dnssec',
    nsid: 'dns_nsid',
    chaos_txt: 'dns_chaos_txt',
  };

  const category = categoryMap[type] || 'dns_soa_check';

  let severity: Severity = 'info';
  if (type === 'dnssec' && response.toLowerCase().includes('unsigned')) {
    severity = 'high';
  }
  if (type === 'version.bind') {
    severity = 'low';
  }

  return createDataPoint(category, `DNS ${type}`, response, source, {
    displayValue: `${target}: ${response}`,
    confidence: 0.9,
    relevance: 0.7,
    severity,
    metadata: { type, target, response },
    tags: [type, 'dns-enum'],
  });
}

/**
 * Normalize a DNS misconfiguration finding.
 */
export function normalizeMisconfig(
  misconfig: DnsMisconfig,
  source: DataSource,
): DataPoint {
  const severityCategoryMap: Record<string, string> = {
    critical: 'misconfig_critical',
    high: 'misconfig_high',
    medium: 'misconfig_medium',
    low: 'misconfig_low',
    info: 'misconfig_info',
  };

  const category = severityCategoryMap[misconfig.severity] || 'misconfig_info';

  return createDataPoint(
    category,
    misconfig.issue,
    misconfig.detail,
    source,
    {
      displayValue: `[${misconfig.severity.toUpperCase()}] ${misconfig.issue}`,
      confidence: 0.9,
      relevance: misconfig.severity === 'critical' || misconfig.severity === 'high' ? 1.0 : 0.7,
      severity: misconfig.severity as Severity,
      tags: ['misconfig', misconfig.severity],
      metadata: {
        severity: misconfig.severity,
        nameserver: misconfig.nameserver,
        ip: misconfig.ip,
        domain: misconfig.domain,
        record: misconfig.record,
        nameservers: misconfig.nameservers,
        affected_records: misconfig.affected_records,
      },
    },
  );
}

/**
 * Check if an IP is private (RFC 1918 + others).
 */
function isPrivateIP(ip: string): boolean {
  if (!ip) return false;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;
  if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;
  return false;
}