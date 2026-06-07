export interface PortSSL {
  tlsVersion?: string;
  cipherSuite?: string;
  certificateIssuer?: string;
  certificateExpiry?: string;
  certificateSubject?: string;
}

export interface PortService {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service: string;
  banner?: string;
  version?: string;
  ssl?: PortSSL;
}