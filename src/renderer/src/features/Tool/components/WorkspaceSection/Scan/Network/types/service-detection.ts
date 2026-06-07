// Service & Version Detection Types for ServiceDetection component

export interface ServiceDetectionEntry {
  port: number;
  service: string;
  version?: string;
  cpe?: string;
  extra?: Record<string, string>;
}

export interface ServiceDetectionResult {
  target: string;
  results: ServiceDetectionEntry[];
  totalServices: number;
  identifiedServices: number;
  duration: number;
  startedAt: string;
}