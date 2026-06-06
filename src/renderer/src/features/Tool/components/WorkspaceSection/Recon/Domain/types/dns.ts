// DNS Record Types for DNS component

export interface MXRecord {
  priority: number;
  exchange: string;
}

export interface SOARecord {
  mname: string;
  rname: string;
  serial: number;
  refresh?: number;
  retry?: number;
  expire?: number;
  minimum?: number;
}

export interface SRVRecord {
  service: string;
  priority: number;
  weight: number;
  port: number;
  target: string;
}

export interface CAARecord {
  flag: number;
  tag: string;
  value: string;
}

export interface DNSRecords {
  A: string[];
  AAAA: string[];
  MX: MXRecord[];
  NS: string[];
  SOA: SOARecord;
  TXT: string[];
  CNAME?: Record<string, string>;
  SRV?: SRVRecord[];
  PTR?: string[];
  CAA?: CAARecord[];
}