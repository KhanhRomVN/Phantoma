// Nmap XML Parser - converts nmap XML output to structured data for UI display

export interface ParsedNmapScan {
  // Scan info
  scanner: string;
  version: string;
  args: string;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  summary: string;
  
  // Host info
  host: {
    ip: string;
    hostname?: string;
    status: 'up' | 'down';
    os?: string;
    uptime?: number; // seconds
    mac?: string;
  };
  
  // Ports
  ports: Array<{
    port: number;
    protocol: string;
    state: 'open' | 'closed' | 'filtered';
    reason: string;
    service: string;
    product?: string;
    version?: string;
    tunnel?: string; // ssl
  }>;
  
  // Statistics
  stats: {
    totalHosts: number;
    upHosts: number;
    downHosts: number;
    totalPorts: number;
    openPorts: number;
    filteredPorts: number;
    closedPorts: number;
  };
}

export function parseNmapXML(xmlString: string): ParsedNmapScan | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    
    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.error('XML Parse error:', parseError.textContent);
      return null;
    }
    
    const nmaprun = doc.querySelector('nmaprun');
    if (!nmaprun) return null;
    
    // Scan info
    const scanner = nmaprun.getAttribute('scanner') || 'nmap';
    const version = nmaprun.getAttribute('version') || '';
    const args = nmaprun.getAttribute('args') || '';
    const startStr = nmaprun.getAttribute('startstr') || '';
    const startTime = new Date(startStr);
    
    // Host info
    const host = doc.querySelector('host');
    const statusElem = host?.querySelector('status');
    const status = (statusElem?.getAttribute('state') === 'up' ? 'up' : 'down') as 'up' | 'down';
    
    const address = host?.querySelector('address[addrtype="ipv4"]');
    const ip = address?.getAttribute('addr') || '';
    
    const hostnameElem = host?.querySelector('hostname');
    const hostname = hostnameElem?.getAttribute('name') || undefined;
    
    const osElem = host?.querySelector('os');
    const os = osElem?.querySelector('osmatch')?.getAttribute('name') || undefined;
    
    const uptimeElem = host?.querySelector('uptime');
    const uptimeSeconds = uptimeElem ? parseInt(uptimeElem.getAttribute('seconds') || '0') : undefined;
    
    const macElem = host?.querySelector('address[addrtype="mac"]');
    const mac = macElem?.getAttribute('addr') || undefined;
    
    // Ports
    const ports: ParsedNmapScan['ports'] = [];
    const portElements = doc.querySelectorAll('port');
    
    portElements.forEach((portElem) => {
      const portId = parseInt(portElem.getAttribute('portid') || '0');
      const protocol = portElem.getAttribute('protocol') || 'tcp';
      
      const stateElem = portElem.querySelector('state');
      const state = (stateElem?.getAttribute('state') as 'open' | 'closed' | 'filtered') || 'closed';
      const reason = stateElem?.getAttribute('reason') || '';
      
      const serviceElem = portElem.querySelector('service');
      const service = serviceElem?.getAttribute('name') || '';
      const product = serviceElem?.getAttribute('product') || undefined;
      const versionAttr = serviceElem?.getAttribute('version') || undefined;
      const tunnel = serviceElem?.getAttribute('tunnel') || undefined;
      
      ports.push({
        port: portId,
        protocol,
        state,
        reason,
        service,
        product,
        version: versionAttr,
        tunnel,
      });
    });
    
    // Run statistics
    const runstats = doc.querySelector('runstats');
    const finished = runstats?.querySelector('finished');
    const endTimeStr = finished?.getAttribute('timestr') || '';
    const endTime = new Date(endTimeStr);
    const duration = parseFloat(finished?.getAttribute('elapsed') || '0');
    const summary = finished?.getAttribute('summary') || '';
    
    const hostsElem = runstats?.querySelector('hosts');
    const totalHosts = parseInt(hostsElem?.getAttribute('total') || '0');
    const upHosts = parseInt(hostsElem?.getAttribute('up') || '0');
    const downHosts = parseInt(hostsElem?.getAttribute('down') || '0');
    
    // Port statistics
    const extraports = doc.querySelector('extraports');
    const filteredCount = extraports ? parseInt(extraports.getAttribute('count') || '0') : 0;
    const openPorts = ports.filter(p => p.state === 'open').length;
    const closedPorts = ports.filter(p => p.state === 'closed').length;
    const totalPorts = openPorts + closedPorts + filteredCount;
    
    return {
      scanner,
      version,
      args,
      startTime,
      endTime,
      duration,
      summary,
      host: {
        ip,
        hostname,
        status,
        os,
        uptime: uptimeSeconds,
        mac,
      },
      ports,
      stats: {
        totalHosts,
        upHosts,
        downHosts,
        totalPorts,
        openPorts,
        filteredPorts: filteredCount,
        closedPorts,
      },
    };
  } catch (error) {
    console.error('Failed to parse Nmap XML:', error);
    return null;
  }
}

// Format duration for display
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

// Format date for display
export function formatDateTime(date: Date): string {
  return date.toLocaleString();
}

// Get color for port state
export function getPortStateColor(state: string): string {
  switch (state) {
    case 'open': return '#34d399';
    case 'filtered': return '#fbbf24';
    case 'closed': return '#374151';
    default: return '#64748b';
  }
}

// Get risk level for port (simplified)
export function getPortRisk(port: number, service: string): string {
  const highRiskPorts: Record<number, string> = {
    21: 'high', 22: 'medium', 23: 'critical', 25: 'medium',
    445: 'critical', 1433: 'critical', 3306: 'critical', 3389: 'critical',
    5432: 'high', 5900: 'critical', 6379: 'critical', 27017: 'high',
  };
  
  if (highRiskPorts[port]) return highRiskPorts[port];
  
  const svc = service.toLowerCase();
  if (svc.includes('telnet') || svc.includes('vnc')) return 'critical';
  if (svc.includes('sql') || svc.includes('db') || svc.includes('redis')) return 'critical';
  if (svc.includes('ftp') || svc.includes('smb')) return 'high';
  if (svc.includes('ssh')) return 'medium';
  
  return 'low';
}