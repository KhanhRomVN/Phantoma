// Zone Transfer Types for ZoneTransfer component

export interface DNSRecord {
  name: string;
  type: string;
  ttl: number;
  data: string;
}

export interface ZoneTransferResult {
  nameserver: string;
  success: boolean;
  error?: string;
  records: DNSRecord[];
  recordCount: number;
}