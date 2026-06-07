// OS Fingerprint Types for OSFingerprint component

export interface OSFingerprintResult {
  target: string;
  operatingSystem: string;
  accuracy: number;
  cpe?: string;
  fingerprintRaw?: string;
  details?: {
    vendor?: string;
    family?: string;
    generation?: string;
    deviceType?: string;
  };
  duration: number;
  startedAt: string;
}