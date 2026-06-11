// Zone Transfer Types for Active Scan

export interface ZoneTransferAttempt {
  nameserver: string;
  success: boolean;
  error?: string;
  records?: ZoneRecord[];
  note?: string;
}

export interface ZoneRecord {
  name: string;
  type: string;
  value: string;
  ttl: number;
}