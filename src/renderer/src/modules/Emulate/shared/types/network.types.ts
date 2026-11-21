export interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  protocol: string;
  host: string;
  path: string;
  status: number;
  type: string;
  size: string;
  time: string;
  timestamp: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody: string;
  responseBody: string;
  initiator?: string;
  securityIssues?: any[];
  requestCookies?: Record<string, string>;
  responseCookies?: Record<string, string>;
  securityDetails?: any;
  timing?: any;
  serverIPAddress?: string;
  connection?: string;
  isIntercepted?: boolean;
  analysis?: any;
}

export interface CdpScriptUnpackedData {
  requestId: string;
  url: string;
  scriptId: string;
  staticSource: string | null;
  unpackedSource: string;
  isDifferent: boolean;
  compressionRatio: string;
  timestamp: number;
}