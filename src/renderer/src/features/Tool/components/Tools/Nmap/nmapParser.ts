// Nmap XML Parser Utilities

export interface ParsedNmapScan {
  args: string;
  duration: string;
  stats: {
    openPorts: number;
    filteredPorts: number;
    closedPorts: number;
  };
  host: {
    ip: string;
    hostname?: string;
    os?: string;
    uptime?: string;
    mac?: string;
    status: 'up' | 'down';
  };
  ports: Array<{
    port: number;
    protocol: string;
    state: string;
    service: string;
    version?: string;
  }>;
}

export const parseNmapXML = (xmlString: string): ParsedNmapScan | null => {
  try {
    // Simple XML parsing using DOM parser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('XML parsing error:', parseError.textContent);
      return null;
    }

    const nmaprun = xmlDoc.querySelector('nmaprun');
    if (!nmaprun) return null;

    // Get command arguments
    const args = nmaprun.getAttribute('args') || '';

    // Get scan duration
    const startTime = nmaprun.getAttribute('start');
    const endTime = nmaprun.querySelector('runstats finished')?.getAttribute('time');
    let duration = '';
    if (startTime && endTime) {
      const durationMs = parseInt(endTime) - parseInt(startTime);
      duration = formatDuration(durationMs.toString());
    }

    // Get host information
    const host = xmlDoc.querySelector('host');
    const status = host?.querySelector('status')?.getAttribute('state') as 'up' | 'down' || 'down';
    const ip = host?.querySelector('address[addrtype="ipv4"]')?.getAttribute('addr') || '';
    const hostname = host?.querySelector('hostname')?.getAttribute('name') || undefined;
    const mac = host?.querySelector('address[addrtype="mac"]')?.getAttribute('addr') || undefined;

    // Get OS information
    const osMatch = host?.querySelector('os osmatch');
    const os = osMatch?.getAttribute('name') || undefined;

    // Get uptime
    const uptimeElem = host?.querySelector('uptime');
    const uptime = uptimeElem?.getAttribute('seconds') || undefined;

    // Get ports
    const ports: ParsedNmapScan['ports'] = [];
    const portElements = xmlDoc.querySelectorAll('port');
    let openPorts = 0;
    let filteredPorts = 0;
    let closedPorts = 0;

    portElements.forEach((portElem) => {
      const port = parseInt(portElem.getAttribute('portid') || '0');
      const protocol = portElem.getAttribute('protocol') || 'tcp';
      const stateElem = portElem.querySelector('state');
      const state = stateElem?.getAttribute('state') || 'closed';
      const serviceElem = portElem.querySelector('service');
      const service = serviceElem?.getAttribute('name') || '';
      const version = serviceElem?.getAttribute('version') || undefined;

      if (state === 'open') openPorts++;
      else if (state === 'filtered') filteredPorts++;
      else if (state === 'closed') closedPorts++;

      ports.push({ port, protocol, state, service, version });
    });

    return {
      args,
      duration,
      stats: { openPorts, filteredPorts, closedPorts },
      host: {
        ip,
        hostname,
        os,
        uptime,
        mac,
        status,
      },
      ports,
    };
  } catch (error) {
    console.error('Error parsing Nmap XML:', error);
    return null;
  }
};

export const formatDuration = (seconds: string | number): string => {
  const totalSeconds = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
  if (isNaN(totalSeconds)) return '0s';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
};

export const formatDateTime = (timestamp: number): string => {
  if (!timestamp || isNaN(timestamp)) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleString();
};

export const getPortStateColor = (state: string): string => {
  switch (state) {
    case 'open':
      return '#34d399';
    case 'filtered':
      return '#fbbf24';
    case 'closed':
      return '#ef4444';
    default:
      return '#64748b';
  }
};

export const getPortRisk = (port: number, service: string): string => {
  const criticalPorts = [21, 22, 23, 25, 80, 443, 3306, 3389, 5432, 27017];
  const highPorts = [139, 445, 1433, 1521, 8080, 8443];
  const mediumPorts = [53, 110, 123, 143, 161, 389, 636, 993, 995, 1723, 5900];

  if (criticalPorts.includes(port)) return 'critical';
  if (highPorts.includes(port)) return 'high';
  if (mediumPorts.includes(port)) return 'medium';

  // Check service-based risk
  const serviceLower = service.toLowerCase();
  if (serviceLower.includes('http') || serviceLower.includes('https')) {
    if (port === 8080 || port === 8443 || port === 8000) return 'high';
    return 'medium';
  }
  if (serviceLower.includes('sql') || serviceLower.includes('mysql') || serviceLower.includes('postgres')) {
    return 'critical';
  }
  if (serviceLower.includes('smb') || serviceLower.includes('netbios')) return 'high';
  if (serviceLower.includes('telnet') || serviceLower.includes('ftp')) return 'critical';
  if (serviceLower.includes('ssh')) return 'medium';
  if (serviceLower.includes('rdp')) return 'critical';

  return 'low';
};