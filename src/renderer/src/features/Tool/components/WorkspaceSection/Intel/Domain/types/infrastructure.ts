// Infrastructure Types for Infrastructure component

export interface Infrastructure {
  // Basic network
  ipAddress?: string;
  ipv6?: string[];
  asn?: string;
  cidrRange?: string[];
  reverseIp?: string[];
  
  // Hosting & Cloud
  hostingProvider?: string;
  cloudProvider?: string;
  geoLocation?: {
    country: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  
  // Security & Proxy
  cdn?: string;
  waf?: string;
  reverseProxy?: string;
  loadBalancer?: string;
  
  // Legacy fields (keep for compatibility)
  ipRanges?: string[];
}