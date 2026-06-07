// HTTP Security Headers Types

export type HeaderStatus = 'present' | 'missing' | 'misconfigured';

export interface HeaderCheck {
  header: string;
  status: HeaderStatus;
  value?: string;
  description: string;
}

export interface HeadersResult {
  url: string;
  headers: HeaderCheck[];
  totalChecked: number;
  present: number;
  missing: number;
  misconfigured: number;
  grade?: string;
  duration: number;
  startedAt: string;
}