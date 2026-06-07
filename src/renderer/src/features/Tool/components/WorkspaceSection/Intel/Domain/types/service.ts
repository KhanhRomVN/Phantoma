// Service/Port Types for Service component

export interface PortSSL {
  tlsVersion?: string;
  cipherSuite?: string;
  certificateIssuer?: string;
  certificateExpiry?: string;
  certificateSubject?: string;
}

export interface PortHttpResponse {
  statusCode?: number;
  headers?: Record<string, string>;
  bodyPreview?: string;
}

export interface Port {
  port: number;
  protocol?: string;
  service: string;
  state: string;
  banner: string;
  version?: string;
  ssl?: PortSSL;
  httpResponse?: PortHttpResponse;
  risk?: string;
  cve?: string[];
}