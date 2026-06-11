// ReconData Aggregate Type — IP INTEL Only (Passive)

export type IpStatus = 'idle' | 'queued' | 'scanning' | 'done' | 'error';

export interface IpSession {
  id: string;
  ip: string;
  domain?: string;
  status: IpStatus;
  progress: number;
  stats?: {
    ports: number;
    domains: number;
    threats: number;
    certificates: number;
  };
}

// Port & Service info from Shodan/Censys
export interface PortInfo {
  port: number;
  transport: 'tcp' | 'udp';
  service: string;
  product?: string;
  version?: string;
  banner?: string;
  ssl?: {
    issuer: string;
    subject: string;
    san?: string[];
  };
  lastSeen?: string;
  note?: string;
}

// Reverse IP domain entry
export interface HostedDomain {
  domain: string;
  firstSeen?: string;
  lastSeen?: string;
  type?: string;
}

// GeoIP location
export interface GeoIpData {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  asn?: string;
  usageType?: string;
}

// BGP entry
export interface BgpData {
  asn?: string;
  prefix?: string;
  prefixLength?: number;
  peers?: string[];
  upstreams?: string[];
  origin?: string;
  firstSeen?: string;
  lastSeen?: string;
}

// Threat intel report
export interface ThreatReport {
  reportType: string;
  date: string;
  description: string;
}

// Abuse report
export interface AbuseReport {
  reportType: string;
  date: string;
  description: string;
}

// Spam listing
export interface SpamListing {
  reportType: string;
  date: string;
  description: string;
}

// Noise intel
export interface NoiseIntel {
  tag?: string;
  classification: string;
  lastSeen?: string;
  note?: string;
}

// SSL certificate on IP
export interface IpCertData {
  issuer: string;
  validFrom: string;
  validTo: string;
  domains: string[];
}

// Internet mention
export interface IpMention {
  platform: string;
  url: string;
  snippet: string;
  date?: string;
}

// Indexed page
export interface IndexedPage {
  url: string;
  indexed: boolean;
  lastSeen?: string;
  note?: string;
}

// Malware URL
export interface MalwareUrl {
  url: string;
  status: string;
  date: string;
  tags?: string[];
}

// Reputation
export interface ReputationData {
  reputation: string;
  volume: string;
  firstSeen?: string;
}

// Scan report
export interface ScanReport {
  reportType: string;
  date: string;
  description: string;
}

// Main INTEL Data Type (Passive Only)
export interface ReconData {
  target: string;
  targetIp: string;
  scanTime: string;
  targetDomain?: string;
  ports: PortInfo[];
  hostedDomains: HostedDomain[];
  geoIpData: GeoIpData[];
  bgpData: BgpData[];
  threatReports: ThreatReport[];
  abuseReports: AbuseReport[];
  spamListings: SpamListing[];
  noiseIntel: NoiseIntel[];
  ipCertificates: IpCertData[];
  mentions: IpMention[];
  indexedPages: IndexedPage[];
  malwareUrls: MalwareUrl[];
  reputationData: ReputationData[];
  scanReports: ScanReport[];
}