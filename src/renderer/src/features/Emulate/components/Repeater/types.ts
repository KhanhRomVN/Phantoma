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