// Subdomain Types — INTEL Only (Passive Enumeration)
// Sources: crt.sh, AlienVault OTX, SecurityTrails, DNSDB

export type SubdomainSource = 'crt.sh' | 'alienvault' | 'securitytrails' | 'dnsdb';

export interface Subdomain {
  name: string;
  source: SubdomainSource;
  firstSeen?: string;
  resolvedIP?: string;
}