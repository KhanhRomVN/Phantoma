// Service Version Types for Network Scan

export interface ServiceInfo {
  port: number;
  protocol: 'tcp' | 'udp';
  service: string;
  product?: string;
  version?: string;
  extra?: string;
  cpe?: string;
}

export interface ServiceVersionResult {
  ip: string;
  services: ServiceInfo[];
}