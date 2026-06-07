export interface SecurityFinding {
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category?: 'cve' | 'weak-cipher' | 'weak-ssh-config' | 'anonymous-ftp' | 'smb-exposure' | 'rdp-exposure' | 'vnc-exposure' | 'telnet-exposure' | 'tls-weakness' | 'other';
  cvss?: number;
  cve?: string;
  description: string;
  remediation?: string;
  references?: string[];
}