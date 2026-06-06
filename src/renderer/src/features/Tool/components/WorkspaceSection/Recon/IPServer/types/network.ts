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
  latency?: number;
  packetLoss?: number;
}