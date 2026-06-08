// OS Detection Types for Network Scan

export interface OsDetectionResult {
  ip: string;
  operatingSystem: string;
  accuracy: number;
  cpe?: string;
  fingerprintRaw?: string;
}