/**
 * Network Scan Data Normalizer — transforms raw data into DataPoints.
 */
import type { DataPoint, DataSource, Severity } from '../types/scan-data-point';
import type { HostDiscoveryResult } from '../types/host-discovery';
import type { PortScanResult, PortInfo } from '../types/port-scan';
import type { ServiceVersionResult, ServiceInfo } from '../types/service-version';
import type { OsDetectionResult } from '../types/os-detection';

let _dpCounter = 0;
function nextId(): string {
  return `dp-net-${Date.now()}-${++_dpCounter}`;
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

export function normalizeHostDiscovery(
  result: HostDiscoveryResult,
  source: DataSource,
): DataPoint {
  const category = result.status === 'up' ? 'host_up' : 'host_down';
  const latency = result.latency_ms ? `${result.latency_ms}ms` : 'N/A';

  return createDataPoint(
    category,
    `Host ${result.status.toUpperCase()}`,
    result.ip,
    source,
    {
      displayValue: `${result.ip} (${result.method}, ${latency})`,
      confidence: result.method === 'icmp' ? 0.95 : 0.85,
      relevance: result.status === 'up' ? 0.9 : 0.2,
      severity: result.status === 'up' ? 'info' : 'low',
      tags: [result.status === 'up' ? 'host_up' : 'host_down', result.method],
      metadata: {
        method: result.method,
        latency_ms: result.latency_ms,
        status: result.status,
      },
    },
  );
}

export function normalizePortScan(
  result: PortScanResult,
  source: DataSource,
): DataPoint[] {
  const dps: DataPoint[] = [];

  for (const port of result.ports) {
    let category = 'port_other';
    const serviceLower = port.service.toLowerCase();

    if (port.state === 'open') {
      if (serviceLower === 'http') category = 'port_http';
      else if (serviceLower === 'https') category = 'port_https';
      else if (serviceLower === 'ssh') category = 'port_ssh';
      else if (serviceLower === 'mysql') category = 'port_mysql';
      else if (serviceLower === 'redis') category = 'port_redis';
      else if (serviceLower === 'smtp' || serviceLower === 'smtp-submission') category = 'port_smtp';
      else if (serviceLower === 'ftp') category = 'port_ftp';
      else if (serviceLower === 'domain') category = 'port_dns';
      else category = 'port_open';
    } else if (port.state === 'filtered') {
      category = 'port_filtered';
    } else {
      category = 'port_closed';
    }

    dps.push(
      createDataPoint(
        category,
        `Port ${port.port}/${port.service}`,
        `${result.ip}:${port.port}`,
        source,
        {
          displayValue: `${result.ip}:${port.port} (${port.state}) — ${port.service}`,
          confidence: port.state === 'open' ? 0.95 : port.state === 'filtered' ? 0.7 : 0.5,
          relevance: port.state === 'open' ? 0.85 : 0.3,
          severity: port.state === 'open' ? 'high' : 'info',
          tags: ['port_scan', port.state, port.service],
          metadata: {
            ip: result.ip,
            port: port.port,
            state: port.state,
            service: port.service,
          },
        },
      ),
    );
  }

  return dps;
}

export function normalizeServiceVersion(
  result: ServiceVersionResult,
  source: DataSource,
): DataPoint[] {
  const dps: DataPoint[] = [];

  for (const service of result.services) {
    let category = 'service_other';
    const productLower = (service.product || '').toLowerCase();

    if (productLower === 'nginx') category = 'service_nginx';
    else if (productLower === 'cloudflare') category = 'service_cloudflare';
    else if (productLower === 'postfix') category = 'service_postfix';
    else if (productLower === 'openssh') category = 'service_ssh';
    else if (productLower === 'mysql') category = 'service_mysql';
    else if (productLower === 'redis') category = 'service_redis';
    else if (productLower === 'prometheus') category = 'service_prometheus';
    else if (productLower === 'grafana') category = 'service_grafana';
    else if (service.service === 'http') category = 'service_http';
    else if (service.service === 'https') category = 'service_https';
    else if (service.service === 'smtp') category = 'service_smtp';
    else if (service.service === 'ftp') category = 'service_ftp';
    else if (service.service === 'domain') category = 'service_dns';

    const versionInfo = service.version ? ` ${service.version}` : '';
    const extraInfo = service.extra ? ` — ${service.extra.substring(0, 100)}` : '';

    dps.push(
      createDataPoint(
        category,
        `${service.product || service.service}`,
        `${result.ip}:${service.port}`,
        source,
        {
          displayValue: `${result.ip}:${service.port} ${service.protocol} — ${service.product}${versionInfo}${extraInfo}`,
          confidence: service.version ? 0.9 : 0.75,
          relevance: 0.8,
          severity: 'info',
          tags: ['service', service.service, service.product || 'unknown'],
          metadata: {
            ip: result.ip,
            port: service.port,
            protocol: service.protocol,
            service: service.service,
            product: service.product,
            version: service.version,
            extra: service.extra,
            cpe: service.cpe,
          },
        },
      ),
    );
  }

  return dps;
}

export function normalizeOsDetection(
  result: OsDetectionResult,
  source: DataSource,
): DataPoint {
  let category = 'os_unknown';
  const osLower = result.operatingSystem.toLowerCase();

  if (osLower.includes('ubuntu')) category = 'os_ubuntu';
  else if (osLower.includes('debian')) category = 'os_debian';
  else if (osLower.includes('linux')) category = 'os_linux';
  else if (osLower.includes('freebsd')) category = 'os_freebsd';

  const isHighAccuracy = result.accuracy >= 85;

  return createDataPoint(
    category,
    'OS Detection',
    result.ip,
    source,
    {
      displayValue: `${result.ip}: ${result.operatingSystem} (${result.accuracy}% accuracy)`,
      confidence: result.accuracy / 100,
      relevance: isHighAccuracy ? 0.9 : 0.6,
      severity: 'info',
      tags: ['os_detection', isHighAccuracy ? 'os_high_accuracy' : 'os_low_accuracy'],
      metadata: {
        ip: result.ip,
        operatingSystem: result.operatingSystem,
        accuracy: result.accuracy,
        cpe: result.cpe,
        fingerprintRaw: result.fingerprintRaw?.substring(0, 100),
      },
    },
  );
}