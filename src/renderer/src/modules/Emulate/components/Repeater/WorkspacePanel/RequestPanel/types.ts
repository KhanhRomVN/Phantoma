export interface ParamItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface PayloadItem {
  id: string;
  name: string;
  description: string;
  values: string[];
  enabled: boolean;
}

export interface HistoryEntry {
  id: string;
  method: string;
  url: string;
  status: number;
  statuses?: Record<number, number>; // status code → count, for batched payload runs
  timestamp: number;
  endTime?: number;
  duration: number;
  payload: string;
  payloadCount?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

export type TabType = 'params' | 'headers' | 'body' | 'payload' | 'history' | 'result';