/**
 * Type definitions cho fuzzer/fuzzer trong module Emulate.
 * Bao gồm param, payload, history, run result và fuzzer job.
 */

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
  statuses?: Record<number, number>;
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

export interface RunResult {
  payloadName: string;
  value: string;
  status: number;
  duration: number;
  method: string;
  url: string;
  params: Record<string, string>;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseHeaders: Record<string, string>;
  responseBody: string;
}

export type FuzzerTab = 'params' | 'headers' | 'body' | 'payload' | 'history' | 'result';
