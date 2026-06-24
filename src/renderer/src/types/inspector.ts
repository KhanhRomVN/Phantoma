/**
 * Inspector types for network request/response analysis
 */

export interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  host: string;
  path: string;
  status?: number;
  size?: string | number;
  time?: string | number;
  timestamp: number;
  headers?: Record<string, string>;
  body?: {
    request?: string | object;
    response?: string | object;
    [key: string]: any;
  } | string | object;
  analysis?: NetworkAnalysis;
  requestCookies?: Record<string, string>;
  responseCookies?: Record<string, string>;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  initiator?: string;
  securityIssues?: SecurityIssue[];
  protocol?: string;
  responseBody?: string | object;
  requestBody?: string | object;
  contentType?: string;
  responseTime?: number;
  requestSize?: number;
  responseSize?: number;
}

export interface NetworkAnalysis {
  issues?: SecurityIssue[];
  summary?: string;
  riskScore?: number;
  vulnerabilities?: string[];
  recommendations?: string[];
  headers?: Record<string, string>;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  cookies?: Record<string, string>;
  security?: SecurityIssue[];
  body?: string | object;
  network?: {
    dns?: number;
    connect?: number;
    ttfb?: number;
    download?: number;
    total?: number;
    bytesIn?: number;
    bytesOut?: number;
    packetsIn?: number;
    packetsOut?: number;
  };
  timing?: {
    dns?: number;
    connect?: number;
    ttfb?: number;
    download?: number;
    total?: number;
  };
}

export interface SecurityIssue {
  id?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  remediation?: string;
  title?: string;
  source?: string;
  cve?: string;
  cvss?: number;
  exploited?: boolean;
  evidence?: string;
  recommendation?: string;
}

export interface NetworkResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string | object;
  size: number;
  time: number;
}

export interface NetworkError {
  code: string;
  message: string;
  stack?: string;
}