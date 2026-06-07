// Shodan/Censys Types — INTEL Only (cached third-party data, no direct scan)

export interface ShodanService {
  port: number;
  transport: string;
  service: string;
  banner?: string;
  product?: string;
  version?: string;
  lastSeen?: string;
}

export interface ShodanIntel {
  ip: string;
  lastScan?: string;
  openPorts: number;
  services: ShodanService[];
  hostnames?: string[];
  country?: string;
  org?: string;
  isp?: string;
}