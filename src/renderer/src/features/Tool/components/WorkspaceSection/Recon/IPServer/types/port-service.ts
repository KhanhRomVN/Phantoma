export interface PortService {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service: string;
  banner?: string;
  version?: string;
}