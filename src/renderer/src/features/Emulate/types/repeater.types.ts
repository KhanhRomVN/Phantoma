// Repeater/Payload types
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
  timestamp: number;
  duration: number;
  payload: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

export interface ParamItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type PayloadType = 'list' | 'numbers' | 'brute';

export interface FuzzerJob {
  id: string;
  name: string;
  description: string;
  method: string;
  urlTemplate: string;
  headersTemplate: string;
  bodyTemplate: string;
  payloadType: PayloadType;
  payloadList: string;
  numberFrom: number;
  numberTo: number;
  numberStep: number;
  bruteChars: string;
  bruteLen: number;
  concurrency: number;
  createdAt: number;
  requestId?: string;
}

export interface FuzzerResult {
  index: number;
  payload: string;
  status: number;
  time: number;
  size: number;
}

export interface RepeaterState {
  method: string;
  url: string;
  params: ParamItem[];
  headers: ParamItem[];
  body: string;
  payloads: PayloadItem[];
  history: HistoryEntry[];
  selectedHistoryId: string | null;
  response: {
    headers?: Record<string, string>;
    body?: string;
    status?: number;
    contentType?: string;
  } | null;
}

export type RepeaterTab = 'params' | 'headers' | 'body' | 'payload' | 'history' | 'result';