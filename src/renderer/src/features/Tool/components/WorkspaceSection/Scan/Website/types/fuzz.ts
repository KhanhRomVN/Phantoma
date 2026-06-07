// Directory & File Fuzzing Types

export interface FuzzResult {
  path: string;
  statusCode: number;
  contentLength?: number;
  redirectLocation?: string;
}

export interface FuzzConfig {
  url: string;
  wordlist: string;
  extensions?: string[];
}

export interface FuzzScanResult {
  config: FuzzConfig;
  results: FuzzResult[];
  totalTested: number;
  totalFound: number;
  duration: number;
  startedAt: string;
}