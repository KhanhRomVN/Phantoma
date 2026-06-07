// Network Types — INTEL Only (Passive: IP-API, MaxMind, BGP, DNS PTR)

export interface GeoLocation {
  country: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface NetworkInfo {
  ipAddress: string;
  reverseDns?: string;
  asn: string;
  cidr: string[];
  geoIp: GeoLocation;
  isp: string;
}