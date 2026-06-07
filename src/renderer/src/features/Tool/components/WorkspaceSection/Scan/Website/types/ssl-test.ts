// SSL/TLS Test Types

export interface SSLCertificate {
  issuer: string;
  subject: string;
  expiry: string;
  daysLeft: number;
}

export interface SSLTestResult {
  host: string;
  tlsVersions: string[];
  cipherSuites: string[];
  weakCiphers: string[];
  heartbleed: boolean;
  poodle: boolean;
  robot: boolean;
  certificate: SSLCertificate;
  grade?: string;
  duration: number;
  startedAt: string;
}