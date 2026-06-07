// DNS Brute-force Types for DNSBrute component

export interface BruteSubdomain {
  subdomain: string;
  ip: string;
  type: 'A' | 'CNAME';
  target?: string;
}

export interface DNSBruteResult {
  domain: string;
  wordlist: string;
  wordlistSize: number;
  resolved: BruteSubdomain[];
  resolvedCount: number;
  duration: number;
  startedAt: string;
}