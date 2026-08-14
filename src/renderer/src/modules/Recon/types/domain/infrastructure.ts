// Infrastructure Types — INTEL Only (Passive)

export interface Infrastructure {
  // Basic network (from passive DNS / WHOIS / IP-API)
  ipAddress?: string;
  ipv6?: string[];
  asn?: string;
  cidrRange?: string[];
  reverseIp?: string[];

  // Hosting & Cloud (from WHOIS / IP-API)
  hostingProvider?: string;
  cloudProvider?: string;
  geoLocation?: {
    country: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };

  // IP ranges (from WHOIS / BGP)
  ipRanges?: string[];
}