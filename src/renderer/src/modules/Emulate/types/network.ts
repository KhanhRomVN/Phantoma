export interface ConnectionInfo {
  protocol?: string;
  port?: number;
  connectionId?: number;
  reused?: boolean;
  securityState?: string;
  fromDiskCache?: boolean;
  fromServiceWorker?: boolean;
}

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
  connectionInfo?: ConnectionInfo;
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